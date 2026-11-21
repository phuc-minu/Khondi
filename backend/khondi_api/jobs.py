"""Background jobs run by the Arq worker.

Delivery is at least once: a job interrupted by a worker restart runs again. Every job must
therefore be idempotent, and callers deduplicate by passing a stable job ID.
"""

import asyncio
from typing import Annotated

from arq.typing import WorkerCoroutine
from pydantic import BaseModel, ConfigDict, Field, PlainValidator

from khondi_api.tracecontext import TraceParent, parse_traceparent


def _traceparent(value: str) -> TraceParent:
    parsed = parse_traceparent(value)
    if parsed is None:
        raise ValueError("traceparent must be a W3C version 00 traceparent")
    return parsed


class EchoRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    message: str = Field(min_length=1, max_length=200)
    traceparent: Annotated[TraceParent, PlainValidator(_traceparent)]
    delay_seconds: int = Field(default=0, ge=0, le=30)


class EchoResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    message: str
    trace_id: str
    job_try: int


async def echo(
    ctx: dict[str, object], message: str, traceparent: str, delay_seconds: int = 0
) -> EchoResult:
    """Diagnostic job: returns its message and the trace it was queued under.

    `delay_seconds` lets a restart be tested while the job is running.
    """
    request = EchoRequest.model_validate(
        {"message": message, "traceparent": traceparent, "delay_seconds": delay_seconds}
    )
    await asyncio.sleep(request.delay_seconds)
    return EchoResult.model_validate(
        {
            "message": request.message,
            "trace_id": request.traceparent.trace_id,
            "job_try": ctx["job_try"],
        }
    )


JOBS: list[WorkerCoroutine] = [echo]
