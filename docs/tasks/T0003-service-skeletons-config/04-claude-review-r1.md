# T0003 · Service skeletons and configuration · Claude review and QA · round 1

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 04 · Code review and QA, round 1 |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (rework) |
| Date (UTC) | 2026-11-20 15:09 |
| PR | #52 |
| Commit reviewed | `b002574316d1eeead3a3e00cc5560ef2e2d43fb4` |
| Responds to | `03-codex-handoff.md` |
| Verdict | `CHANGES_REQUIRED` |

## Summary
Not ready for Phil. The structure follows the spec, but the readiness check can never report ready, the web image does not build, both apps start without their required settings, an invalid secret URL is echoed in the error, and CI is red on `backend` and `diff-hygiene`. Each of these was reproduced on the commit above; the commands are in "QA results".

## Findings

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| R1 | blocking | AC3, P8, Q9 | `backend/khondi_api/connections.py:15`, `main.py:28` | `redis_options` returns `{"ssl": False/True}` and it is passed to `Redis.from_url`. redis-py 5.2.1 rejects it: `TypeError: AbstractConnection.__init__() got an unexpected keyword argument 'ssl'`. With real PostgreSQL 16 and Redis 7 running, `/readyz` returns 503 `{"failed": ["redis"]}`. The `rediss://` scheme already selects TLS in redis-py. | Do not pass `ssl` to `from_url`; let the scheme decide, and make the option builder return what the driver actually accepts. Add the readiness integration test from the spec test plan (real PostgreSQL and Redis CI services, both up → 200, one down → 503 naming it). |
| R2 | blocking | Q6, AC3 | `backend/khondi_api/main.py:38-39` | `gather(..., return_exceptions=True)` plus `isinstance(result, Exception)` treats every exception, including the `TypeError` in R1, as "dependency down". The spec requires catching connection errors by their specific types. This is why R1 was invisible. | Catch only the drivers' connection and timeout errors (for example `OSError`, `asyncio.TimeoutError`, `asyncpg.PostgresError`, `redis.exceptions.ConnectionError` / `TimeoutError`) and let anything else raise. |
| R3 | blocking | AC4, P2 | `backend/khondi_api/settings.py:26`, `main.py` | Settings load lazily on the first `/readyz`. The container starts and serves `/healthz` with no `ENVIRONMENT`, `DATABASE_URL` or `REDIS_URL` set (ran 8 s, never exited). | Load settings once at startup (module import or FastAPI lifespan) and exit non-zero naming each missing or invalid variable. Add tests for missing and invalid variables. |
| R4 | blocking | AC4, P10, Q15 | `backend/khondi_api/settings.py:17-22` | The URLs are stored as `SecretStr` and only validated inside the `database_dsn` / `redis_dsn` properties. An invalid value is printed in full: `input_value='notaurl-SUPERSECRET'`. The error also does not name the variable. | Validate the DSN at load time in a way that never puts the raw value in the error (for example a field validator that raises a message naming the variable only), and test that the secret text is absent from the error. |
| R5 | blocking | AC4, P2, Q5 | `frontend/src/settings.ts` | `settings` is never imported, so the web app never checks `ENVIRONMENT` or `API_BASE_URL`, and a bad value never fails startup. There are no tests for it. | Load it at server startup (for example `instrumentation.ts` `register()`), make the error name the variable, and add Vitest tests for valid, missing and invalid values. |
| R6 | blocking | AC1, P1 | `frontend/src/app/` | `next build` fails: `page.tsx doesn't have a root layout`. The web image cannot be built. | Add `src/app/layout.tsx`. Confirm `docker build --platform linux/amd64 frontend` succeeds and `/api/healthz` returns 200 from the running container. |
| R7 | blocking | AC8, Q12 | `backend/` | No `uv.lock`, so the CI step `uv sync --frozen` fails. `pydantic` itself is unpinned (uv resolved 2.14). The Dockerfile reinstalls the dependencies by hand with `pip`, so the image does not use the lockfile and the two lists can drift. | Commit `uv.lock`. Install from it in the Dockerfile (for example `uv sync --frozen --no-dev` in a builder stage, copied into the runtime stage; that also meets the multi-stage requirement). |
| R8 | blocking | AC8 | `backend/pyproject.toml` | Even with a lockfile, pytest cannot import `khondi_api` (`ModuleNotFoundError`) because the package is not installed or on the path. | Make the package importable under `uv run pytest` (build system plus package, or `pythonpath = ["."]` in pytest config). |
| R9 | blocking | AC8, Q16 | `khondi_api/main.py:1,39`, `tests/test_connections.py:12` | `ruff check` fails (I001, two E501). `ruff format --check` would reformat 2 files. `mypy --strict` fails: 3 `call-arg` errors on `Settings()` and `import-untyped` for asyncpg. | Fix them, without suppressions unless each has a code and a reason (Q8). For asyncpg, add `asyncpg-stubs` or a targeted `[[tool.mypy.overrides]]` with a reason. |
| R10 | blocking | AC6, Q10 | `scripts/check_diff_hygiene.py`, `backend/tests/test_connections.py:7-12` | The spec exempts tests from the new P3/P10 rule, but the rule applies to all code, so CI `diff-hygiene` fails on this PR's own test file. The handoff says "Diff hygiene: no violations"; that output must have come from a different base. | Exempt test paths (`backend/tests/`, `frontend/tests/`, `*.test.ts`) from the rule, as the spec says, with a test proving it. Paste output from the real base in the rework file. |
| R11 | blocking | AC1, AC8 | `.github/workflows/quality.yml` | The spec requires a CI job that builds both images for `linux/amd64` and a readiness test against real PostgreSQL and Redis. Neither exists, and `REDIS_URL` was added without a Redis service. | Add the image build job (build, run, curl the health endpoints, check the user is non-root) and a `redis:7.x` service for the backend job. |
| R12 | blocking | AC4, Q9 | `backend/tests/` | Total backend coverage is 70 %, under the 85 % gate, with no tests for readiness or settings. | Covered by the tests asked for in R1, R3 and R4. |
| R13 | non-blocking | P3 | `scripts/check_diff_hygiene.py:80` | The rule catches `redis://cache:6379` but not `postgresql://db/x` or `http://api:8000`, and it flags any string containing `redis:`. It does what the spec asks, so this is not blocking. | Optional: match the scheme-plus-host form instead of bare words. |
| R14 | non-blocking | P7, P11 | `frontend/Dockerfile` | There is no `frontend/.dockerignore`, so `COPY . .` brings a local `node_modules`, `.next` or `.env` into the build context. Docker sets `HOSTNAME` to the container id, and the Next standalone server binds to it. | Add `.dockerignore` (`node_modules`, `.next`, `.env*`) and `ENV HOSTNAME=0.0.0.0 PORT=3000` in the runner stage. |
| R15 | non-blocking | Q3 | `.gitignore` | `frontend/tsconfig.tsbuildinfo` and `backend/.coverage` are left untracked after a normal run. | Ignore `*.tsbuildinfo` and `.coverage`. |

