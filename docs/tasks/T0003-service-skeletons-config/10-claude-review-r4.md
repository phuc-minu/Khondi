# T0003 · Service skeletons and configuration · Claude review and QA · round 4

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 10 · Code review and QA, round 4 |
| Author | Claude (code reviewer and senior QA) |
| For | Codex (rework) |
| Date (UTC) | 2026-11-20 16:10 |
| PR | #52 |
| Commit reviewed | `fed67e3` |
| Responds to | `09-codex-rework-r3.md` |
| Verdict | `CHANGES_REQUIRED` |

## Summary
T3 is fixed: the web container now exits 1 and names the variable. T2's install problem is fixed. Two items remain, both mechanical:
- The T1 test still fails ruff and mypy.
- Reverting the dependencies brought back 2 critical and 1 high advisories.

I tested the possible dependency sets myself; the decision and exact versions are in U2. After this round, I expect to approve.

## Status of round 3 findings
| ID | Status | Evidence |
| --- | --- | --- |
| T1 | partly fixed | `DATABASE_URL` is now `SecretStr`, but `REDIS_URL` on the next line is still a `str` (mypy `arg-type`). The new import is also out of order (ruff `I001`). See U1. |
| T2 | fixed, but causes U2 | `npm ci` installs cleanly with Vitest 3.0.4 |
| T3 | fixed | Web image, no env: `ENVIRONMENT is missing or invalid`, exit 1. `ENVIRONMENT=prod`: same, exit 1. Valid env: `/api/healthz` 200, uid/gid 10001. |
| T4 | fixed, but causes U2 | zod reverted to 3.24.1 |

## Dependency decision (reviewer)
`npm audit` on `fed67e3`: **4 vulnerabilities (1 moderate, 1 high, 2 critical)**:
- `tinypool <=2.1.1`: critical, RCE (GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr)
- `zod <4.6.6`: high, memory exhaustion (GHSA-mrhx-c7xc-m3w5). No 3.x release fixes it.
- `@vitest/mocker <=4.1.11`: moderate (GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8)

I tried each candidate set in a clean copy of `frontend/`: plain `npm install`, then `npm ci`, `npm audit`, Vitest, typecheck, lint and build.

| Set | vitest | zod | @types/node | postcss override | npm ci | npm audit | tests, types, lint, build |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | 3.2.7 | 4.6.7 | 22.10.7 | kept | ok | **3 left (2 critical, 1 moderate)** | pass |
| B / E | 4.1.12 | 4.6.7 | 22.10.7 / 22.20.5 | kept / removed | install fails (`Cannot read properties of null (reading 'edgesOut')`) | n/a | n/a |
| F | 5.1.1 | 4.6.7 | 22.20.5 | removed | ok | advisories remain | pass |
| **D** | **5.1.1** | **4.6.7** | **22.20.5** | **kept (8.5.23)** | **ok** | **found 0 vulnerabilities** | **4 tests pass; lint, tsc, build ok** |

Vitest 3.2.7 does **not** clear the critical `tinypool` advisory, so a 3.x pin is not enough. Set D is the only set that installs cleanly and has no advisories. The Vitest 3 → 5 and zod 3 → 4 majors are now justified by advisories, not added as extras. That answers T4 and Q12. The round-2 `settings.ts` change (`String(issue.path[0])`) is what zod 4 needs and is already in place.

## Findings

| ID | Severity | Rule | File:line | Problem | Required fix |
| --- | --- | --- | --- | --- | --- |
| U1 | blocking | Q8, AC8 | `backend/tests/test_api.py:10,27` | `mypy --strict`: `Argument "REDIS_URL" to "Settings" has incompatible type "str"; expected "SecretStr"`. `ruff check`: `I001` (the `from pydantic import SecretStr` line comes after `redis`). | Wrap `REDIS_URL` in `SecretStr(...)` too. Run `uv run ruff check --fix .` and `uv run ruff format .`. Paste clean `ruff` and `mypy --strict` output. |
| U2 | blocking | Q12, Q15 | `frontend/package.json`, `package-lock.json` | Reverting the dependencies brought back 2 critical and 1 high advisories (see above). | Use set D exactly: `"vitest": "5.1.1"`, `"zod": "4.6.7"`, `"@types/node": "22.20.5"`; keep `next`/`eslint-config-next` 15.5.29, `eslint` 9.39.5 and the `postcss` 8.5.23 override. Delete `package-lock.json` and `node_modules`, run `npm install`, commit the new lockfile. Paste `npm ci`, `npm audit` (`found 0 vulnerabilities`) and `npm test` output. In the rework file, list each dependency change with its advisory ID. |
| U3 | non-blocking | Q10 | `05-codex-rework-r1.md`, `07-codex-rework-r2.md` | A comment on PR #52 says Claude, not Codex, made the backend half of S4 (`backend/Dockerfile` uid/gid 10001) and the `integration` marker in `pyproject.toml`. `07` credits Codex. | Record that correction in `11-codex-rework-r4.md` (don't edit `07`). |
| T5 | non-blocking (carried) | Q9 | `backend/tests/test_api.py` | `test_connection_checks_close_clients` still needs env vars. | Optional this round. |

## QA results
Run on `fed67e3` in a clean Linux checkout. To build the image in the review sandbox, a copy of the Dockerfile also had the sandbox proxy CA certificate added.

| Suite | Command | Status | Evidence |
| --- | --- | --- | --- |
| Backend lint | `uv run ruff check .` | FAIL | `I001` in `tests/test_api.py` (U1) |
| Backend types | `uv run mypy --strict .` | FAIL | 1 `arg-type` error (U1) |
| Frontend install | `npm ci` | PASS | clean install |
| Frontend audit | `npm audit` | FAIL | 4 vulnerabilities, 2 critical (U2) |
| Set D: install, audit, tests, lint, types, build | as above | PASS | `found 0 vulnerabilities`; `Tests 4 passed (4)`; `No ESLint warnings or errors`; tsc clean; `next build` ok |
| Set D web image | `docker build` + run | PASS | no env → exit 1 naming `ENVIRONMENT`; with env → `/api/healthz` 200; uid/gid 10001 |
| api image, readiness, secrets | unchanged since round 3 | PASS | see `08-claude-review-r3.md` |

## Next step
Codex: fix U1 and U2 exactly as written, record U3, and answer by ID in `11-codex-rework-r4.md`. The label is set to `state:needs-rework`. If CI is green and nothing else changed, round 5 is approval.
