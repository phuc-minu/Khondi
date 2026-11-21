# T0006 · Redis and worker (PR 1 of 2) · Claude (DevOps) → Codex handoff

| Field | Value |
| --- | --- |
| Task | T0006-redis-worker |
| Step | 3 · Implementation handoff (PR 1: worker, job policy, health and restart; spec items 1–7) |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (independent code review and QA) |
| Date (UTC) | 2026-11-21 14:40 |
| Branch | `claude/T0006-redis-worker` (stacked on `claude/T0005-postgres-migrations` at `e72c515`) |
| Commit reviewed | `f33d122` (implementation; this file is added in the next commit) |
| PR | Draft, opened with this file; base is the T0005 branch until #66 merges |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

## What changed
- A background worker now runs from the api image (`python -m khondi_api.worker`).
- Jobs get at most 3 tries and 300 s per try, and results are kept for an hour.
- The worker writes a heartbeat key to Redis every 10 s, and `--check` reads it.
- On SIGTERM, running jobs are cancelled and requeued, so a restart mid-job reruns the job.
- CI proves all of this on the real Compose stack.

| File | Why |
| --- | --- |
| `backend/khondi_api/settings.py` | `WorkerSettings` (`ENVIRONMENT`, `REDIS_URL`), built like `MigrationSettings`: `hide_input_in_errors`, and a DSN error naming the variable `from None`. No database setting, because no job uses it yet (Q5). |
| `backend/khondi_api/worker.py` (new) | Policy constants. `redis_settings()` uses Arq's `RedisSettings.from_dsn`, which sets `ssl=True` for `rediss://` (P4). `create_worker()` passes every policy value explicitly. `check()` wraps Arq's `async_check_health`. `main()` handles settings errors exactly like `migrate.main()`: exit 2, names only. |
| `backend/khondi_api/jobs.py` (new) | `echo` diagnostic job. Inputs are validated by `EchoRequest` (message 1–200 chars, W3C-shaped `traceparent`, delay 0–30 s), and the result is validated into `EchoResult` (Q7). The module docstring states the at-least-once rule. |
| `backend/tests/test_worker.py` (new) | 6 unit tests (TLS, missing or invalid URL, policy values, echo result, 5 invalid-input cases) and 4 integration tests on the CI Redis (run and store, dedupe by job ID, retry limit, heartbeat). |
| `backend/pyproject.toml`, `uv.lock` | `arq==0.28.0`. The lock adds `arq` and `hiredis` only; `click` was already there through uvicorn. |
| `compose.yaml` | `worker` service: same build as api, no ports, depends on `redis` (healthy) and `migrate` (completed), health check `--check`, `stop_grace_period: 10s`. |
| `.github/workflows/quality.yml` | `stack` job only (Q16). One new step: queue an 8 s `echo`, stop the worker 2 s in, then check: <ul><li>stop took under 10 s;</li><li>exit code is 0;</li><li>`--check` fails while it's stopped;</li><li>after `up --wait worker`, the job completes with `job_try == 2` and is no longer queued.</li></ul> |
| `docs/infra/local-setup.md`, `azure-parity.md` | Worker section (health, policy, restarts, at-least-once rule, no Redis persistence, logs), troubleshooting, measured RAM. Parity rows for `worker` and Redis are updated, and `ENVIRONMENT`/`REDIS_URL` now list the worker (P12). |

