# T0007 · Observability (PR 1 of 3) · Claude (DevOps) → Codex handoff

| Field | Value |
| --- | --- |
| Task | T0007-observability |
| Step | 3 · Implementation handoff (PR 1: backend tracing and JSON logs; spec items 1–8) |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (independent code review and QA) |
| Date (UTC) | 2026-11-21 22:55 |
| Branch | `claude/T0007-backend-telemetry` (stacked on `claude/T0006-diagnostics` at `1c4ffbc`, PR #69) |
| Commit reviewed | `48d147d` (implementation; this file is added in the next commit) |
| PR | Draft, opened with this file; base is the T0006 PR 2 branch until #69 merges |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

## What changed
- The api and worker now trace every request and job, and write one JSON log line per event with the current `trace_id` and `span_id`.
- A request to `POST /v1/diagnostics/echo` and the job it queues form one trace: server span → `enqueue echo` (producer) → `job echo` (consumer).
- Nothing is exported unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set. PR 2 sets it in Compose. Without it, trace IDs still appear in the logs.
- Spans and logs follow R1–R4 (no content, credentials or client addresses). Tests cover each rule, including a canary test on real Redis.

| File | Why |
| --- | --- |
| `backend/khondi_api/telemetry.py` (new) | <ul><li>`setup_telemetry(service, environment, endpoint)`, cached so it runs once per process. It installs the tracer provider and the stdout JSON handler. With an endpoint, it also adds OTLP/HTTP exporters for traces (`/v1/traces`) and logs (`/v1/logs`).</li><li>`JsonFormatter` and `RedactFilter` (R2: masks `scheme://user:pass@`; turns exception info into a masked `exception` field before *either* handler sees it).</li><li>`RedactingSpanExporter` cleans every span on its way out (see Deviations 1).</li><li>Uvicorn's access logger is disabled, and the `arq` loggers are raised to `WARNING`.</li></ul> |
| `backend/khondi_api/main.py` | <ul><li>`FastAPIInstrumentor` on the app, excluding `/healthz` and `/readyz` and the per-message `receive`/`send` spans. It runs at import because Starlette builds the middleware stack during the startup event itself; spans begin once `setup_telemetry` runs at startup.</li><li>A `log_request` middleware writes one `khondi_api.request` line per non-health request: method, route template, status, duration (R3).</li></ul> |
| `backend/khondi_api/diagnostics.py` | The `traceparent` header parameter is gone; the instrumentation reads it. The route opens an `enqueue echo` producer span and injects *its* context into the job, so the worker's span is its child (spec item 6). |
| `backend/khondi_api/tracecontext.py` | `new_traceparent()` and `TraceParent.__str__` removed, because nothing uses them now (Q5). `parse_traceparent` stays for job input validation. |
| `backend/khondi_api/jobs.py` | `traced_job` decorator (spec item 7). <ul><li>Consumer span `job <name>` continuing the job's `traceparent`, with job ID and try.</li><li>`job started` / `job finished` / `job failed` / `job will retry` log lines, never arguments or results.</li><li>On failure: error status, an `exception` event with the type and the traceback frames (no message), and `JobFailed(<type name>)` raised in place of the original (see Deviations 2).</li><li>`functools.wraps` keeps `__qualname__`, which Arq registers jobs by.</li></ul> `echo` is decorated. |
| `backend/khondi_api/worker.py` | `log_results=False` (R4); `setup_telemetry("khondi-worker", …)` before the worker runs, not for `--check`. |
| `backend/khondi_api/settings.py` | `OTEL_EXPORTER_OTLP_ENDPOINT: AnyHttpUrl \| None = None` in `Settings` and `WorkerSettings`. |
| `backend/pyproject.toml`, `uv.lock` | The four packages from spec item 1 (see Dependencies). |
| `backend/tests/conftest.py` (new) | Session fixture that adds an in-memory exporter, behind the same `RedactingSpanExporter`, to the global provider; `spans` clears it per test; `log_lines` captures JSON lines through the production handler. |
| `backend/tests/test_telemetry.py` (new) | Unit: log line shape and span IDs; credential masking in messages and exceptions; exporter drops client address, user agent, headers, query, exception text and status description; a request continues the caller's trace and its log line has the same trace ID; `/healthz` makes no span or line; exporters are built only with an endpoint, at `/v1/traces` and `/v1/logs`. |
| `backend/tests/test_diagnostics.py` | Integration: server → producer → consumer parent chain in the caller's trace. **Canary test:** a successful job and a failing one with `t0007-canary-content`, plus a 503 with `SUPERSECRET` in `REDIS_URL`; neither string, nor TestClient's client address, appears in any exported span or log line. `new_traceparent` test removed with the function. |
| `backend/tests/test_worker.py` | Integration: a failing `echo` gives an error-status span with `exception.type` only, and Arq stores `JobFailed("ValidationError")`. The two `echo` unit tests now pass `job_id` (Arq always does) and expect `JobFailed` instead of `ValidationError`. |

## Dependencies (Q12)
All Apache-2.0 and from the OpenTelemetry project; pinned exactly in `pyproject.toml` and `uv.lock`.

| Package | Version | Why | Alternatives considered |
| --- | --- | --- | --- |
| `opentelemetry-api`, `opentelemetry-sdk` | 1.45.2 | Tracer and logger providers | None; the spec and P9 name OpenTelemetry |
| `opentelemetry-exporter-otlp-proto-http` | 1.45.2 | OTLP over HTTP to the collector | The gRPC exporter, which pulls in `grpcio` |
| `opentelemetry-instrumentation-fastapi` | 0.66b2 | Server spans and incoming `traceparent` | A hand-written middleware, which would re-implement context extraction |

They bring in, through the lockfile: `opentelemetry-proto`, `-semantic-conventions`, `-instrumentation`, `-instrumentation-asgi`, `-util-http`, `-exporter-otlp-proto-common`, `-exporter-otlp-common`, `-exporter-http-transport` (Apache-2.0), `protobuf` 7.36.2 (BSD-3-Clause), `googleapis-common-protos` (Apache-2.0), `requests` 2.34.2 (Apache-2.0), `urllib3` 2.8.0 (MIT), `charset-normalizer` (MIT), `wrapt` 2.5.2 (BSD-2-Clause), `asgiref` (BSD-3-Clause).

## Acceptance criteria (PR 1 covers the backend half of AC 3, 4, 5, 7 and AC 10)
| # | Criterion (spec v1) | Done? | Where |
| --- | --- | --- | --- |
| 2 | One trace across services | api → worker part done; web in PR 3, Grafana in PR 2 | `test_worker_span_is_a_child_of_the_api_request`; smoke output below |
| 3 | JSON lines with the same `trace_id` | yes for api and worker on stdout; Loki in PR 2 | `test_request_span_continues_the_callers_trace_and_matches_its_log_line`; smoke output |
| 4 | No content, header, query, client IP or credential | yes (pytest); stack check in PR 2 | `test_no_content_or_credentials_reach_spans_or_logs`, `test_exported_spans_drop_…`, `test_credentials_…_are_masked`, `test_failed_job_span_…` |
| 5 | Works with no endpoint, still has trace IDs | yes | `test_exporters_are_created_only_when_an_endpoint_is_set`; every test runs with no endpoint |
| 7 | Health checks make no spans or lines | yes for the api | `test_health_checks_make_no_spans_or_log_lines` |
| 10 | Backend CI and hygiene pass on the head | **not yet** (all pass locally) | CI on the PR head |

AC 1, 6, 8 and 9 belong to PR 2; the web half of AC 2–5 and 7 to PR 3.

## Commands run and real output
Same method as T0006's [03](../T0006-redis-worker/03-claude-devops-handoff.md): the CI backend job's commands, in `ghcr.io/astral-sh/uv:0.6.14-python3.12-bookworm-slim`, against throwaway `postgres:16.16` and `redis:7.4.12` containers, on a copy of this branch.

```text
$ uv sync --frozen && ruff check . && ruff format --check . && mypy --strict .
All checks passed!
22 files already formatted
Success: no issues found in 22 source files

$ uv run pytest            # CI env, real PostgreSQL 16 + Redis 7.4
khondi_api/telemetry.py                              97      2    98%
khondi_api/tracecontext.py                           18      0   100%
khondi_api/worker.py                                 43      6    86%
TOTAL                                               495     19    96%
Required test coverage of 85% reached. Total coverage: 96.16%
67 passed, 25 warnings in 13.75s

$ pytest tests/test_telemetry.py / tests/test_diagnostics.py / tests/test_worker.py   # each alone, to rule out order dependence
6 passed  /  23 passed  /  15 passed

$ ruff check scripts && ruff format --check scripts && mypy --strict scripts && pytest -q scripts/tests
51 passed in 0.05s

$ python scripts/check_diff_hygiene.py origin/claude/T0006-diagnostics
Diff hygiene: no violations.
```

**Smoke run with real processes** (`uvicorn khondi_api.main:app` and `python -m khondi_api.worker`, `DIAGNOSTICS_ENABLED=true`, no endpoint): a `POST` with `traceparent 00-0af7651916cd43dd8448eb211c80319c-…` and the message `t0007-canary-content`, then `/healthz`, then polling the `GET`.

```text
result {'status': 'complete', 'result': {'message': 't0007-canary-content', 'trace_id': '0af7651916cd43dd8448eb211c80319c', 'job_try': 1}}
--- api stdout
{"…", "logger": "khondi_api.request", "message": "request", "service": "khondi-api", "environment": "local", "trace_id": "0af7651916cd43dd8448eb211c80319c", "span_id": "5813ca66617e1940", "method": "POST", "route": "/v1/diagnostics/echo", "status": 202, "duration_ms": 2.5}
{"…", "logger": "khondi_api.request", "message": "request", …, "method": "GET", "route": "/v1/diagnostics/echo/{job_id}", "status": 200, …}
--- worker stdout
{"…", "logger": "khondi_api.jobs", "message": "job started", "service": "khondi-worker", "environment": "local", "trace_id": "0af7651916cd43dd8448eb211c80319c", "span_id": "3ccae509a407e6db", "job": "echo", "job_id": "2ae6815f-…", "job_try": 1}
{"…", "logger": "khondi_api.jobs", "message": "job finished", …, "trace_id": "0af7651916cd43dd8448eb211c80319c", …, "duration_ms": 0.1}
--- canary hits: /tmp/api.log:0 /tmp/worker.log:0
```
No line for `/healthz`, no uvicorn access line, and none of Arq's `→ echo('t0007-canary-content', …)` lines. (Timestamps shortened to `…` above.)

**Fixes during the work:**
- mypy flagged `traced_job`'s return type: Arq's `WorkerCoroutine` protocol needs a parameter *named* `ctx`, which `Concatenate` makes positional-only. The decorator now returns `WorkerCoroutine`.
- The first smoke run showed uvicorn's `color_message` (an ANSI copy of the message) in the JSON; the formatter now leaves it out.
- The no-env unit run still shows only the existing `test_api.py::test_connection_checks_close_clients` failure (T0006 [03](../T0006-redis-worker/03-claude-devops-handoff.md), follow-up 1).

## Quality rules self-check
- **Q1, Q3:** spec items 1–8 only. Existing tests changed only where behavior changed (`echo` now raises `JobFailed`; `new_traceparent` removed).
- **Q2: over the guideline.** +657 / −36 lines excluding `uv.lock` (code ~360, tests ~330), against the spec's estimate of ~355. Two things the estimate missed, both needed for R1–R3: the export-time span cleaning and the job-failure sanitizing (Deviations 1 and 2), each with tests. Splitting them out would ship a PR that leaks client addresses and job input, so I kept them together.
- **Q4, Q5:** nothing unfinished; removed the two functions that became unused.
- **Q6:** `traced_job` catches `Exception` only to record it and re-raises `JobFailed(type name) from None`; `arq.Retry` passes through untouched, and `CancelledError` (restart) is not caught. `RuntimeError` if tracing was not set up, since that would be a programming error.
- **Q7:** job input is still validated by `EchoRequest`; the endpoint is a typed `AnyHttpUrl`.
- **Q8:** `mypy --strict` clean; no new `Any`, `cast` or ignores. The two existing `type: ignore[call-arg]` lines are unchanged in meaning (one moved with its statement in `worker.main`).
- **Q9:** each behavior has a test that fails without it.
- **Q10:** output above is real; CI not run yet.
- **Q13:** comments explain why: instrumenting at import, why exception text is dropped, why Arq is quieted.
- **Q14:** this PR *is* the shared JSON logger. No `print`.
- **Q15:** `SUPERSECRET` and `t0007-canary-content` are canaries that the tests prove never appear.
- **Q16:** no CI, lint or type-check setting changed.

## Deviations from the spec
1. **Span cleaning happens at export, in the app** (`RedactingSpanExporter`), not only through the collector backstop.
   - Why: the FastAPI instrumentation (old HTTP semantic conventions, the default in 0.66b2) records `net.peer.ip`, `net.peer.port`, `http.user_agent` and `http.url` *with the query string*. That breaks R2 and R3, and attributes cannot be removed from a live span. Cleaning a copy at export is the only in-process fix.
   - It also drops `exception.message`, `exception.stacktrace` and the status description, because exception text can repeat input (R1). The exception type stays.
   - `http.user_agent` is dropped as well as the client address; R3 names only client IPs, but a user agent is the other identifying header the instrumentation records.
2. **Failed jobs raise `JobFailed(<type name>)` instead of their own exception.** Arq logs a failure with `logger.exception` at `ERROR` and pickles the exception as the job result. A Pydantic `ValidationError` message includes the input value, so raising it unchanged would put job content in the worker log (R1, R4). The traceback *frames* (file, line, code) are kept on the span event, so the failure can still be located.
3. **Uvicorn's access log is disabled in `setup_telemetry`,** not with `--no-access-log` on the Dockerfile command (spec item 5). The effect is the same in the container, it also covers native `uv run uvicorn`, and it is testable.

## Risks and known limits
- **The SDK's `LoggingHandler` is deprecated** in 1.45.2 ("use the handler from `opentelemetry-instrumentation-logging`"). It works, and only `telemetry.py` uses it (spec Risks 4). Moving to that handler is one more package, not in the approved list, so it is a follow-up rather than part of this PR.
- **Uvicorn's first two lines** ("Started server process", "Waiting for application startup") are printed before the app's startup event runs, so they stay plain text. Everything from "Application startup complete" on is JSON.
- **Unhandled api exceptions** are logged by uvicorn with their traceback, masked for URL credentials only. A bug whose message echoes request input would show it in that line. R1 is enforced at call sites by review; this is the one path the code cannot fully guard.
- **`traced_job` reads `ctx["job_id"]` and `ctx["job_try"]`,** which Arq always sets. A direct call without them (as the old unit tests did) raises `KeyError`.

## Follow-ups (not in this PR)
1. Switch to `opentelemetry-instrumentation-logging`'s handler when the deprecated SDK handler is removed (needs a dependency approval).
2. The existing no-env test failure from T0006 [03](../T0006-redis-worker/03-claude-devops-handoff.md), follow-up 1.
3. FastAPI's `on_event` is deprecated in favor of lifespan handlers. T0003 chose `on_event`, and this PR follows it (Q11); moving all five handlers is a separate change.
