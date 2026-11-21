# T0003 · Service skeletons and configuration · Claude review and QA · round 5

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 12 · Code review and QA, round 5 |
| Author | Claude (code reviewer and senior QA) |
| For | Phil |
| Date (UTC) | 2026-11-20 16:35 |
| PR | #52 |
| Commit reviewed | `7288bf9`, plus a merge of `main` that only resolves `docs/tasks/INDEX.md` |
| Responds to | `11-codex-rework-r4.md` |
| Verdict | `APPROVE_FOR_OWNER_REVIEW` |

## Summary
Ready for Phil. Every blocking finding from rounds 1 to 4 is fixed. I verified all eight acceptance criteria in a clean Linux checkout, including real PostgreSQL 16 and Redis 7, both linux/amd64 images, and startup failure without settings. The frontend dependency set has no known advisories.

## Status of round 4 findings
| ID | Status | Evidence |
| --- | --- | --- |
| U1 | fixed | `ruff check`: `All checks passed!`; `mypy --strict`: `Success: no issues found in 7 source files` |
| U2 | fixed | Set D applied exactly (vitest 5.1.1, zod 4.6.7, @types/node 22.20.5); `npm ci` clean; `npm audit`: `found 0 vulnerabilities` |
| U3 | recorded | `11-codex-rework-r4.md` "U3 — attribution corrected" |
| T5 | open, non-blocking | `test_connection_checks_close_clients` needs env vars, which CI provides. Fine as a follow-up. |

Codex did not update `docs/tasks/INDEX.md` in round 4. I fixed that row while resolving the merge conflict with `main`. I also kept the T0010 and T0011 rows that are on `main`.

## Code review checklist
- [x] Matches spec v1; dependency majors justified by advisory IDs (Q1, Q12)
- [x] Diff focused (Q2, Q3): about 500 changed lines excluding lockfiles
- [x] No TODOs, stubs or dead code (Q4, Q5)
- [x] Only driver connection and timeout errors are caught; other errors re-raise, proven by a test (Q6)
- [x] Settings validated at startup on both apps; errors name the variable and never the value (Q7, P2)
- [x] `mypy --strict` and TS `strict` clean; each `type: ignore` has a code and a reason (Q8)
- [x] Tests for every behavior, including real-service readiness integration tests (Q9)
- [x] Codex said plainly which commands its sandbox couldn't run; I ran all of them here (Q10)
- [x] No print or console logging (Q14); no secrets in code, logs or images (Q15, P10)
- [x] Gates not loosened; the hygiene exemption is per rule and limited to P3/P10 (Q16)
- [x] Parity: one image per service (P1), URL-only backing services (P3), TLS by URL (P4), non-root uid/gid 10001 on `$PORT` (P7), `/healthz` + `/readyz` (P8), amd64 and pinned bases (P11), parity map (P12)

## QA results
Run on `7288bf9` in a clean Linux checkout. To build the images in the review sandbox, a copy of each Dockerfile also had the sandbox proxy CA certificate added. The repository files were not changed.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Backend lint, format, types | `uv run ruff check .`, `ruff format --check .`, `mypy --strict .` | PASS | `All checks passed!`, `7 files already formatted`, `Success: no issues found in 7 source files` |
| Backend unit + integration | `uv run pytest` with postgres:16 and redis:7 | PASS | `14 passed`, coverage 93.59 % |
| Hygiene | `pytest scripts/tests`; `check_diff_hygiene.py origin/main` | PASS | `38 passed`; `Diff hygiene: no violations.` |
| Frontend install, audit | `npm ci`; `npm audit` | PASS | clean; `found 0 vulnerabilities` |
| Frontend lint, types, unit, build | `npm run lint -- --max-warnings=0`, `typecheck`, `npm test` (no env), `npm run build` | PASS | `No ESLint warnings or errors`; tsc clean; `Tests 4 passed (4)`; build ok |
| Images | `docker build` backend and frontend | PASS | `.Config.User` = `10001:10001` for both |
| api health, readiness | containers + curl | PASS | `/healthz` 200; `/readyz` `{"status":"ready"}` 200; with Redis stopped `{"failed":["redis"]}` 503 |
| web health | curl `/api/healthz` | PASS | `{"status":"ok"}` 200 |
| Missing settings | `docker run` with no env | PASS | api exit 3, web exit 1, both name the variable |
| Secret leakage | `DATABASE_URL=notaurl-SUPERSECRET` | PASS | 0 occurrences in output |
| Replay evals, Playwright | n/a | NOT RUN (out of scope until T0008) | |
| CI on the PR | GitHub checks on the pushed head | see the PR | checked after this file was pushed |

## Acceptance criteria coverage
| # | Criterion | Verified how | Result |
| --- | --- | --- | --- |
| 1 | amd64 images, non-root | build + inspect | pass |
| 2 | Health 200 from containers | curl | pass |
| 3 | Readiness reflects dependencies | real postgres:16 + redis:7, then Redis stopped; integration tests | pass |
| 4 | Missing variable exits non-zero, no secret leak | containers | pass |
| 5 | TLS for `sslmode=require` / `rediss://` | unit tests | pass |
| 6 | Hygiene rule and its tests | script + tests | pass |
| 7 | Parity docs | read | pass |
| 8 | CI checks | local run of every CI command; PR checks | pass locally |

## Next step
Phil: this PR is ready for your review. It is marked ready and assigned to you. GitHub won't let me request your review because the PR counts as yours when the app opens it. This verdict is not a merge approval; merging is yours to decide. The label is set to `state:ready-for-phil`.

Non-blocking follow-ups for a later task: T5 (make one unit test independent of env vars), S7 (move the FastAPI startup hook to `lifespan`), S8 (remove the no-op `redis_options`), and moving off the deprecated `next lint` before Next.js 16.
