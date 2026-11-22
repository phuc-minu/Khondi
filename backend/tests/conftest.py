import io
import json
import logging
from collections.abc import Callable, Iterator

import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from khondi_api import telemetry

LogLines = Callable[[], list[dict[str, object]]]


@pytest.fixture(scope="session")
def span_exporter() -> InMemorySpanExporter:
    # The global tracer provider can be set once per process; whichever setup_telemetry call
    # comes first installs it, and this exporter sees the same redacted spans OTLP would.
    telemetry.setup_telemetry("khondi-api", "ci", None)
    provider = trace.get_tracer_provider()
    assert isinstance(provider, TracerProvider)
    exporter = InMemorySpanExporter()
    provider.add_span_processor(SimpleSpanProcessor(telemetry.RedactingSpanExporter(exporter)))
    return exporter


@pytest.fixture
def spans(span_exporter: InMemorySpanExporter) -> InMemorySpanExporter:
    span_exporter.clear()
    return span_exporter


@pytest.fixture
def log_lines(spans: InMemorySpanExporter) -> Iterator[LogLines]:
    stream = io.StringIO()
    handler = telemetry.json_handler(stream, "khondi-api", "ci")
    logging.getLogger().addHandler(handler)
    yield lambda: [json.loads(line) for line in stream.getvalue().splitlines()]
    logging.getLogger().removeHandler(handler)
