"""OpenTelemetry tracing and JSON logs for the api and worker (T0007).

Spans and log lines follow redaction rules R1-R4 (docs/tasks/T0007-observability/01-spec.md):
no content, no credentials, no client addresses. Instrumentation libraries record some of
those by default, so every span is cleaned on its way out of the process, not only at the
collector.
"""

import json
import logging
import re
import sys
import traceback
from collections.abc import Sequence
from datetime import UTC, datetime
from functools import cache
from typing import TextIO

from opentelemetry import trace
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import Event, ReadableSpan, TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SpanExporter, SpanExportResult
from opentelemetry.trace import Status
from opentelemetry.util.types import Attributes, AttributeValue
from pydantic import AnyHttpUrl

_URL_CREDENTIALS = re.compile(r"(?P<scheme>[a-z][a-z0-9+.-]*://)[^/@\s]*@", re.IGNORECASE)
# Client addresses and user agents (R3); headers and query strings (R2); exception text,
# which can echo job or request input (R1). The exception type is kept.
_DROPPED_ATTRIBUTES = frozenset(
    {
        "client.address",
        "client.port",
        "net.peer.ip",
        "net.peer.port",
        "http.client_ip",
        "http.user_agent",
        "user_agent.original",
        "url.query",
        "exception.message",
        "exception.stacktrace",
    }
)
_DROPPED_PREFIXES = ("http.request.header.", "http.response.header.")
_URL_ATTRIBUTES = frozenset({"http.url", "url.full"})
# `color_message` is uvicorn's ANSI copy of the message.
_LOG_RECORD_FIELDS = frozenset(vars(logging.makeLogRecord({}))) | {
    "message",
    "asctime",
    "color_message",
}


def mask_credentials(text: str) -> str:
    return _URL_CREDENTIALS.sub(r"\g<scheme>***@", text)


def _clean(attributes: Attributes) -> dict[str, AttributeValue]:
    cleaned: dict[str, AttributeValue] = {}
    for key, value in (attributes or {}).items():
        if key in _DROPPED_ATTRIBUTES or key.startswith(_DROPPED_PREFIXES):
            continue
        if isinstance(value, str):
            value = mask_credentials(value.split("?", 1)[0] if key in _URL_ATTRIBUTES else value)
        cleaned[key] = value
    return cleaned


def redact_span(span: ReadableSpan) -> ReadableSpan:
    return ReadableSpan(
        name=span.name,
        context=span.context,
        parent=span.parent,
        resource=span.resource,
        attributes=_clean(span.attributes),
        events=[
            Event(event.name, _clean(event.attributes), event.timestamp) for event in span.events
        ],
        links=span.links,
        kind=span.kind,
        # The SDK's status description repeats the exception message (R1).
        status=Status(span.status.status_code),
        start_time=span.start_time,
        end_time=span.end_time,
        instrumentation_scope=span.instrumentation_scope,
    )


class RedactingSpanExporter(SpanExporter):
    def __init__(self, exporter: SpanExporter) -> None:
        self._exporter = exporter

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        return self._exporter.export([redact_span(span) for span in spans])

    def shutdown(self) -> None:
        self._exporter.shutdown()

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        return self._exporter.force_flush(timeout_millis)


class RedactFilter(logging.Filter):
    """Masks URL credentials (R2) and reduces exception info to `error_type` and `frames` (R1).

    Exception messages, including those of chained exceptions, can repeat request or job input,
    so only the type and the traceback's file, line and code are kept. The filter runs before
    both the stdout and the OTLP handler, so neither sees the raw exception.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = mask_credentials(record.getMessage())
        record.args = None
        if record.exc_info:
            error_class, _, frames = record.exc_info
            setattr(record, "error_type", error_class.__name__ if error_class else "unknown")
            setattr(record, "frames", mask_credentials("".join(traceback.format_tb(frames))))
            record.exc_info = None
            record.exc_text = None
        return True


class JsonFormatter(logging.Formatter):
    def __init__(self, service: str, environment: str) -> None:
        super().__init__()
        self._service = service
        self._environment = environment

    def format(self, record: logging.LogRecord) -> str:
        context = trace.get_current_span().get_span_context()
        line: dict[str, object] = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self._service,
            "environment": self._environment,
            "trace_id": format(context.trace_id, "032x") if context.is_valid else "",
            "span_id": format(context.span_id, "016x") if context.is_valid else "",
        }
        line.update(
            (key, value) for key, value in vars(record).items() if key not in _LOG_RECORD_FIELDS
        )
        return json.dumps(line, default=str)


def json_handler(stream: TextIO, service: str, environment: str) -> logging.Handler:
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter(service, environment))
    handler.addFilter(RedactFilter())
    return handler


def otlp_handler(logger_provider: LoggerProvider) -> logging.Handler:
    handler = LoggingHandler(logger_provider=logger_provider)
    handler.addFilter(RedactFilter())
    return handler


@cache
def setup_telemetry(service: str, environment: str, endpoint: AnyHttpUrl | None) -> None:
    """Installs tracing and JSON logs once per process; exports only when `endpoint` is set."""
    resource = Resource.create({"service.name": service, "deployment.environment": environment})
    tracer_provider = TracerProvider(resource=resource)
    handlers: list[logging.Handler] = [json_handler(sys.stdout, service, environment)]
    if endpoint is not None:
        base = str(endpoint).rstrip("/")
        tracer_provider.add_span_processor(
            BatchSpanProcessor(
                RedactingSpanExporter(OTLPSpanExporter(endpoint=f"{base}/v1/traces"))
            )
        )
        logger_provider = LoggerProvider(resource=resource)
        logger_provider.add_log_record_processor(
            BatchLogRecordProcessor(OTLPLogExporter(endpoint=f"{base}/v1/logs"))
        )
        set_logger_provider(logger_provider)
        handlers.append(otlp_handler(logger_provider))
    trace.set_tracer_provider(tracer_provider)

    root = logging.getLogger()
    root.setLevel(logging.INFO)
    for handler in handlers:
        root.addHandler(handler)
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers.clear()
        logging.getLogger(name).propagate = True
    # Uvicorn's access log prints client addresses (R3); the api writes its own request line.
    logging.getLogger("uvicorn.access").disabled = True
    # Arq's INFO lines print job arguments and results (R4).
    logging.getLogger("arq").setLevel(logging.WARNING)