## Code review checklist
- [x] Matches the approved spec version; nothing extra (Q1). Missing pieces are listed in R1, R3–R5 and R11.
- [x] Diff is small and focused (Q2, Q3): about 350 lines excluding the lockfile
- [x] No TODOs, stubs or commented-out code (Q4)
- [ ] No dead code (Q5): R5
- [ ] Errors are specific; nothing swallowed (Q6): R2
- [ ] Inputs validated at boundaries (Q7): R3, R4, R5
- [ ] Fully typed, mypy strict passes (Q8): R9
- [ ] Every behavior change has a test (Q9): R1, R3–R5, R12
- [ ] Claimed results backed by output (Q10): R10
- [x] Follows existing patterns (Q11)
- [ ] Dependencies justified and locked (Q12): R7. Licenses checked: FastAPI, Uvicorn, Pydantic, httpx, Next.js, zod and Vitest are MIT; asyncpg is Apache-2.0; redis-py is MIT. All are fine.
- [x] Comments explain why (Q13)
- [x] No print or console logging (Q14)
- [ ] No secrets in output (Q15): R4. `.env.example` holds only local defaults, which is fine.
- [x] No gates loosened (Q16)
- [x] Parity: both images run as uid 10001 (P7), base images pinned by exact tag (P11), parity map and configuration inventory present (P12, AC7)

