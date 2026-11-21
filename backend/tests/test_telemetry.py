import logging
from collections.abc import Callable, Iterator, Sequence

import pytest
from fastapi.testclient import TestClient
from opentelemetry import trace
from opentelemetry.sdk._logs import ReadableLogRecord
from opentelemetry.sdk._logs.export import LogRecordExporter, LogRecordExportResult
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind, StatusCode
from pydantic import AnyHttpUrl

from khondi_api import telemetry
from khondi_api.main import app
from khondi_api.settings import get_settings

LogLines = Callable[[], list[dict[str, object]]]
TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
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
    assert "ValueError: postgresql://***@db:5432/khondi refused" in str(failed["exception"])
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
