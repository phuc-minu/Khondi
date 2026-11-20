# T0003 · Service skeletons and configuration · Claude review and QA · round 3

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 08 · Code review and QA, round 3 |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (rework) |
| Date (UTC) | 2026-11-20 15:55 |
| PR | #52 |
| Commit reviewed | `b34b269` |
| Responds to | `07-codex-rework-r2.md` |
| Verdict | `CHANGES_REQUIRED` |

## Summary
S1, S2, S4 and S5 are fixed, and the Next.js advisories (R16) are gone: `npm audit` reports 0 vulnerabilities. Three problems remain, and they are small:
- `mypy --strict` fails on the new test.
- The dependency refresh pulled in unrequested major upgrades (Vitest 5, zod 4). As a result `npm ci` fails, so the frontend CI job and the web image can't install.
- The web server logs the missing-settings error but keeps running instead of exiting.

## Status of round 2 findings
| ID | Status | Evidence |
| --- | --- | --- |
| S1 | fixed | Exemption is per rule; `pytest scripts/tests` 38 passed; Q9 still caught in `backend/tests/` |
| S2 | fixed | `docker run -e DATABASE_URL=notaurl-SUPERSECRET` exits 3; 0 occurrences of the secret in the log; message names `DATABASE_URL` |
| S3 | partly fixed | `src/instrumentation.ts` now runs and names `ENVIRONMENT`, but the standalone server stays up (see T3) |
| S4 | fixed | Both images: `.Config.User` = `10001:10001`, `id` → uid 10001, gid 10001; curl retries added |
| S5 | fixed | With postgres:16 + redis:7 on the CI ports, both integration tests pass. With the services stopped, `test_readyz_uses_ci_services` fails `503 == 200`, so the test really depends on them. |
| R16 | fixed | `npm audit --omit=dev` and `npm audit`: `found 0 vulnerabilities`; `next` 15.5.29 |
| S6 | open (non-blocking) | `test_connection_checks_close_clients` still fails without env (`3 validation errors for Settings`) |
| S7–S9 | S9 fixed; S7, S8 open (non-blocking) | |

## Findings

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| T1 | blocking | Q8, AC8 | `backend/tests/test_api.py:25-26` | `mypy --strict` fails: `Argument "DATABASE_URL" to "Settings" has incompatible type "str"; expected "SecretStr"` (twice). The CI backend job would fail. | Pass `SecretStr("...")`, or build the settings from env with `monkeypatch.setenv` as the other settings tests do. |
| T2 | blocking | Q12, AC1, AC8 | `frontend/package.json`, `package-lock.json` | `npm ci` fails with `ERESOLVE`: Vitest 5.1.1 needs `vite`, whose peer `@types/node` must be `^20.19.0 \|\| >=22.12.0`, but 22.10.7 is pinned. With `--legacy-peer-deps`, Vitest cannot start (`Cannot find package 'vite'`). The web Dockerfile's `npm ci` fails the same way, so neither CI `frontend` nor `images` can pass. | Keep only the upgrades the audit needs. The Vitest 3.0.4 advisory is fixed inside 3.x, so pin a patched 3.x (or, if you keep 5.x, pin `@types/node` ≥ 22.12 and make sure `vite` is in the lockfile). Regenerate the lockfile with a plain `npm install`, then show `npm ci`, `npm test` and `npm audit` output. |
| T3 | blocking | AC4, P2 | `frontend/src/instrumentation.ts` | With no env, the standalone server logs `unhandledRejection: … ENVIRONMENT is missing or invalid` and keeps running, answering 500 (still alive after 10 s). The spec says the app exits non-zero. | In `register()`, catch the settings error, write the message (no values) to stderr, and `process.exit(1)`. Prove it with `docker run` and no env: show the exit code. |
| T4 | blocking | Q1, Q12 | `frontend/package.json` | `zod` 3.24.1 → 4.6.7 is a major upgrade the audit does not need (no advisory against 3.24.1). It forced a code change in `settings.ts`, and the handoff gives no Q12 reason. `eslint` 9.18 → 9.39 and the `postcss` override also have no stated reason. | Revert zod to 3.x, or give a Q12 reason. List every dependency change in the rework file with the advisory or reason behind it. |
| T5 | non-blocking | Q9 | `backend/tests/test_api.py:84` | Same as S6. | `monkeypatch.setenv` plus `get_settings.cache_clear()`. |
| T6 | non-blocking | Q11 | `frontend/next-env.d.ts` | Next 15.5 regenerated this file and now points at `.next/types/routes.d.ts`. That is fine as long as `tsc` runs after a build or `next typegen`. | No change needed unless `typecheck` fails in CI on a clean checkout. |

