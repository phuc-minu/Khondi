# T0006 · Redis and worker · Spec

| Field | Value |
| --- | --- |
| Task | T0006-redis-worker |
| Step | 1 · Spec (Gate 1 proposal; design in T0002 v1, two additions flagged below) |
| Author | Claude (architect) |
| For | Phil (approval by merging), then Claude as DevOps (implementation), with Codex as independent reviewer |
| Date (UTC) | 2026-11-21 04:35 |
| Spec version | v1 |
| Related | [T0002 v1](../T0002-local-infra-azure-parity/01-spec.md) row T0006, P1, P2, P4, P7, P8, P12, AC 1 and 3; issue #34; T0003 (merged, #52); T0004 (#64) and T0005 (#66), both in review |

## Goal
Move work out of the HTTP request path:
- an Arq worker that runs from the api image;
- one job with a retry and timeout policy;
- a health check driven by a heartbeat in Redis;
- a safe restart, where a job interrupted by a restart is retried and its result is written once;
- an api route that queues work and carries the caller's trace context to the worker.

The same code must work unchanged against Redis over TLS (`rediss://`) in Azure.

## Context
- **Approved in T0002 v1.** The T0006 row covers an Arq worker built from the api image, one real job with retry and timeout, a heartbeat health check, and trace context passed from api to worker. P8 says the worker reports health through a heartbeat key in Redis, checked by a small command.
- **Issue #34** asks for:
  - a sample background job;
  - graceful worker failure and restart;
  - no duplicate side effects;
  - trace IDs flowing from api to worker.
- **On `main` from T0003:**
  - `Settings.REDIS_URL` is a `SecretStr` with a `redis_dsn` property.
  - `/readyz` pings Redis with `redis==5.2.1`.
