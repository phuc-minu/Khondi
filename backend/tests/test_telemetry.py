import logging
import threading
from collections.abc import Callable, Iterator, Sequence

import httpx
import pytest
import uvicorn
from fastapi.testclient import TestClient
from opentelemetry import trace
from opentelemetry.sdk._logs import LoggerProvider, ReadableLogRecord
from opentelemetry.sdk._logs.export import (
    LogRecordExporter,
    LogRecordExportResult,
    SimpleLogRecordProcessor,
)
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind, StatusCode
from pydantic import AnyHttpUrl

from khondi_api import telemetry
from khondi_api.main import app
from khondi_api.settings import get_settings

LogLines = Callable[[], list[dict[str, object]]]
TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
CANARY = "t0007-canary-content"
logger = logging.getLogger("khondi_api.test")


def test_log_line_is_json_with_the_current_span(log_lines: LogLines) -> None:
    with trace.get_tracer(__name__).start_as_current_span("unit") as span:
        logger.info("inside", extra={"job_id": "j-1"})
    logger.info("outside")
    inside, outside = log_lines()
    context = span.get_span_context()
    assert inside == {
        "timestamp": inside["timestamp"],
        "level": "INFO",
        "logger": "khondi_api.test",
        "message": "inside",
        "service": "khondi-api",
        "environment": "ci",
        "trace_id": format(context.trace_id, "032x"),
        "span_id": format(context.span_id, "016x"),
        "job_id": "j-1",
    }
    assert str(inside["timestamp"]).endswith("+00:00")
    assert (outside["trace_id"], outside["span_id"]) == ("", "")


def test_credentials_in_messages_and_exceptions_are_masked(log_lines: LogLines) -> None:
    logger.info("connecting to %s", "redis://:SUPERSECRET@cache:6379/0")
    try:
        raise ValueError("postgresql://khondi:SUPERSECRET@db:5432/khondi refused")
    except ValueError:
        logger.exception("query failed")
    connecting, failed = log_lines()
    assert connecting["message"] == "connecting to redis://***@cache:6379/0"
    assert failed["error_type"] == "ValueError"
    assert "test_credentials_in_messages_and_exceptions_are_masked" in str(failed["frames"])
    assert "SUPERSECRET" not in repr(log_lines())


def test_exported_spans_drop_client_headers_query_and_exception_text(
    spans: InMemorySpanExporter,
) -> None:
    with trace.get_tracer(__name__).start_as_current_span(
        "request",
        attributes={
            "net.peer.ip": "203.0.113.9",
            "client.address": "203.0.113.9",
            "http.user_agent": "agent/1",
            "http.request.header.authorization": ("Bearer SUPERSECRET",),
            "http.url": "http://api:8000/v1/x?token=SUPERSECRET",
            "url.full": "redis://:SUPERSECRET@cache:6379/0",
            "http.route": "/v1/x",
        },
    ):
        trace.get_current_span().record_exception(RuntimeError("input was SUPERSECRET"))
        trace.get_current_span().set_status(StatusCode.ERROR, "RuntimeError: SUPERSECRET")
    (span,) = spans.get_finished_spans()
    assert dict(span.attributes or {}) == {
        "http.url": "http://api:8000/v1/x",
        "url.full": "redis://***@cache:6379/0",
        "http.route": "/v1/x",
    }
    (event,) = span.events
    assert event.attributes is not None
    assert event.attributes["exception.type"] == "RuntimeError"
    assert "exception.message" not in event.attributes
    assert "exception.stacktrace" not in event.attributes
    assert span.status.status_code is StatusCode.ERROR
    assert span.status.description is None
    assert "SUPERSECRET" not in repr((span.attributes, span.events, span.status))


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setenv("ENVIRONMENT", "ci")
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@127.0.0.1:5432/khondi")
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    monkeypatch.setenv("DIAGNOSTICS_ENABLED", "false")
    get_settings.cache_clear()
    with TestClient(app) as started:
        yield started
    get_settings.cache_clear()


def test_request_span_continues_the_callers_trace_and_matches_its_log_line(
    client: TestClient, spans: InMemorySpanExporter, log_lines: LogLines
) -> None:
    response = client.get("/v1/diagnostics/echo/abc", headers={"traceparent": TRACEPARENT})
    assert response.status_code == 404
    (span,) = spans.get_finished_spans()
    assert span.kind is SpanKind.SERVER
    assert span.context.trace_id == int(TRACEPARENT.split("-")[1], 16)
    (line,) = [line for line in log_lines() if line["logger"] == "khondi_api.request"]
    assert line["trace_id"] == TRACEPARENT.split("-")[1]
    assert line["route"] == "/v1/diagnostics/echo/{job_id}"
    assert (line["method"], line["status"]) == ("GET", 404)
    assert "testclient" not in repr(span.attributes) + repr(line)


