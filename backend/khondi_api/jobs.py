"""Background jobs run by the Arq worker.

Delivery is at least once: a job interrupted by a worker restart runs again. Every job must
therefore be idempotent, and callers deduplicate by passing a stable job ID.

Every job takes a `traceparent` argument and is wrapped in `traced_job`.
"""

import asyncio
import functools
import inspect
import logging
import time
import traceback
from collections.abc import Callable, Coroutine
from typing import Annotated, Concatenate, ParamSpec, TypeVar

from arq.typing import WorkerCoroutine
from arq.worker import Retry
from opentelemetry import propagate, trace
from opentelemetry.trace import SpanKind, Status, StatusCode
from pydantic import BaseModel, ConfigDict, Field, PlainValidator

from khondi_api.tracecontext import TraceParent, parse_traceparent

P = ParamSpec("P")
R = TypeVar("R")
JobContext = dict[str, object]
Job = Callable[Concatenate[JobContext, P], Coroutine[object, object, R]]

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


class JobFailed(Exception):
    """Replaces a job's own error, whose message can echo job input (R1).

    Arq logs and stores the raised exception, so only the original type name travels on.
    """


def traced_job(job: Job[P, R]) -> WorkerCoroutine:
    """Runs `job` in a consumer span that continues its `traceparent`, with start/end logs.

    Logs and spans carry the job name, ID, try and duration, never arguments or results.
    """
    signature = inspect.signature(job)
    if "traceparent" not in signature.parameters:
        raise TypeError(f"{job.__qualname__} needs a traceparent parameter to be traced")
    name = job.__name__

    @functools.wraps(job)
    async def run(ctx: JobContext, *args: P.args, **kwargs: P.kwargs) -> R:
        traceparent = str(signature.bind(ctx, *args, **kwargs).arguments["traceparent"])
        job_id, job_try = str(ctx["job_id"]), ctx["job_try"]
        if not isinstance(job_try, int):
            raise TypeError("Arq passes job_try as an int")
        fields: dict[str, object] = {"job": name, "job_id": job_id, "job_try": job_try}
        with tracer.start_as_current_span(
            f"job {name}",
            context=propagate.extract({"traceparent": traceparent}),
            kind=SpanKind.CONSUMER,
            attributes={
                "messaging.system": "arq",
                "messaging.message.id": job_id,
                "khondi.job.try": job_try,
            },
            record_exception=False,
            set_status_on_exception=False,
        ) as span:
            logger.info("job started", extra=fields)
            started = time.perf_counter()
            try:
                result = await job(ctx, *args, **kwargs)
            except Retry:
                logger.info("job will retry", extra=fields)
                raise
            except Exception as error:
                error_type = type(error).__qualname__
                span.set_status(Status(StatusCode.ERROR))
                # Frames show where it failed; the message is left out because it can hold input.
                frames = "".join(traceback.format_tb(error.__traceback__))
                span.add_event("exception", {"exception.type": error_type, "khondi.frames": frames})
                logger.error("job failed", extra={**fields, "error_type": error_type})
                raise JobFailed(error_type) from None
            duration_ms = round((time.perf_counter() - started) * 1000, 1)
            logger.info("job finished", extra={**fields, "duration_ms": duration_ms})
            return result

    return run


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


@traced_job
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
