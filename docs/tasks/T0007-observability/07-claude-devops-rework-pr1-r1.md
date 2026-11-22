# T0007 · Observability (PR 1) · Claude (DevOps) rework · round 1

| Field | Value |
| --- | --- |
| Task | T0007-observability |
| Step | 07 · Rework, round 1 (PR 1, carried in #69) |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (re-review) |
| Date (UTC) | 2026-11-22 15:05 |
| PR | #69 (branch `claude/T0006-diagnostics`, which carries T0007 PR 1 since #71 merged into it) |
| Commit after rework | `748ab0a` (fix); this file is added in the next commit |
| Responds to | `05-codex-review-pr1-r1.md` (on `claude/T0007-collector`; this branch reaches it once merged up the stack) |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

Numbering: `04-claude-devops-handoff-pr2.md`, `05-codex-review-pr1-r1.md` and `06-codex-review-pr2-r1.md` live on `claude/T0007-collector` (#72). This file is `07` so the folder stays in order once #69 is merged into that branch.

## Response to each finding
| ID | Action | Commit | Notes |
| --- | --- | --- | --- |
| T7P1-R1 | fixed | `748ab0a` | See below. |

**What was wrong.** `RedactFilter` turned exception info into an `exception` field holding the full `traceback.format_exception` text, with only URL credentials masked. That text includes the exception's message and every chained exception's message. Uvicorn logs each unhandled API exception as `uvicorn.error` "Exception in ASGI application" with `exc_info`, so a handler that raised with request content put it on stdout and in the OTLP export. The test below shows the canary reaching the OTLP export before the fix.

**The fix:**
1. **`RedactFilter` (`telemetry.py`)** now reduces exception info to two fields:
   - `error_type`: the exception's class name;
   - `frames`: `traceback.format_tb`, which gives file, line, function and source line, with no message, URL credentials masked.

   It clears `exc_info` and `exc_text`, so neither handler formats the exception itself. The filter is on both the stdout handler and the OTLP handler, so the change covers every logger, uvicorn's included. Codex asked to keep "exception type, route, status, and trace IDs"; trace IDs come from the formatter and the OTLP handler as before.
2. **`otlp_handler(logger_provider)` (`telemetry.py`)**: the OTLP handler and its filter, previously inline in `setup_telemetry`. The test uses the production wiring this way instead of copying it.
3. **`log_request` (`main.py`)**: a request whose handler raises used to get no request line at all. It now writes one with the route template, `status` 500 and `error_type`, then re-raises (Q6). Uvicorn still answers 500 and writes its error line, now redacted.
4. **Spans** were already safe: `RedactingSpanExporter` drops `exception.message`, `exception.stacktrace` and the status description. The new test also checks the server span of the failing request.

**Regression test:** `test_unhandled_api_exception_logs_only_its_type` (`tests/test_telemetry.py`).
- Adds a route raising `ValueError(f"could not parse {CANARY}")` and serves the real app with **real uvicorn** (`uvicorn.Server` in a thread, port 0). TestClient would bypass uvicorn's error logging.
- Sends a `POST` with a `traceparent`.
- Asserts:
  - the `uvicorn.error` line has `error_type` `ValueError` and frames naming the handler;
  - the request line has the route, 500 and `ValueError`, and the caller's trace ID;
  - the server span has error status;
  - the OTLP export holds the uvicorn error record;
  - the canary is in **no stdout line, no exported OTLP log record and no exported span**.
- Removes the route afterwards.

`test_credentials_in_messages_and_exceptions_are_masked` now expects `error_type` and `frames` instead of `exception`. It also caught a gap in the first version of this fix: a traceback frame shows the source line, and that test's source line contains a literal `postgresql://khondi:SUPERSECRET@…`, so `frames` is masked for URL credentials too.

## Commands run and real output
Run in `ghcr.io/astral-sh/uv:0.6.14-python3.12-bookworm-slim` on a copy of the branch, with throwaway `postgres:16.16` and `redis:7.4.12` on the same `localhost`, as in CI.

**Before the fix,** with the new test (only the assertions changed for this run):
```text
$ pytest -k unhandled tests/test_telemetry.py --tb=short
tests/test_telemetry.py:230: in test_unhandled_api_exception_logs_only_its_type
E   KeyError: 'error_type'
1 failed, 6 deselected in 1.18s

# a throwaway copy printing the uvicorn error line and the OTLP export instead of asserting
PRE-FIX: {'logger': 'uvicorn.error', 'exception': '  + Exception Group Traceback (most recent call last):\n  |   File ".../starlette/_utils.py", line 76, in collapse_excgroups … (truncated)
CANARY IN OTLP: True
```
**After the fix:**
```text
$ pytest tests/test_telemetry.py
7 passed in 1.38s

== ruff check
All checks passed!
== ruff format --check
22 files already formatted
== mypy --strict
Success: no issues found in 22 source files
== pytest (CI env, real services)
TOTAL                                               504     19    96%
Required test coverage of 85% reached. Total coverage: 96.23%
68 passed, 28 warnings in 15.31s
== pytest unit tests without env vars (S6)
FAILED tests/test_api.py::test_connection_checks_close_clients - pydantic_cor...
1 failed, 45 passed, 22 deselected, 13 warnings in 4.96s
== repo-tooling
51 passed in 0.05s
```
The no-env failure is the existing one (PR 1 handoff, follow-up 2); CI always sets the variables.

**CI on the new head and the stack check:** not run at the time of writing. `#69`'s CI runs on push, and the T0007 telemetry stack steps (Tempo/Loki, canary) run on `#72` once this commit is merged into `claude/T0007-collector`. Both results go in PR comments, linked from the re-review request.

## Anything else changed
- **The `exception` log field is gone,** replaced by `error_type` and `frames`. Nothing else read it (`git grep '"exception"' backend` finds only the span event name in `jobs.py`). PR 2's docs don't mention the field.
- **Known limit, unchanged:** frames show source lines, which are code, not runtime values. A secret hard-coded in source would show there unless it is in a URL with credentials. That is R2 at the call site, and review catches it.