def test_health_checks_make_no_spans_or_log_lines(
    client: TestClient, spans: InMemorySpanExporter, log_lines: LogLines
) -> None:
    assert client.get("/healthz").status_code == 200
    assert spans.get_finished_spans() == ()
    assert [line for line in log_lines() if line["logger"] == "khondi_api.request"] == []


class NullLogExporter(LogRecordExporter):
    def export(self, batch: Sequence[ReadableLogRecord]) -> LogRecordExportResult:
        return LogRecordExportResult.SUCCESS

    def shutdown(self) -> None:
        return None

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        return True


def test_exporters_are_created_only_when_an_endpoint_is_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    endpoints: list[str] = []

    def span_exporter(endpoint: str) -> InMemorySpanExporter:
        endpoints.append(endpoint)
        return InMemorySpanExporter()

    def log_exporter(endpoint: str) -> NullLogExporter:
        endpoints.append(endpoint)
        return NullLogExporter()

    monkeypatch.setattr(telemetry, "OTLPSpanExporter", span_exporter)
    monkeypatch.setattr(telemetry, "OTLPLogExporter", log_exporter)
    monkeypatch.setattr(telemetry, "set_logger_provider", lambda provider: None)
    root = logging.getLogger()
    handlers = list(root.handlers)
    try:
        telemetry.setup_telemetry.__wrapped__("khondi-worker", "ci", None)
        assert endpoints == []
        telemetry.setup_telemetry.__wrapped__(
            "khondi-worker", "ci", AnyHttpUrl("http://otel-collector:4318")
        )
        assert endpoints == [
            "http://otel-collector:4318/v1/traces",
            "http://otel-collector:4318/v1/logs",
        ]
    finally:
        root.handlers = handlers


class CapturedLogs(NullLogExporter):
    def __init__(self) -> None:
        self.records: list[ReadableLogRecord] = []

    def export(self, batch: Sequence[ReadableLogRecord]) -> LogRecordExportResult:
        self.records.extend(batch)
        return LogRecordExportResult.SUCCESS


@pytest.fixture
def otlp_logs() -> Iterator[CapturedLogs]:
    """The production OTLP log handler, exporting to memory instead of a collector."""
    captured = CapturedLogs()
    provider = LoggerProvider()
    provider.add_log_record_processor(SimpleLogRecordProcessor(captured))
    handler = telemetry.otlp_handler(provider)
    logging.getLogger().addHandler(handler)
    yield captured
    logging.getLogger().removeHandler(handler)


async def fail_with_content() -> None:
    raise ValueError(f"could not parse {CANARY}")


def test_unhandled_api_exception_logs_only_its_type(
    client: TestClient,
    spans: InMemorySpanExporter,
    log_lines: LogLines,
    otlp_logs: CapturedLogs,
) -> None:
    """A route that raises with request content, served by real uvicorn (R1, R4)."""
    app.add_api_route("/v1/t0007-raises", fail_with_content, methods=["POST"])
    server = uvicorn.Server(uvicorn.Config(app, port=0, log_config=None, lifespan="off"))
    thread = threading.Thread(target=server.run)
    thread.start()
    try:
        for _ in range(200):
            if server.started:
                break
            thread.join(0.05)
        assert server.started, "uvicorn did not start within 10 s"
        port = server.servers[0].sockets[0].getsockname()[1]
        response = httpx.post(
            f"http://127.0.0.1:{port}/v1/t0007-raises", headers={"traceparent": TRACEPARENT}
        )
    finally:
        server.should_exit = True
        thread.join()
        app.router.routes.pop()
    assert response.status_code == 500

    lines = log_lines()
    (error,) = [line for line in lines if line["level"] == "ERROR"]
    assert error["logger"] == "uvicorn.error"
    assert str(error["message"]).strip() == "Exception in ASGI application"
    assert error["error_type"] == "ValueError"
    assert "fail_with_content" in str(error["frames"])
    (request,) = [line for line in lines if line["logger"] == "khondi_api.request"]
    assert (request["route"], request["status"], request["error_type"]) == (
        "/v1/t0007-raises",
        500,
        "ValueError",
    )
    assert request["trace_id"] == TRACEPARENT.split("-")[1]
    (span,) = spans.get_finished_spans()
    assert span.status.status_code is StatusCode.ERROR

    exported = [record.to_json() for record in otlp_logs.records]
    assert any("Exception in ASGI application" in record for record in exported)
    assert CANARY not in repr(lines)
    assert CANARY not in "".join(exported)
    assert CANARY not in repr((span.attributes, span.events, span.status))
