import asyncio
import os
import socket
from collections.abc import Callable, Iterator
from urllib.parse import urlsplit, urlunsplit

import pytest
from arq.connections import create_pool
from fastapi.testclient import TestClient
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind
from pydantic import RedisDsn

from khondi_api import worker
from khondi_api.jobs import JOBS
from khondi_api.main import app
from khondi_api.settings import get_settings
from khondi_api.tracecontext import TraceParent, parse_traceparent

TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
CANARY = "t0007-canary-content"

StartClient = Callable[..., TestClient]
LogLines = Callable[[], list[dict[str, object]]]


def test_parse_traceparent_accepts_a_valid_value() -> None:
    assert parse_traceparent(TRACEPARENT) == TraceParent(
        trace_id="4bf92f3577b34da6a3ce929d0e0e4736", parent_id="00f067aa0ba902b7", flags="01"
    )


@pytest.mark.parametrize(
    "value",
    [
        "",
        "00-00000000000000000000000000000000-00f067aa0ba902b7-01",
        "00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01",
        "00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01",
        "01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        "00-4bf92f3577b34da6a3ce929d0e0e473-00f067aa0ba902b7-01",
        "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01-extra",
    ],
)
def test_parse_traceparent_rejects_invalid_values(value: str) -> None:
    assert parse_traceparent(value) is None


@pytest.fixture
def redis_url() -> Iterator[str]:
    # Database 14: away from the api's data and from test_worker.py's database 15.
    parts = urlsplit(os.environ["REDIS_URL"])
    url = urlunsplit((parts.scheme, parts.netloc, "/14", "", ""))
    asyncio.run(flush(url))
    try:
        yield url
    finally:
        asyncio.run(flush(url))


async def flush(url: str) -> None:
    pool = await create_pool(worker.redis_settings(RedisDsn(url)))
    try:
        await pool.flushdb()
    finally:
        await pool.aclose()


@pytest.fixture
def client_for(monkeypatch: pytest.MonkeyPatch) -> Iterator[StartClient]:
    clients: list[TestClient] = []

    def start(redis_url: str, *, enabled: bool = True) -> TestClient:
        monkeypatch.setenv("REDIS_URL", redis_url)
        monkeypatch.setenv("DIAGNOSTICS_ENABLED", "true" if enabled else "false")
        get_settings.cache_clear()
        client = TestClient(app)
        client.__enter__()
        clients.append(client)
        return client

    yield start
    for client in clients:
        client.__exit__(None, None, None)
    get_settings.cache_clear()


def run_worker_burst(redis_url: str) -> int:
    async def burst() -> int:
        running = worker.create_worker(RedisDsn(redis_url), JOBS, burst=True)
        await running.main()
        await running.close()
        return running.jobs_complete

    return asyncio.run(burst())


@pytest.mark.integration
def test_trace_id_reaches_the_worker(client_for: StartClient, redis_url: str) -> None:
    client = client_for(redis_url)
    queued = client.post(
        "/v1/diagnostics/echo", json={"message": "hello"}, headers={"traceparent": TRACEPARENT}
    )
    assert queued.status_code == 202
    assert queued.json()["created"] is True
    job_id = queued.json()["job_id"]
    assert client.get(f"/v1/diagnostics/echo/{job_id}").json()["status"] == "queued"

    assert run_worker_burst(redis_url) == 1

    done = client.get(f"/v1/diagnostics/echo/{job_id}")
    assert done.status_code == 200
    assert done.json() == {
        "status": "complete",
        "result": {"message": "hello", "trace_id": TRACEPARENT.split("-")[1], "job_try": 1},
    }


@pytest.mark.integration
@pytest.mark.parametrize("header", [None, "not-a-traceparent"])
def test_missing_or_invalid_traceparent_gets_a_new_trace(
    client_for: StartClient, redis_url: str, header: str | None
) -> None:
    client = client_for(redis_url)
    headers = {"traceparent": header} if header else {}
    job_id = client.post("/v1/diagnostics/echo", json={"message": "hi"}, headers=headers).json()[
        "job_id"
    ]
    run_worker_burst(redis_url)
    trace_id = client.get(f"/v1/diagnostics/echo/{job_id}").json()["result"]["trace_id"]
    assert parse_traceparent(f"00-{trace_id}-00f067aa0ba902b7-01") is not None


@pytest.mark.integration
def test_idempotency_key_queues_and_runs_the_job_once(
    client_for: StartClient, redis_url: str
) -> None:
    client = client_for(redis_url)
    headers = {"Idempotency-Key": "order-42"}
    first = client.post("/v1/diagnostics/echo", json={"message": "a"}, headers=headers)
    second = client.post("/v1/diagnostics/echo", json={"message": "a"}, headers=headers)
    assert first.json() == {"job_id": "order-42", "created": True}
    assert second.json() == {"job_id": "order-42", "created": False}
    assert run_worker_burst(redis_url) == 1


