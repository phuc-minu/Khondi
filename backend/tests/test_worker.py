import asyncio
import os
from collections.abc import Iterator
from urllib.parse import urlsplit, urlunsplit

import pytest
from arq.connections import ArqRedis, create_pool
from arq.jobs import Job
from arq.worker import Retry
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import StatusCode
from pydantic import RedisDsn

from khondi_api import worker
from khondi_api.jobs import JOBS, EchoResult, JobFailed, echo

TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"


def test_rediss_url_turns_on_tls() -> None:
    assert worker.redis_settings(RedisDsn("rediss://:pw@cache.example:6380/0")).ssl is True
    assert worker.redis_settings(RedisDsn("redis://localhost:6379/0")).ssl is False


def test_missing_redis_url_exits_and_names_it(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.delenv("REDIS_URL", raising=False)
    assert worker.main([]) == 2
    assert "REDIS_URL" in capsys.readouterr().err


def test_invalid_redis_url_exits_without_echoing_it(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("REDIS_URL", "notaurl-SUPERSECRET")
    assert worker.main(["--check"]) == 2
    captured = capsys.readouterr()
    assert "REDIS_URL" in captured.err
    assert "SUPERSECRET" not in captured.err + captured.out


def test_worker_uses_the_job_policy() -> None:
    async def build() -> None:
        built = worker.create_worker(RedisDsn("redis://localhost:6379/0"), JOBS)
        assert built.max_tries == worker.MAX_TRIES == 3
        assert built.job_timeout_s == worker.JOB_TIMEOUT_SECONDS == 300
        assert built.keep_result_s == worker.KEEP_RESULT_SECONDS == 3600
        assert built.health_check_interval == worker.HEALTH_CHECK_INTERVAL_SECONDS == 10
        assert built.retry_jobs is True
        assert built.allow_abort_jobs is False
        assert set(built.functions) == {"echo"}

    asyncio.run(build())


def test_echo_returns_message_trace_id_and_try() -> None:
    result = asyncio.run(echo({"job_id": "unit", "job_try": 2}, "hello", TRACEPARENT))
    assert result == EchoResult(
        message="hello", trace_id="4bf92f3577b34da6a3ce929d0e0e4736", job_try=2
    )


@pytest.mark.parametrize(
    ("message", "traceparent", "delay_seconds"),
    [
        ("hello", TRACEPARENT, 31),
        ("hello", TRACEPARENT, -1),
        ("", TRACEPARENT, 0),
        ("x" * 201, TRACEPARENT, 0),
        ("hello", "not-a-traceparent", 0),
    ],
)
def test_echo_rejects_out_of_range_input(
    message: str, traceparent: str, delay_seconds: int
) -> None:
    # traced_job replaces the ValidationError, whose text holds the input, with its type name.
    with pytest.raises(JobFailed, match="^ValidationError$"):
        asyncio.run(echo({"job_id": "unit", "job_try": 1}, message, traceparent, delay_seconds))


@pytest.fixture
def redis_dsn() -> Iterator[RedisDsn]:
    # Database 15 keeps these tests away from whatever the api uses on the CI Redis service.
    parts = urlsplit(os.environ["REDIS_URL"])
    dsn = RedisDsn(urlunsplit((parts.scheme, parts.netloc, "/15", "", "")))
    asyncio.run(flush(dsn))
    try:
        yield dsn
    finally:
        asyncio.run(flush(dsn))


async def flush(dsn: RedisDsn) -> None:
    pool = await create_pool(worker.redis_settings(dsn))
    try:
        await pool.flushdb()
    finally:
        await pool.aclose()


async def enqueue(pool: ArqRedis, name: str, *args: object, job_id: str) -> Job | None:
    return await pool.enqueue_job(name, *args, _job_id=job_id)


@pytest.mark.integration
def test_worker_runs_echo_and_stores_its_result(redis_dsn: RedisDsn) -> None:
    async def scenario() -> object:
        pool = await create_pool(worker.redis_settings(redis_dsn))
        try:
            job = await enqueue(pool, "echo", "hello", TRACEPARENT, job_id="echo-1")
            assert job is not None
            burst = worker.create_worker(redis_dsn, JOBS, burst=True)
            await burst.main()
            await burst.close()
            return await job.result(timeout=5)
        finally:
            await pool.aclose()

    result = asyncio.run(scenario())
    assert result == EchoResult(
        message="hello", trace_id="4bf92f3577b34da6a3ce929d0e0e4736", job_try=1
    )


@pytest.mark.integration
def test_failed_job_span_has_error_status_and_no_input(
    redis_dsn: RedisDsn, spans: InMemorySpanExporter
) -> None:
    async def scenario() -> object:
        pool = await create_pool(worker.redis_settings(redis_dsn))
        try:
            job = await enqueue(pool, "echo", "secret-input", TRACEPARENT, 31, job_id="bad-1")
            assert job is not None
            burst = worker.create_worker(redis_dsn, JOBS, burst=True)
            await burst.main()
            await burst.close()
            info = await job.result_info()
            assert info is not None and info.success is False
            return info.result
        finally:
            await pool.aclose()

    stored = asyncio.run(scenario())
    assert isinstance(stored, JobFailed) and str(stored) == "ValidationError"
    (span,) = [span for span in spans.get_finished_spans() if span.name == "job echo"]
    assert span.status.status_code is StatusCode.ERROR
    assert span.context.trace_id == int(TRACEPARENT.split("-")[1], 16)
    (event,) = span.events
    assert event.attributes is not None
    assert event.attributes["exception.type"] == "ValidationError"
    assert "secret-input" not in repr(span.attributes) + repr(event.attributes)


@pytest.mark.integration
def test_same_job_id_is_queued_and_run_once(redis_dsn: RedisDsn) -> None:
    async def scenario() -> tuple[bool, bool, int]:
        pool = await create_pool(worker.redis_settings(redis_dsn))
        try:
            first = await enqueue(pool, "echo", "hello", TRACEPARENT, job_id="same")
            second = await enqueue(pool, "echo", "hello", TRACEPARENT, job_id="same")
            burst = worker.create_worker(redis_dsn, JOBS, burst=True)
            await burst.main()
            await burst.close()
            return first is not None, second is not None, burst.jobs_complete
        finally:
            await pool.aclose()

    assert asyncio.run(scenario()) == (True, False, 1)


@pytest.mark.integration
def test_job_asking_to_retry_is_tried_max_tries_times_then_fails(redis_dsn: RedisDsn) -> None:
    calls: list[int] = []

    async def always_retry(ctx: dict[str, object]) -> None:
        calls.append(1)
        raise Retry(defer=0)

    async def scenario() -> bool:
        pool = await create_pool(worker.redis_settings(redis_dsn))
        try:
            job = await enqueue(pool, always_retry.__qualname__, job_id="retry-1")
            assert job is not None
            burst = worker.create_worker(redis_dsn, [always_retry], burst=True)
            await burst.main()
            await burst.close()
            info = await job.result_info()
            assert info is not None
            return info.success
        finally:
            await pool.aclose()

    assert asyncio.run(scenario()) is False
    assert len(calls) == worker.MAX_TRIES


@pytest.mark.integration
def test_check_follows_the_worker_heartbeat(redis_dsn: RedisDsn) -> None:
    async def scenario() -> tuple[int, int, int]:
        before = await asyncio.to_thread(worker.check, redis_dsn)
        running = worker.create_worker(redis_dsn, JOBS)
        task = asyncio.create_task(running.main())
        during = 1
        for _ in range(50):
            during = await asyncio.to_thread(worker.check, redis_dsn)
            if during == 0:
                break
            await asyncio.sleep(0.1)
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        await running.close()
        after = await asyncio.to_thread(worker.check, redis_dsn)
        return before, during, after

    assert asyncio.run(scenario()) == (1, 0, 1)
