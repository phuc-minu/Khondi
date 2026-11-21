# T0003 · Service skeletons and configuration · Claude review and QA · round 2

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 06 · Code review and QA, round 2 |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (rework) |
| Date (UTC) | 2026-11-20 15:35 |
| PR | #52 |
| Commit reviewed | `2cb89d4` |
| Responds to | `05-codex-rework-r1.md` |
| Verdict | `CHANGES_REQUIRED` |

## Summary
Good progress. R2, R3, R6, R7, R8, R9 and R12 are fixed. With real PostgreSQL 16 and Redis 7, readiness now reports ready and fails correctly. Both images build and run as uid 10001. Five problems remain, and two of them turn CI red (`repo-tooling`, `images`). The test-path exemption switched off every quality rule for tests, not only P3/P10. An invalid secret URL still reaches the startup log. The web app still starts with no settings.

## Status of round 1 findings
| ID | Status | Note |
| --- | --- | --- |
| R1 | partly fixed | Readiness is correct against real services (see QA). The integration test asked for in R1 is still missing: CI starts PostgreSQL and Redis, but no test talks to them. See S5. |
| R2 | fixed | Only connection and timeout errors are caught; a regression test proves other errors are raised |
| R3 | fixed | api container with no env exits 3: `Application startup failed` |
| R4 | not fixed | See S2 |
| R5 | not fixed | See S3 |
| R6 | fixed | `next build` succeeds; `/api/healthz` returns 200 from the container |
| R7 | fixed | `uv.lock` committed; Dockerfile installs with `uv sync --frozen --no-dev` |
| R8 | fixed | Package installs; pytest imports it |
| R9 | fixed | ruff, format and `mypy --strict` are clean. The `type: ignore[call-arg]` lines carry a code and a reason, which Q8 allows. |
| R10 | regressed | See S1 |
| R11 | partly fixed | Redis service added; the `images` job fails. See S4. |
| R12 | fixed | Coverage 93.59 % |
| R13–R15 | addressed | |

## Findings

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| S1 | blocking | Q16, Q9 | `scripts/check_diff_hygiene.py:22` | Adding `backend/tests/` and `frontend/tests/` to `EXEMPT_PREFIXES` exempts tests from every rule: `@pytest.mark.skip`, `it.only` and `TODO` in tests now pass. The spec exempts tests from the P3/P10 rule only. The existing test `test_flags_rule_breaks[backend/tests/test_x.py-@pytest.mark.skip…]` now fails, and CI `repo-tooling` is red. | Restore `EXEMPT_PREFIXES`. Give `Rule` an optional per-rule exempt-path list and set it only on P3/P10. Keep the existing Q9 test, and add one showing P3/P10 skips test paths while Q9 still applies there. |
| S2 | blocking | AC4, P10, Q15 | `backend/khondi_api/settings.py:21,28` | `raise ValueError(...) from exc` chains the pydantic error. Uvicorn prints the whole chain at startup, so `docker run -e DATABASE_URL=notaurl-SUPERSECRET` logs `input_value='notaurl-SUPERSECRET'`. The unit test only checks `str(error)`, not the log. | Use `from None`, or validate the DSNs as fields with `hide_input_in_errors` so no chained error carries the value. Add a test that fails when the secret appears anywhere in the traceback (for example `traceback.format_exception`). |
| S3 | blocking | AC4, P2, Q5 | `frontend/instrumentation.ts`, `frontend/src/settings.ts:25` | The app uses a `src/` directory, so Next.js only loads `src/instrumentation.ts`; the root file is ignored. The web container with no env starts and reports `Ready`. Separately, `export const settings = loadSettings()` is never used and parses at import time. As a result, `npm test` fails without env (`ENVIRONMENT is missing or invalid`), and the Dockerfile has to bake fake `ENVIRONMENT`/`API_BASE_URL` into the build stage. | Move the file to `src/instrumentation.ts`, guarded by `process.env.NEXT_RUNTIME === "nodejs"`. Delete the eager `settings` export and the build-stage `ENV` line. Prove that the container with no env exits non-zero naming the variable. |
| S4 | blocking | AC1, AC8 | `.github/workflows/quality.yml` images job; both Dockerfiles | The job checks `.Config.User = 10001`, but both Dockerfiles use `USER appuser`, so the check fails (`docker inspect` prints `appuser`). The job also runs `curl` as soon as `docker run -d` returns, with no wait for startup. | Use `USER 10001:10001` in both Dockerfiles, or check `docker exec … id -u`. Retry the curl until ready (for example `curl --retry 10 --retry-connrefused --retry-delay 1`). |
| S5 | blocking | AC3, Q9 | `backend/tests/` | Readiness is only tested with mocks. The spec test plan (row 3) asks for a test against the real PostgreSQL and Redis CI services, and R1 asked for it too. | Add an integration test that calls `/readyz` with the CI `DATABASE_URL`/`REDIS_URL` and expects 200, then one with an unreachable URL and expects 503 naming that dependency. Mark it so it runs in the backend CI job. |
| S6 | non-blocking | Q9 | `backend/tests/test_api.py:62` | `test_connection_checks_close_clients` fails when `ENVIRONMENT`/`DATABASE_URL`/`REDIS_URL` are not set in the shell (`3 validation errors for Settings`). | Set them with `monkeypatch.setenv` and clear the `get_settings` cache in the test. |
| S7 | non-blocking | Q11 | `backend/khondi_api/main.py:22` | `@app.on_event("startup")` is deprecated in FastAPI; the bare property reads look like dead code. | Use a `lifespan` handler that calls a `validate()` method on `Settings`. |
| S8 | non-blocking | Q5 | `backend/khondi_api/connections.py:14` | `redis_options` now always returns `{}`. | Remove it and its call, or keep it with a one-line reason (the `rediss://` scheme selects TLS). |
| S9 | non-blocking | P7 | `frontend/Dockerfile` | The web user is in group `nogroup`, not `appgroup`, because `adduser` gets no `-G`. | `adduser --system --uid 10001 -G appgroup appuser`. |