@pytest.mark.integration
def test_unknown_job_is_not_found(client_for: StartClient, redis_url: str) -> None:
    client = client_for(redis_url)
    response = client.get("/v1/diagnostics/echo/never-queued")
    assert response.json() == {"status": "not_found", "result": None}


@pytest.mark.integration
@pytest.mark.parametrize(
    ("body", "headers"),
    [
        ({"message": ""}, {}),
        ({"message": "x" * 201}, {}),
        ({"message": "hi", "delay_seconds": 31}, {}),
        ({"message": "hi", "extra": 1}, {}),
        ({"message": "hi"}, {"Idempotency-Key": "has spaces"}),
        ({"message": "hi"}, {"Idempotency-Key": "k" * 65}),
    ],
)
def test_invalid_requests_are_rejected(
    client_for: StartClient, redis_url: str, body: dict[str, object], headers: dict[str, str]
) -> None:
    client = client_for(redis_url)
    assert client.post("/v1/diagnostics/echo", json=body, headers=headers).status_code == 422


def test_routes_are_hidden_when_disabled(
    client_for: StartClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@127.0.0.1:5432/khondi")
    client = client_for("redis://127.0.0.1:6379/0", enabled=False)
    assert client.post("/v1/diagnostics/echo", json={"message": "hi"}).status_code == 404
    assert client.get("/v1/diagnostics/echo/any").status_code == 404


def test_unreachable_queue_returns_503_without_the_url(
    client_for: StartClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@127.0.0.1:5432/khondi")
    client = client_for(f"redis://:SUPERSECRET@127.0.0.1:{port}/0")
    for response in (
        client.post("/v1/diagnostics/echo", json={"message": "hi"}),
        client.get("/v1/diagnostics/echo/any"),
    ):
        assert response.status_code == 503
        assert response.json() == {"detail": "queue unavailable"}
        assert "SUPERSECRET" not in response.text and str(port) not in response.text


@pytest.mark.integration
def test_worker_span_is_a_child_of_the_api_request(
    client_for: StartClient, redis_url: str, spans: InMemorySpanExporter
) -> None:
    client = client_for(redis_url)
    client.post(
        "/v1/diagnostics/echo", json={"message": "hi"}, headers={"traceparent": TRACEPARENT}
    )
    run_worker_burst(redis_url)
    by_kind = {span.kind: span for span in spans.get_finished_spans()}
    server, producer, consumer = (
        by_kind[SpanKind.SERVER],
        by_kind[SpanKind.PRODUCER],
        by_kind[SpanKind.CONSUMER],
    )
    assert {server.name, producer.name, consumer.name} == {
        "POST /v1/diagnostics/echo",
        "enqueue echo",
        "job echo",
    }
    assert {server.context.trace_id, producer.context.trace_id, consumer.context.trace_id} == {
        int(TRACEPARENT.split("-")[1], 16)
    }
    assert server.parent is not None and server.parent.span_id == int(TRACEPARENT[36:52], 16)
    assert producer.parent is not None and producer.parent.span_id == server.context.span_id
    assert consumer.parent is not None and consumer.parent.span_id == producer.context.span_id


@pytest.mark.integration
def test_no_content_or_credentials_reach_spans_or_logs(
    client_for: StartClient,
    redis_url: str,
    spans: InMemorySpanExporter,
    log_lines: LogLines,
) -> None:
    client = client_for(redis_url)
    done = client.post("/v1/diagnostics/echo", json={"message": CANARY}).json()["job_id"]

    async def enqueue_invalid() -> None:
        pool = await create_pool(worker.redis_settings(RedisDsn(redis_url)))
        try:
            await pool.enqueue_job("echo", CANARY * 20, TRACEPARENT, _job_id="too-long")
        finally:
            await pool.aclose()

    asyncio.run(enqueue_invalid())
    run_worker_burst(redis_url)
    assert client.get(f"/v1/diagnostics/echo/{done}").json()["status"] == "complete"
    assert client.get("/v1/diagnostics/echo/too-long").json()["status"] == "failed"

    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    unreachable = client_for(f"redis://:SUPERSECRET@127.0.0.1:{port}/0")
    assert unreachable.post("/v1/diagnostics/echo", json={"message": CANARY}).status_code == 503

    exported = repr(
        [
            (span.name, span.attributes, span.events, span.status)
            for span in spans.get_finished_spans()
        ]
    )
    logged = repr(log_lines())
    assert "job failed" in logged and "job finished" in logged
    for text in (exported, logged):
        assert CANARY not in text
        assert "SUPERSECRET" not in text
        assert "testclient" not in text  # TestClient's client address (R3)