## Code review checklist
- [ ] Spec only (Q1): T4
- [x] Small, focused diff (Q2, Q3), apart from the lockfile churn caused by T2 and T4
- [x] No TODOs or stubs (Q4)
- [x] Errors specific, not swallowed (Q6); exception chaining removed without hiding the variable name
- [x] Inputs validated (Q7)
- [ ] Types (Q8): T1
- [x] Tests for each behavior change (Q9); real-service readiness test added
- [ ] Evidence (Q10): Codex couldn't run pytest or Docker and said so plainly, which is acceptable. T1 and T2 would have shown up in those runs.
- [ ] Dependencies justified (Q12): T2, T4
- [x] No secrets (Q15); no gates loosened (Q16): S1 now narrows the exemption correctly

## QA results
Run on `b34b269` in a clean Linux checkout. To build the images in the review sandbox, a copy of each Dockerfile also had the sandbox proxy CA certificate added. Docker Hub rate-limited one build, so the legacy builder was used with cached base images. The repository files were not changed.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Backend lint, format | `uv run ruff check .`, `ruff format --check .` | PASS | `All checks passed!`, `7 files already formatted` |
| Backend types | `uv run mypy --strict .` | FAIL | `Found 2 errors in 1 file` (T1) |
| Backend tests with CI services | `uv run pytest` (postgres:16, redis:7 on 5432/6379) | PASS | `14 passed`, coverage 93.59 % |
| Integration tests, services stopped | `pytest -m integration` | FAIL as expected | `assert 503 == 200`, which proves the test uses the real services |
| Hygiene | `pytest scripts/tests`; `check_diff_hygiene.py origin/main` | PASS | `38 passed`; `Diff hygiene: no violations.` |
| Frontend install | `npm ci` | FAIL | `ERESOLVE` on `@types/node` vs `vite` (T2) |
| Frontend lint, types | with `--legacy-peer-deps` | PASS | `No ESLint warnings or errors`; tsc clean |
| Frontend unit | `npm test` | FAIL | `Cannot find package 'vite'` (T2) |
| Audit | `npm audit --omit=dev`, `npm audit` | PASS | `found 0 vulnerabilities` |
| api image | `docker build backend` | PASS | `10001:10001`; `uid=10001 gid=10001` |
| api, invalid secret URL | `docker run -e DATABASE_URL=notaurl-SUPERSECRET` | PASS | exit 3; secret not in log |
| api, no env | `docker run` | PASS | exit 3 |
| web image | `docker build frontend` | FAIL | `npm ci` `ERESOLVE` (T2). Built a copy with `--legacy-peer-deps` to test the runtime: `uid=10001 gid=10001(appgroup)` |
| web `/api/healthz` with env | curl | PASS | `{"status":"ok"} 200` |
| web, no env | `docker run` | FAIL | logs the error, keeps running, answers 500 (T3) |
| CI on the PR | head `b34b269` | NOT RUN | no check runs were reported on this commit |

## Acceptance criteria coverage
| # | Criterion | Result |
| --- | --- | --- |
| 1 | amd64 images, non-root | api pass; web image install fails (T2) |
| 2 | Health 200 from containers | pass (web tested on an overlay build) |
| 3 | Readiness reflects dependencies | pass, with an automated real-service test |
| 4 | Missing variable exits non-zero, no leak | api pass; web stays up (T3) |
| 5 | TLS options | pass |
| 6 | Hygiene rule and its tests | pass |
| 7 | Parity docs | pass |
| 8 | CI passes | fail (T1, T2) |

## Next step
Codex: fix T1–T4. Answer each by ID in `09-codex-rework-r3.md`. The label is set to `state:needs-rework`. If these are the only changes, round 4 should be quick.
