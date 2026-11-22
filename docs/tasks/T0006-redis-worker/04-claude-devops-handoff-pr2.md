# T0006 · Redis and worker (PR 2 of 2) · Claude (DevOps) → Codex handoff

| Field | Value |
| --- | --- |
| Task | T0006-redis-worker |
| Step | 4 · Implementation handoff (PR 2: queueing from the api, with trace context; spec items 8–12) |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (independent code review and QA) |
| Date (UTC) | 2026-11-21 16:05 |
| Branch | `claude/T0006-diagnostics` (stacked on `claude/T0006-redis-worker` at `2715e6d`, PR #68) |
| Commit reviewed | `715fa06` (implementation; this file is added in the next commit) |
| PR | Draft, opened with this file; base is the PR 1 branch until #68 merges |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

## What changed
- The api can now queue a job and read its result through `POST`/`GET /v1/diagnostics/echo`. Both routes return 404 unless `DIAGNOSTICS_ENABLED=true`.
- The caller's W3C `traceparent` travels with the job, and the worker's result reports the same trace ID. A missing or invalid header gets a new trace.
- An `Idempotency-Key` header becomes the Arq job ID, so a repeat request queues nothing.
- If Redis is down, the routes return 503 with fixed text and never the Redis URL.

| File | Why |
| --- | --- |
| `backend/khondi_api/tracecontext.py` (new) | `TraceParent` (frozen dataclass, `str()` gives the header form). `parse_traceparent()` accepts only version `00`, lowercase hex, non-zero IDs and exact lengths, and returns `None` otherwise. `new_traceparent()` uses `secrets`. |
| `backend/khondi_api/jobs.py` | `EchoRequest.traceparent` is now a `TraceParent`, parsed with `parse_traceparent` through a `PlainValidator`. This replaces PR 1's regex-and-split, as spec item 8 says (Q7). |
| `backend/khondi_api/diagnostics.py` (new) | Router under `/v1/diagnostics`. <ul><li>Router-level dependency `require_enabled` returns 404 before anything touches Redis.</li><li>`POST /echo`: body `EchoBody` (`extra="forbid"`, message 1–200, delay 0–30); headers `traceparent` and `Idempotency-Key` (`^[A-Za-z0-9_-]{1,64}$`); returns 202 `{job_id, created}`.</li><li>`GET /echo/{job_id}` (same pattern) maps Arq's `JobStatus` to `queued`/`in_progress`/`complete`/`failed`/`not_found`. A result that expired between the two reads, or that belongs to another function, counts as `not_found`.</li><li>Redis `ConnectionError`/`TimeoutError`/`OSError` become 503 `queue unavailable`, raised `from None`.</li></ul> |
| `backend/khondi_api/main.py` | Includes the router. On startup, if enabled, it creates one `ArqRedis` client with `from_url`, which connects on first use, so the api still starts and `/readyz` reports a Redis outage. It closes the client at shutdown. Both use the existing `on_event` style (Q11). |
| `backend/khondi_api/settings.py` | `DIAGNOSTICS_ENABLED: bool = False`. |
| `backend/tests/test_diagnostics.py` (new) | Unit: valid `traceparent`, 7 invalid forms (empty, zero trace, zero parent, uppercase, version `01`, short trace ID, extra field), new value parses back. Routes: trace ID reaches the worker; missing or invalid header gets a new trace; `Idempotency-Key` gives `created` true then false and one job run; unknown ID returns `not_found`; 6 invalid requests return 422; disabled returns 404; unreachable Redis returns 503 without the password or port. |
| `compose.yaml`, `.env.example` | The api gets `DIAGNOSTICS_ENABLED: ${DIAGNOSTICS_ENABLED:-false}`. `.env.example` sets `true`, with a comment that the routes are unauthenticated. |
| `.github/workflows/quality.yml` | `stack` job only (Q16). The new step `curl`s the `POST` with a fixed `traceparent`, polls the `GET` until `complete` (at most 30 s), and checks the trace ID with `jq -e`. |
| `docs/infra/local-setup.md`, `azure-parity.md` | Two `curl` examples, the `Idempotency-Key` tip, and a warning about authentication. Parity row for `DIAGNOSTICS_ENABLED`: Azure dev is `false` unless Phil turns it on (P12). |

## Acceptance criteria (PR 2 covers AC 7 via HTTP, 8, 9 and 10)
| # | Criterion (spec v1) | Done? | Where |
| --- | --- | --- | --- |
| 7 | Same `Idempotency-Key` twice → runs once | yes | `test_idempotency_key_queues_and_runs_the_job_once` |
| 8 | `POST` with `traceparent` → result `trace_id` equals its trace ID | yes (locally); CI pending | `test_trace_id_reaches_the_worker`; CI step; output below |
| 9 | Unset → 404; Redis down → 503 without the URL | yes | `test_routes_are_hidden_when_disabled`, `test_unreachable_queue_returns_503_without_the_url`; manual check below |
| 10 | Backend CI + `stack` pass on head; hygiene passes | **not yet** (all pass locally) | CI on the PR head |

## Commands run and real output
The environment and method are the same as in [03](03-claude-devops-handoff.md), with one difference: this time **every** `stack` step ran, including the `jq` steps. I used the official `jq` 1.7.1 Windows binary, and its SHA-256 `7451fbbf…b6d6ab` matched the release's `sha256sum.txt`.

```text
$ uv sync --frozen && ruff check . && ruff format --check . && mypy --strict .
All checks passed!
19 files already formatted
Success: no issues found in 19 source files

$ uv run pytest            # CI env, real PostgreSQL 16 + Redis 7.4
khondi_api/tracecontext.py                           23      0   100%
TOTAL                                               323     12    96%
Required test coverage of 85% reached. Total coverage: 96.28%
59 passed, 19 warnings in 14.49s

$ ruff check scripts && ruff format --check scripts && mypy --strict scripts && pytest -q scripts/tests
51 passed in 0.06s

$ python scripts/check_diff_hygiene.py origin/claude/T0006-redis-worker
Diff hygiene: no violations.

$ bash t0006b-stack.sh      # every stack job step from quality.yml
rc=0 total=121s
::: Ports bind to 127.0.0.1 only and images use exact tags
true
true
::: Health and readiness
::: Migrations ran before the api and are idempotent (T0005)
::: The api's database role cannot change the schema (T0005)
::: Data survives down and up
::: Backup and restore with pg_dump / pg_restore (T0005)
::: A worker restart mid-job stops in time and reruns the job (T0006)
worker stopped in 1s, exit code 0
message='restart' trace_id='4bf92f3577b34da6a3ce929d0e0e4736' job_try=2
::: A job queued by the api carries the caller's trace ID to the worker (T0006)
{"job_id":"6a0b89fa-117d-479a-a0e9-dd911ed4d90a","created":true}
{"status":"complete","result":{"message":"ci","trace_id":"0af7651916cd43dd8448eb211c80319c","job_try":1}}
true

$ DIAGNOSTICS_ENABLED=false docker compose up -d --wait api   # AC 9, real stack
disabled POST -> 404
{"status":"ready"} readyz 200
```

**Fixes during the work:**
- A first `ruff check` flagged two lines over 100 characters. `ruff format` fixed both, and that formatting is the only change made after the first test run.
- The no-env unit run still shows only the existing `test_api.py::test_connection_checks_close_clients` failure (see [03](03-claude-devops-handoff.md), follow-up 1). All 11 new unit tests pass without environment variables.

## Quality rules self-check
- **Q1, Q3:** spec items 8–12 only. `main.py` gains two startup/shutdown handlers and one `include_router`. Nothing existing was reshaped.
- **Q2:** +396 / −5 lines before this file. 200 of those are tests.
- **Q4:** nothing unfinished. The routes are diagnostic by design (spec item 9), and their docstring says so.
- **Q5:**
  - `DIAGNOSTICS_ENABLED` is the spec's security switch, not a "for later" flag.
  - The queue client exists only when the switch is on.
- **Q6:**
  - Only Redis connection and timeout errors, plus `OSError`, become 503, with a fixed message `from None`, because redis-py puts the host and port in its error text.
  - `queue()` raises `RuntimeError` if the client is missing, which would be a programming error, so it's not hidden.
- **Q7:** the body, headers and path are typed and bounded. The job result read from Redis is re-validated with `EchoResult.model_validate`.
- **Q8:**
  - `mypy --strict` is clean with no new suppressions.
  - Tests use `Callable[..., TestClient]` for the client fixture. That's a typed callable, not `Any`.
- **Q9:** each route behavior has a test, and the 404 and trace checks also run on the real stack.
- **Q10:** output above is real. CI is not run yet.
- **Q12:** no new dependencies.
- **Q14:** no logging added; that arrives in T0007.
- **Q15:** the test password `SUPERSECRET` is a canary, there to prove it never appears in responses. The `traceparent` values are from the W3C specification.
- **Q16:** only the `stack` job changed.

## Deviations from the spec
- **Client creation.** Spec item 9 says the api "opens one pool at startup".
  - The api *creates* one client at startup, but it connects on first use. Arq's `create_pool` pings Redis and retries for about 5 s, so it would stop the api from starting when Redis is down. T0003's `/readyz` contract expects the api to start and report the outage.
  - The client is created only when `DIAGNOSTICS_ENABLED` is true.

## Risks and known limits
- **The routes have no auth or rate limit** (spec Risks 1). They're off by default, and only `.env.example` turns them on.
- **The api unpickles job results from Redis** (Arq's default). It carries the same risk noted for the worker in 03.
- **`Idempotency-Key` lifetime.** The key deduplicates only while the job is queued or its result is kept, which is 1 hour. After that, the same key queues a new job.
- **A `traceparent` value is passed on as received**, apart from validation. T0007 decides whether the api starts its own span (a new parent ID) before queueing.

## Follow-ups (not in this PR)
1. T0007: create the `traceparent` from the api's OpenTelemetry span, and continue it in the worker.
2. The existing no-env test failure from [03](03-claude-devops-handoff.md) follow-up 1.