## QA results
Run on `2cb89d4` in a clean Linux checkout. To build the images in the review sandbox, a copy of each Dockerfile also had the sandbox proxy CA certificate added. The repository files were not changed.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Backend lint, format, types | `uv run ruff check .`, `ruff format --check .`, `mypy --strict .` | PASS | `All checks passed!`, `7 files already formatted`, `Success: no issues found in 7 source files` |
| Backend unit | `uv run pytest` with CI env | PASS | `11 passed`, coverage 93.59 %. Without env: 1 failed (S6) |
| Hygiene script tests | `pytest scripts/tests` | FAIL | `1 failed, 36 passed`: the Q9 skip case in `backend/tests/` (S1) |
| Hygiene on the diff | `python scripts/check_diff_hygiene.py origin/main` | PASS | `Diff hygiene: no violations.` |
| Frontend lint, types | `npm run lint -- --max-warnings=0`, `npm run typecheck` | PASS | `No ESLint warnings or errors`; tsc clean |
| Frontend unit | `npm test` | PASS with CI env / FAIL without | `4 passed`; without env, `ENVIRONMENT is missing or invalid` at import (S3) |
| api image | `docker build --platform linux/amd64 backend` | PASS | `id` → `uid=10001(appuser)` |
| web image | `docker build --platform linux/amd64 frontend` | PASS | `id` → `uid=10001(appuser) gid=65533(nogroup)` (S9) |
| api `/healthz` | curl from container network | PASS | `{"status":"ok"} 200` |
| api `/readyz`, postgres:16 + redis:7 up | curl | PASS | `{"status":"ready"} 200` |
| api `/readyz`, Redis stopped | curl | PASS | `{"status":"not_ready","failed":["redis"]} 503` |
| api `/readyz`, both stopped | curl | PASS | `{"status":"not_ready","failed":["postgres","redis"]} 503` |
| web `/api/healthz`, `/` | curl | PASS | `{"status":"ok"} 200`, `/` 200 |
| api with no env | `docker run` | PASS | exit 3, `Application startup failed. Exiting.` |
| api with invalid secret URL | `docker run -e DATABASE_URL=notaurl-SUPERSECRET` | FAIL | log contains `input_value='notaurl-SUPERSECRET'` (S2) |
| web with no env | `docker run` | FAIL | `✓ Ready in 57ms`; never exits (S3) |
| CI on the PR | [run 44763013708](https://github.com/phuc-minu/Khondi/actions/runs/44763013708) | FAIL | `repo-tooling` (S1) and `images` (S4) failed; `backend`, `frontend`, `diff-hygiene` and `secret-scan` passed |

## Acceptance criteria coverage
| # | Criterion | Verified how | Result |
| --- | --- | --- | --- |
| 1 | amd64 images, non-root | build + `id` | pass locally; CI job fails (S4) |
| 2 | Health 200 from containers | curl | pass |
| 3 | Readiness reflects dependencies | real postgres:16 + redis:7 | pass manually; automated test missing (S5) |
| 4 | Missing variable exits non-zero, no secret leak | containers | api pass for missing variables; api leaks an invalid value (S2); web fails (S3) |
| 5 | TLS options | unit tests | pass (`rediss://` handled by the driver) |
| 6 | Hygiene rule, with own tests | script + tests | fail: exemption too broad, test red (S1) |
| 7 | Parity docs | read | pass |
| 8 | CI all green | PR checks | fail (S1, S4) |

## Next step
Codex: fix S1–S5. Answer every finding by ID in `07-codex-rework-r2.md`, with real command output. The label is set to `state:needs-rework`.