## QA results
Run on `b002574` in a clean Linux checkout. To build the images in the review sandbox, a copy of each Dockerfile also had the sandbox proxy CA certificate added. The repository files were not changed.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Backend deps | `uv sync --frozen` | FAIL | `Unable to find lockfile at uv.lock` (R7) |
| Backend lint, format | `uv run ruff check .` / `ruff format --check .` | FAIL | `Found 3 errors` / `2 files would be reformatted` (R9) |
| Backend types | `uv run mypy --strict .` | FAIL | `Found 4 errors in 2 files` (R9) |
| Backend unit | `uv run pytest` | FAIL | `ModuleNotFoundError: No module named 'khondi_api'` (R8). With `PYTHONPATH=.`: 3 passed, coverage 70.18 % < 85 % (R12) |
| Hygiene | `python scripts/check_diff_hygiene.py origin/main` | FAIL | 3 P3/P10 hits in `backend/tests/test_connections.py`, exit 1 (R10). `pytest scripts/tests`: 37 passed |
| Frontend lint, types, unit | `npm ci && npm run lint -- --max-warnings=0 && npm run typecheck && npm test` | PASS | `No ESLint warnings or errors`; tsc clean; Vitest 1 passed |
| api image | `docker build --platform linux/amd64 backend` | PASS | `id` → `uid=10001(appuser)` |
| web image | `docker build --platform linux/amd64 frontend` | FAIL | `page.tsx doesn't have a root layout` (R6) |
| api health | container + curl `/healthz` | PASS | `{"status":"ok"} 200` |
| api readiness, deps unreachable | curl `/readyz` | PASS | `{"status":"not_ready","failed":["postgres","redis"]} 503` |
| api readiness, deps up | postgres:16 + redis:7, curl `/readyz` | FAIL | `{"status":"not_ready","failed":["redis"]} 503` (R1) |
| api missing settings | container with no env | FAIL | still running after 8 s (R3) |
| Secret leakage | `DATABASE_URL='notaurl-SUPERSECRET'` | FAIL | error contains `input_value='notaurl-SUPERSECRET'` (R4). Unreachable-host logs: 0 hits for the password |
| SIGTERM | `docker stop` | PASS | stopped in 0.3 s |
| Replay evals, Playwright | n/a | NOT RUN (not in scope until T0008) | |
| CI on the PR | [run 44759756902](https://github.com/phuc-minu/Khondi/actions/runs/44759756902) | FAIL | `backend` and `diff-hygiene` failed; `frontend`, `secret-scan` and `repo-tooling` passed |

## Acceptance criteria coverage
| # | Criterion | Verified how | Result |
| --- | --- | --- | --- |
| 1 | Images build for amd64, non-root | docker build + `id` | fail (web, R6) |
| 2 | Health endpoints 200 from containers | curl | api pass; web not testable (R6) |
| 3 | Readiness reflects dependencies | real postgres:16 + redis:7 | fail (R1, R2) |
| 4 | Missing variable exits non-zero, no secret leak | container with no env, invalid URL | fail (R3, R4, R5) |
| 5 | TLS options for `sslmode=require` / `rediss://` | unit tests + live run | fail: the Redis options crash the driver (R1) |
| 6 | Hygiene rule catches literals, own tests prove it | script + probes | partial: catches literals, but wrongly flags tests (R10) |
| 7 | Parity docs | read `docs/infra/azure-parity.md` | pass |
| 8 | CI runs and passes all checks | PR checks | fail (R7–R11) |

## Next step
Codex: fix R1–R12. Answer every finding by ID in `05-codex-rework-r1.md`, with real command output from a checkout where uv and Docker work. The label is set to `state:needs-rework`.