- **From T0004 (#64):** the `redis:7.4.12` service, with no persistence volume (T0002 open question 3).
- **From T0005 (#66):**
  - the `migrate` job, which the api waits for;
  - `MigrationSettings`, which shows how a second entry point validates its own settings;
  - `python -m khondi_api.migrate`, which exits with code 2 on a bad setting.
- **No OpenTelemetry or logger exists yet.** T0007 adds them. So this task carries trace context in the standard W3C `traceparent` format, which T0007's OpenTelemetry propagator reads and writes directly. Nothing here is replaced later.
- **T0006 starts only after #64 and #66 merge.** Claude implements, Codex reviews, Phil merges.

## Scope
Two implementation PRs, so each stays under 400 changed lines (Q2). PR 2 stacks on PR 1.

### PR 1: Worker, job policy, health and restart
1. **Settings:** `WorkerSettings` in `backend/khondi_api/settings.py`, built like `MigrationSettings`:
   - fields `ENVIRONMENT` and `REDIS_URL`;
   - `hide_input_in_errors`;
   - a `redis_dsn` property that names the variable in its error, `from None`.

   The worker reads no database setting, because no job uses the database yet.
2. **Worker module `backend/khondi_api/worker.py`, run as `python -m khondi_api.worker`:**
   - `redis_settings(dsn: RedisDsn) -> arq.connections.RedisSettings` uses `RedisSettings.from_dsn`, so `rediss://` turns TLS on (P4).
   - A worker built from fixed policy constants:
     - `MAX_TRIES = 3`;
     - `JOB_TIMEOUT_SECONDS = 300`;
     - `KEEP_RESULT_SECONDS = 3600`;
     - `HEALTH_CHECK_INTERVAL_SECONDS = 10`;
     - `retry_jobs=True`;
     - `allow_abort_jobs=False`.
   - A missing or invalid setting exits with code 2, names the variable, and doesn't print its value. This works the same way as `migrate`.
   - `python -m khondi_api.worker --check` uses Arq's health check, which reads the heartbeat key the worker refreshes every 10 s. It exits 0 when the key is fresh and non-zero when it's missing or stale (P8).
   - **SIGTERM** works like this:
     - Arq cancels running jobs, and the process exits within 10 s (P7).
     - A cancelled job goes back on the queue and runs again on the next start, as long as it has tries left.
3. **Job module `backend/khondi_api/jobs.py`:**
   - **`echo(ctx, message: str, traceparent: str, delay_seconds: int = 0) -> EchoResult`.** This diagnostic job:
     - waits `delay_seconds` (validated 0–30, so a restart can be tested mid-job);
     - returns a Pydantic `EchoResult` with `message`, `trace_id` (taken from `traceparent`) and `job_try`.

     Its only side effect is Arq's result record, which Arq writes once per job ID.
   - **`JOBS = [echo]`.**
   - **Policy for every future job, written as a docstring rule and in `local-setup.md`:**
     - Delivery is *at least once*: a job can run again after a restart.
     - So a job must be idempotent, and callers deduplicate with a stable job ID.
4. **Compose `worker` service:**
   - same build as `api`, command `["python", "-m", "khondi_api.worker"]`, no ports;
   - environment `ENVIRONMENT` and `REDIS_URL`;
   - `depends_on`: `redis` (`service_healthy`) and `migrate` (`service_completed_successfully`);
   - `healthcheck` runs `python -m khondi_api.worker --check`;
   - `stop_grace_period: 10s`.
5. **Tests:**
   - **Unit** (`backend/tests/test_worker.py`):
     - `rediss://` produces `ssl=True`, and `redis://` doesn't (P4);
     - a missing or invalid `REDIS_URL` makes the worker exit with code 2 and doesn't echo the URL;
     - `echo` rejects `delay_seconds` outside 0–30.
   - **Integration** (`@pytest.mark.integration`, against the CI backend job's Redis), each on its own queue name:
     - the worker in burst mode runs `echo` and stores an `EchoResult` with `job_try == 1`;
     - enqueueing the same `_job_id` twice queues it once;
     - a job that raises `arq.Retry` is tried exactly `MAX_TRIES` times and then fails;
     - `--check` passes while a worker is running and fails after its heartbeat key expires.
6. **CI `stack` job** (extends the T0004/T0005 job; no other job changes, Q16):
   - **Healthy:** `up --wait` reports `worker` healthy.
   - **Restart:**
     1. Queue `echo` with `delay_seconds=8` through `docker compose exec -T worker python -`.
     2. After 2 s, run `docker compose restart worker`.
     3. Check the stop takes under 10 s, the job completes with `job_try == 2`, and exactly one result exists.
   - **Stale heartbeat:** `docker compose stop worker`, wait past the heartbeat TTL, and check `--check` (via `run --rm --no-deps`) exits non-zero.
7. **Docs:**
   - **`docs/infra/local-setup.md`:**
     - the worker service and its logs;
     - the delivery rule (at least once, idempotent jobs);
     - Redis has no persistence, so queued jobs are lost if Redis restarts;
     - troubleshooting for an unhealthy worker.
   - **`docs/infra/azure-parity.md` (P12):**
     - `worker` → Container App, no ingress, at least 1 replica, health from `--check` as an exec probe or the Redis heartbeat;
     - `REDIS_URL` for the worker → the same Key Vault secret as the api's.

### PR 2: Queueing from the api, with trace context
8. **`backend/khondi_api/tracecontext.py`:**
   - `parse_traceparent(value: str) -> TraceParent | None` checks the W3C format: version `00`, a 32-hex trace ID and a 16-hex parent ID, neither all zeros, and 2-hex flags.
   - `new_traceparent() -> TraceParent` makes a fresh one with `secrets`.
   - `echo` (from PR 1) now parses its `traceparent` with this function instead of splitting the string (Q7).
9. **Diagnostics routes `backend/khondi_api/diagnostics.py` (addition, see Risks 1):**
   - **`POST /v1/diagnostics/echo`:**
     - Body: `{"message": str (1–200 chars), "delay_seconds": int (0–30, default 0)}`.
     - Headers:
       - optional `traceparent`: if it's missing or invalid, a new one is made;
       - optional `Idempotency-Key`: 1–64 chars of `[A-Za-z0-9_-]`, used as the Arq job ID; otherwise a UUID4.
     - Returns `202 {"job_id": str, "created": bool}`. `created` is `false` when that job ID is already queued or has a stored result.
   - **`GET /v1/diagnostics/echo/{job_id}`** returns `{"status": "queued" | "in_progress" | "complete" | "failed" | "not_found", "result": EchoResult | null}`.
   - **Errors:**
     - If Redis is unreachable, both routes return `503 {"detail": "queue unavailable"}`. They catch the specific Redis errors, never a bare `except` (Q6).
     - Invalid bodies, headers and job IDs return 422.
   - **`DIAGNOSTICS_ENABLED: bool = False`** in `Settings`:
     - When it's false, both routes return 404.
     - `.env.example` sets it to `true`.
     - Azure dev leaves it `false` unless Phil turns it on.
   - **Arq pool:** the api opens one pool at startup and closes it at shutdown.
10. **Tests** (`backend/tests/test_diagnostics.py`):
    - **Unit** (`parse_traceparent` and `new_traceparent`):
      - valid and invalid `traceparent` values, including all-zero IDs, uppercase hex and the wrong length;
      - a fresh value parses back.
    - **Integration**, with `TestClient` and a burst worker on the CI Redis:
      - the `trace_id` in the job result equals the trace ID of the `traceparent` sent to `POST`;
      - posting with no `traceparent` still returns a result with a valid trace ID;
      - the same `Idempotency-Key` twice gives `created: true`, then `false`, and the job runs once;
      - when the setting is off, both routes return 404;
      - an unknown job ID returns `not_found`;
      - with Redis unreachable, the routes return 503 and the response doesn't contain the URL.
11. **CI `stack` job:** `curl` the `POST` with a fixed `traceparent`, poll the `GET` until it's `complete`, and check that `trace_id` matches.
12. **Docs:**
    - `local-setup.md` gains the two `curl` commands.
    - `azure-parity.md` gains the `DIAGNOSTICS_ENABLED` row (dev: `false` by default).

**Out of scope**
- Real agent or planning jobs (#2). `echo` is the only job.
- OpenTelemetry, a JSON logger, and seeing the trace in Grafana (T0007). This task only carries `traceparent` and proves it arrives.
- Redis persistence, Arq cron jobs, priority queues, and running more than one worker locally.
- Authentication or rate limiting on the diagnostics routes. They're off unless `DIAGNOSTICS_ENABLED=true`.
- Compose-wide integration tests and Playwright (T0008); Azure (T0009).

## Acceptance criteria
1. On a fresh clone with `.env` from `.env.example`, `docker compose up --wait --build` reports `worker` healthy. The worker runs from the api's Dockerfile with a different command (P1).
2. `python -m khondi_api.worker --check` exits 0 while the worker runs, and non-zero once it has been stopped longer than the heartbeat lifetime (P8).
3. With `REDIS_URL` missing or invalid, the worker exits non-zero, names the variable, and never prints its value (P2, P10).
4. A `rediss://` URL gives Arq a TLS connection, and a `redis://` URL doesn't (P4).
5. `echo` completes, and its result is stored. A job that keeps asking to retry is tried `MAX_TRIES` times and then marked failed. Jobs run out of time after `JOB_TIMEOUT_SECONDS`.
6. If the worker restarts while a job is running, it stops within 10 s. The job then runs again and completes, with exactly one stored result (P7, issue #34).
7. Enqueueing the same job ID twice, directly or through `Idempotency-Key`, runs the job once.
8. A `POST /v1/diagnostics/echo` with a `traceparent` header produces a job result whose `trace_id` equals that header's trace ID (issue #34).
9. With `DIAGNOSTICS_ENABLED` unset, both diagnostics routes return 404. With Redis down, they return 503 without leaking the URL.
10. Backend CI (ruff, `mypy --strict`, pytest ≥85 % coverage) and the extended `stack` job pass on each PR's head commit, and diff hygiene passes.

## Test plan
| AC | Type | What it proves |
| --- | --- | --- |
| 1, 2, 6, 8 | CI `stack` job steps | Health, stale heartbeat, safe restart and trace carry-through on the real Compose stack |
| 2, 5, 7, 8, 9 | pytest integration (CI backend job Redis) | Retry limit, deduplication, heartbeat, trace ID and 404/503 behavior |
| 3, 4, 9 | pytest unit | Fail-fast without leaking secrets; TLS without Azure; input validation |
| 5 (timeout) | pytest unit on the worker's policy values | The timeout is set; Arq enforces it |
| 10 | CI run links | Pipeline green on both PRs |

## Dependencies
- `arq==0.28.0` (released 2026-04-16), MIT. It's the Arq approved in T0002 "Dependencies". It needs `redis>=4.2,<6`, so the pinned `redis==5.2.1` stays as it is. It brings in `click` (BSD-3-Clause) and `hiredis` (MIT). Reasons and licenses go in the handoff (Q12).
- No new images. The worker uses the api image.

## Risks and open questions
1. **Addition: a public diagnostics route.** T0002 says trace context passes from the api to the worker, which needs an api route that queues a job. T0007's end-to-end trace (web → api → worker) needs one too.
   - **Risk:** without auth, anyone who reaches the api could fill the queue.
   - **Mitigations:**
     - the route is off unless `DIAGNOSTICS_ENABLED=true`;
     - the inputs are bounded (200 chars, 30 s);
     - results expire after an hour;
     - Azure dev keeps it off by default.

   **Merging this spec approves it.** The alternative is to drop items 9–11, test trace carry-through only inside pytest, and leave the HTTP path to #2's first real job route.
2. **Addition: trace context before OpenTelemetry.** Carrying the W3C `traceparent` string now means T0007 only switches where the value comes from (the current span instead of `new_traceparent`). The alternative is to move "trace context api → worker" into T0007, which makes T0007 larger.
3. **At-least-once delivery.**
   - A job interrupted by SIGTERM runs again on restart.
   - A worker killed with SIGKILL leaves its job "in progress" until Arq's lock expires. That is about `JOB_TIMEOUT_SECONDS`, so up to 5 minutes, and then the job is retried.
   - Duplicate *results* are prevented by job IDs. Duplicate *side effects* in future jobs are prevented only if each job is written to be idempotent. Claude's reviews of #2 will hold jobs to that rule.
4. **No Redis persistence.** Locally, restarting Redis drops queued jobs and results. T0002 open question 3 accepted this for dev. Anything durable belongs in PostgreSQL (for example #2's `AgentRun`).
5. **Arq's pace.** Arq is maintained mostly for fixes, but releases continue (0.27 in February 2026, 0.28 in April 2026). Job code depends only on `jobs.py` and `worker.py`, so a later switch would stay contained.

## Size
Estimated changed lines, excluding `uv.lock`:

| PR | Code | Tests | Compose / CI | Docs / parity | Total |
| --- | --- | --- | --- | --- | --- |
| 1 | ~95 | ~130 | ~60 | ~40 | ~325 |
| 2 | ~110 | ~120 | ~25 | ~20 | ~275 |

## Approval request
Phil, please approve spec **v1** of T0006 by merging this spec PR. Merging is the Gate 1 approval, and it includes:
- the diagnostics route behind `DIAGNOSTICS_ENABLED` (Risks 1);
- carrying `traceparent` before OpenTelemetry (Risks 2);
- the two-PR split.

If you'd rather leave out the route, request changes and I'll remove items 9–11 and AC 8–9.

Implementation starts after this PR, #64 (T0004) and #66 (T0005) are merged. Claude implements, Codex reviews, and you merge. Nothing here touches Azure.