## Acceptance criteria (PR 1 covers AC 1–7 and 10; AC 8–9 belong to PR 2)
| # | Criterion (spec v1) | Done? | Where |
| --- | --- | --- | --- |
| 1 | `up --wait --build` reports `worker` healthy; api image, different command | yes (locally); CI pending | compose; CI `stack`; output below |
| 2 | `--check` 0 while running, non-zero once stopped | yes | `test_check_follows_the_worker_heartbeat`; CI step |
| 3 | Missing or invalid `REDIS_URL` → non-zero exit, named, no value | yes | 2 unit tests |
| 4 | `rediss://` → TLS, `redis://` → none | yes | `test_rediss_url_turns_on_tls` |
| 5 | `echo` stores its result; retry limit; timeout set | yes | integration tests; `test_worker_uses_the_job_policy` |
| 6 | Restart mid-job: stop < 10 s, job reruns and completes once | yes (locally); CI pending | CI step; output below |
| 7 | Same job ID twice → runs once | yes (direct enqueue; `Idempotency-Key` is PR 2) | `test_same_job_id_is_queued_and_run_once` |
| 10 | Backend CI + extended `stack` pass on head; hygiene passes | **not yet** (all pass locally) | CI on the PR head |

## Commands run and real output
Environment: the owner's Windows 11 machine, Docker Desktop (Linux engine).
- **Backend checks:** run in `ghcr.io/astral-sh/uv:0.6.14-python3.12-bookworm-slim`, sharing a network namespace with `postgres:16.16` and `redis:7.4.12`, which mirrors the CI backend job. Env: `ENVIRONMENT=ci`, `DATABASE_URL=postgresql://khondi:khondi@localhost:5432/khondi_test`, `REDIS_URL=redis://localhost:6379/0`.
- **Stack checks:** the `run:` blocks of the `stack` job, extracted from `quality.yml` and run in order with Compose project `khondi-t0006qa`. `.env` = `.env.example` + `KHONDI_PG_PORT=5433`, because the native PostgreSQL holds 5432. Two steps were not run locally:
  - the `jq` step (`jq` isn't installed on this machine, and the step is unchanged since T0004);
  - the `cp .env.example` step (replaced as described).

```text
$ uv sync --frozen && ruff check . && ruff format --check . && mypy --strict .
All checks passed!
16 files already formatted
Success: no issues found in 16 source files

$ uv run pytest            # CI env, real PostgreSQL 16 + Redis 7.4
khondi_api/settings.py                               45      2    96%
khondi_api/worker.py                                 40      5    88%
TOTAL                                               219      9    96%
Required test coverage of 85% reached. Total coverage: 95.89%
37 passed, 11 warnings in 10.15s

$ ruff check scripts && ruff format --check scripts && mypy --strict scripts && pytest -q scripts/tests
4 files already formatted
Success: no issues found in 4 source files
51 passed in 0.05s

$ python scripts/check_diff_hygiene.py origin/claude/T0005-postgres-migrations
Diff hygiene: no violations.

$ bash t0006-stack.sh      # stack job steps from quality.yml
rc=0 total=122s
::: Health and readiness
::: Migrations ran before the api and are idempotent (T0005)
::: The api's database role cannot change the schema (T0005)
::: Data survives down and up
::: Backup and restore with pg_dump / pg_restore (T0005)
::: A worker restart mid-job stops in time and reruns the job (T0006)
worker stopped in 1s, exit code 0
Health check failed: no health check sentinel value found      # --check with the worker stopped
message='restart' trace_id='4bf92f3577b34da6a3ce929d0e0e4736' job_try=2

$ docker compose ps --all
api running Up 44 seconds (healthy)
migrate exited Exited (0) 17 seconds ago
postgres running Up 56 seconds (healthy)
redis running Up 56 seconds (healthy)
web running Up 38 seconds (healthy)
worker running Up 16 seconds (healthy)
$ docker compose exec -T worker python -m khondi_api.worker --check; echo "check exit=$?"
check exit=0
$ docker stats --no-stream
khondi-t0006qa-worker-1 28.64MiB
```

A first run of the retry test failed with `assert 0 == 3` and the log line `function 'always_retry' not found`. Arq registers a function by its `__qualname__`, so the test now enqueues `always_retry.__qualname__`.

## Quality rules self-check
- **Q1, Q3:** spec items 1–7 only.
  - `migrate.py`'s settings-error block is repeated in `worker.main()` instead of being factored out, because changing `migrate.py` would be a drive-by change. Codex: tell me if you'd rather have a shared helper.
- **Q2:** +428 lines excluding `uv.lock`, against a target of under 400. 186 of those are tests, and the CI restart step is 63, mostly an inline Python heredoc. Cutting tests to fit felt worse than going slightly over.
- **Q4:** no TODOs, stubs or placeholders. `echo` is a diagnostic job by design (spec item 3), and it says so.
- **Q5:**
  - `create_worker(functions, burst)` parameters are used by `main()` (`JOBS`, not burst) and by the tests (burst).
  - `delay_seconds` exists so the restart can be tested, as the spec says.
- **Q6:**
  - `main()` catches only `ValidationError`/`ValueError` from settings.
  - Redis and job errors propagate, so a failing `--check` exits non-zero and Compose marks the worker unhealthy.
- **Q7, Q8:**
  - Job inputs and results go through Pydantic models.
  - `mypy --strict` is clean.
  - The only suppression is `# type: ignore[call-arg]` with its reason, the same as `migrate.py`.
- **Q9:** each behavior has a test that fails without it. The retry test failed for a real reason before the fix above.
- **Q10:** output above is real. CI is not run yet.
- **Q12:** see "New dependencies".
- **Q14:** no `print` in application code; errors go to `sys.stderr` as in `migrate`. The CI heredoc prints the job result to the CI log (test code, not the app).
- **Q15:** no new secrets or variables. The test traceparent is the W3C specification's example value.
- **Q16:** only the `stack` job changed.

## New dependencies
| Package | Version | Why | Alternatives | License |
| --- | --- | --- | --- | --- |
| `arq` | 0.28.0 (2026-04-16) | Redis job queue and worker approved in ADR-001 and T0002; async, retries, timeouts, heartbeat health check | Celery: heavier, sync-first. RQ: sync. Dramatiq: no built-in async jobs. Hand-rolled queue: more code to get right | MIT |
| (transitive) `hiredis` | 3.5.0 | Arq requires `redis[hiredis]`, a C parser for the Redis protocol | — | MIT |

## Deviations from the spec
- **AC 2 wording.** The spec says `--check` fails "once the worker has been stopped longer than the heartbeat lifetime".
  - On a clean stop, Arq deletes the heartbeat key, so `--check` fails at once. CI checks that.
  - After a crash (SIGKILL), the key expires 11 s after the last beat (`interval + 1`). That isn't tested in CI because it would add a fixed wait.
- **Size:** over 400 lines, explained under Q2.

## Risks and known limits
- **Pickle in Redis.** Arq stores jobs and results with `pickle` by default. Anyone who can write to Redis could get code run in the worker or api. Redis is reachable only inside the Compose network locally, and inside the Container Apps environment in Azure. JSON would need custom handling for failure results. Codex: flag it if you think this needs its own task.
- **SIGKILL.** A killed worker leaves its job "in progress" until Arq's lock expires (about `JOB_TIMEOUT_SECONDS` + 10 s), and then the job is retried (spec Risks 3).
- **Quiet logs.** Arq's job logs go to the standard `logging` module, which isn't configured yet, so only warnings and errors show. T0007 adds the JSON logger.
- **Deprecation warning.** Arq 0.28 calls `redis.close()`, which redis-py 5 marks as deprecated. It's a warning in test output only.

## Follow-ups (not in this PR)
1. **Existing test fails without env vars.** `tests/test_api.py::test_connection_checks_close_clients` fails when run with no environment variables (`env -u ENVIRONMENT -u DATABASE_URL -u REDIS_URL pytest -m "not integration"`). It fails the same way on #66's head `e72c515`, so it's not from this PR. CI always sets the variables, so CI is unaffected.
2. **PR 2** (spec items 8–12): `tracecontext.py`, diagnostics routes, `Idempotency-Key`, and the `traceparent` check in CI.
