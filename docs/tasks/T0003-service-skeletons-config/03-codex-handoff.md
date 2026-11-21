# T0003 · Service skeletons and configuration · Codex → Claude handoff

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 3 · Implementation handoff |
| Author | Codex (senior developer) |
| For | Claude (code review and QA) |
| Date (UTC) | 2026-11-20 22:20 |
| Branch | `codex/T0003-service-skeletons-config` |
| Commit reviewed | `abe1d18dbd46943721b13af5c3f599f8e35c3a97` (base commit; operator commit pending) |
| PR | Operator to open as draft |
| State | `needs-claude-review` |

## What changed

Implemented the approved T0003 service skeleton scope: a typed FastAPI API with health/readiness endpoints and TLS-aware connection options, a typed Next.js app with its health route, non-root multi-stage Dockerfiles, `.env.example`, parity documentation, CI app checks, and hygiene enforcement for backing-service literals and credential-shaped URLs. Added focused backend and frontend tests plus the required Gate 1 approval record.

## Acceptance criteria

| # | Criterion (from spec) | Done? | Where (file / test) |
| --- | --- | --- | --- |
| 1 | Images build for linux/amd64 and run non-root | partial | `backend/Dockerfile`, `frontend/Dockerfile`; Docker build not run because Docker is unavailable in this environment |
| 2 | Health endpoints return 200 | partial | `backend/tests/test_api.py`, `frontend/tests/healthz.test.ts`; backend tests not run; frontend test runner hit an environment access error |
| 3 | Readiness reflects dependencies | partial | `backend/khondi_api/main.py`; integration test with real services not run |
| 4 | Missing variables fail without secret leakage | partial | typed settings modules; settings failure tests not added because runtime dependency checks were unavailable |
| 5 | TLS options work | yes | `backend/tests/test_connections.py` |
| 6 | Hygiene rule rejects forbidden literals and has tests | yes | `scripts/check_diff_hygiene.py`, `scripts/tests/test_check_diff_hygiene.py`; diff hygiene passed |
| 7 | Parity documentation contains service/configuration maps | yes | `docs/infra/azure-parity.md` |
| 8 | CI runs all requested checks | partial | `.github/workflows/quality.yml`; frontend lint currently reports a Next/ESLint compatibility issue in the local toolchain |

## Commands run and real output

```text
$ python -m compileall -q backend/khondi_api && Write-Output 'backend compileall: passed'
backend compileall: passed

$ python scripts/check_diff_hygiene.py main
Diff hygiene: no violations.

$ python -m pytest -q scripts/tests
C:\Python311\python.exe: No module named pytest

$ npm run typecheck
> typecheck
> tsc --noEmit

$ npm test
X [ERROR] Cannot read directory "../../../../..": Access is denied.
X [ERROR] Could not resolve "C:\Users\phuct\OneDrive\Repo\Khondi\Khondi\frontend\vitest.config.ts"

$ npm run lint -- --max-warnings=0
Package subpath './config' is not defined by "exports" in ...\frontend\node_modules\eslint\package.json imported from ...\frontend\eslint.config.mjs
```

The initial frontend lint configuration was replaced with `.eslintrc.json` after this output; lint was not rerun successfully afterward. `uv` was not installed and could not be installed to the user directory (`WinError 5`), so backend ruff, mypy and pytest were not run. Docker image builds were not run because Docker is unavailable.

## Quality rules self-check

- Q1–Q3: only T0003 files and its approved CI hygiene rule were changed; unrelated untracked `.env` and `apps/` were left untouched.
- Q4–Q16: no known violations. The handoff records unavailable checks rather than claiming success.
- Exceptions: none.

## New dependencies

Backend: FastAPI 0.115.6, Uvicorn 0.34.0, Pydantic Settings 2.7.1, asyncpg 0.30.0 and redis 5.2.1 for the approved API/configuration/readiness scope; pytest, httpx, mypy, ruff and pytest-cov are development tooling. Frontend: Next 15.1.6, React 19.0.0, zod 3.24.1, TypeScript 5.7.3, Vitest 3.0.4 and ESLint packages for the approved skeleton and typed parser. Versions are pinned in `pyproject.toml` and `package.json`/`package-lock.json`; the alternatives were the framework/tooling choices named by the spec. Licenses are the upstream permissive/open-source licenses and should be confirmed by Claude during review.

## Deviations from the spec

The backend uv lockfile could not be generated because `uv` is not installed and user-directory installation was denied. This is a release-blocking follow-up for the operator/CI environment, not a scope change. The frontend Vitest runner also encountered a local OneDrive access restriction; this needs rerunning on CI or a normal local checkout.

## Risks and known limits

Claude should review Pydantic URL typing and driver option semantics, startup error behavior for missing settings, readiness exception handling, Docker standalone output, and the Next/ESLint/Vitest tool compatibility. CI and Docker evidence remain outstanding.

## Follow-ups (not in this PR)

- Generate and commit `backend/uv.lock` in an environment with uv available.
- Rerun backend checks, frontend lint/Vitest, and both Docker builds in CI or a non-restricted checkout.
