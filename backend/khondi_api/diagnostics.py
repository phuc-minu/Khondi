"""Diagnostics routes: queue an `echo` job and read its result (T0006).

They prove the api → worker path and trace carry-through. They are off unless
`DIAGNOSTICS_ENABLED=true`, because they have no authentication.
"""

import uuid
from typing import Annotated, Literal

from arq.connections import ArqRedis
from arq.jobs import Job, JobStatus
from fastapi import APIRouter, Depends, Header, HTTPException, Path, Request, status
from pydantic import BaseModel, ConfigDict, Field
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError

from khondi_api.jobs import EchoResult
from khondi_api.settings import get_settings
from khondi_api.tracecontext import new_traceparent, parse_traceparent

JOB_ID_PATTERN = r"^[A-Za-z0-9_-]{1,64}$"
QUEUE_ERRORS = (RedisConnectionError, RedisTimeoutError, OSError)


def require_enabled() -> None:
    if not get_settings().DIAGNOSTICS_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


def queue(request: Request) -> ArqRedis:
    pool = request.app.state.queue
    if not isinstance(pool, ArqRedis):
        raise RuntimeError("the job queue client was not opened at startup")
    return pool


router = APIRouter(prefix="/v1/diagnostics", dependencies=[Depends(require_enabled)])


class EchoBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=200)
    delay_seconds: int = Field(default=0, ge=0, le=30)


class Enqueued(BaseModel):
    job_id: str
    created: bool


class EchoStatus(BaseModel):
    status: Literal["queued", "in_progress", "complete", "failed", "not_found"]
    result: EchoResult | None = None


def queue_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="queue unavailable"
    )


@router.post("/echo", status_code=status.HTTP_202_ACCEPTED)
async def enqueue_echo(
    body: EchoBody,
    pool: Annotated[ArqRedis, Depends(queue)],
    traceparent: Annotated[str | None, Header()] = None,
    idempotency_key: Annotated[str | None, Header(pattern=JOB_ID_PATTERN)] = None,
) -> Enqueued:
    parent = (parse_traceparent(traceparent) if traceparent else None) or new_traceparent()
    job_id = idempotency_key or str(uuid.uuid4())
    try:
        job = await pool.enqueue_job(
            "echo", body.message, str(parent), body.delay_seconds, _job_id=job_id
        )
    except QUEUE_ERRORS:
        raise queue_unavailable() from None
    return Enqueued(job_id=job_id, created=job is not None)


@router.get("/echo/{job_id}")
async def echo_status(
    job_id: Annotated[str, Path(pattern=JOB_ID_PATTERN)],
    pool: Annotated[ArqRedis, Depends(queue)],
) -> EchoStatus:
    job = Job(job_id, pool)
    try:
        state = await job.status()
        info = await job.result_info() if state is JobStatus.complete else None
    except QUEUE_ERRORS:
        raise queue_unavailable() from None
    if state is JobStatus.complete:
        # The result can expire between the two reads; a non-echo job is not ours to show.
        if info is None or info.function != "echo":
            return EchoStatus(status="not_found")
        if not info.success:
            return EchoStatus(status="failed")
        return EchoStatus(status="complete", result=EchoResult.model_validate(info.result))
    if state is JobStatus.not_found:
        return EchoStatus(status="not_found")
    return EchoStatus(status="in_progress" if state is JobStatus.in_progress else "queued")
