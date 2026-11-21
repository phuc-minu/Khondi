"""Background jobs run by the Arq worker.

Delivery is at least once: a job interrupted by a worker restart runs again. Every job must
therefore be idempotent, and callers deduplicate by passing a stable job ID.
"""

import asyncio

from arq.typing import WorkerCoroutine
from pydantic import BaseModel, ConfigDict, Field

TRACEPARENT_PATTERN = r"^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$"


class EchoRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    message: str = Field(min_length=1, max_length=200)
    traceparent: str = Field(pattern=TRACEPARENT_PATTERN)
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
    request = EchoRequest(message=message, traceparent=traceparent, delay_seconds=delay_seconds)
    await asyncio.sleep(request.delay_seconds)
    return EchoResult.model_validate(
        {
            "message": request.message,
            "trace_id": request.traceparent.split("-")[1],
            "job_try": ctx["job_try"],
        }
    )


JOBS: list[WorkerCoroutine] = [echo]
