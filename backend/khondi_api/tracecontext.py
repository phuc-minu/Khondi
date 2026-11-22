"""W3C Trace Context `traceparent` values (https://www.w3.org/TR/trace-context/), version 00.

Jobs carry the `traceparent` that OpenTelemetry's propagator writes at enqueue time, so the
worker continues the same trace; this module validates it as job input.
"""

import re
from dataclasses import dataclass

_TRACEPARENT = re.compile(r"00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})")
_ZERO_TRACE_ID = "0" * 32
_ZERO_PARENT_ID = "0" * 16


@dataclass(frozen=True)
class TraceParent:
    trace_id: str
    parent_id: str
    flags: str


def parse_traceparent(value: str) -> TraceParent | None:
    match = _TRACEPARENT.fullmatch(value)
    if match is None:
        return None
    trace_id, parent_id, flags = match.groups()
    if trace_id == _ZERO_TRACE_ID or parent_id == _ZERO_PARENT_ID:
        return None
    return TraceParent(trace_id=trace_id, parent_id=parent_id, flags=flags)
