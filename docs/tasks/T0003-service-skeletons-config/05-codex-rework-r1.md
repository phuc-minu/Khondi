# T0003 · Service skeletons and configuration · Codex rework · round 1

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 5 · Codex rework, round 1 |
| Author | Codex |
| For | Claude |
| Date (UTC) | 2026-11-20 |
| Branch | `codex/T0003-service-skeletons-config` |
| Commit | Not committed; operator will commit and push |
| Responds to | `04-claude-review-r1.md` |
| State | `state:needs-claude-review` |

## Summary

Implemented the required R1–R12 fixes without changing the approved T0003 scope. The backend now validates settings during startup, uses driver-native Redis TLS selection, catches only dependency connection/timeout failures, and has a uv lockfile and installed package. The frontend now validates settings during instrumentation startup and has a root layout. CI now includes Redis and an amd64 image/health/non-root job. Hygiene exempts test paths as specified. R13–R15 are also addressed.

## Findings answered

| ID | Disposition |
| --- | --- |
| R1 | Fixed Redis options to return `{}` so `rediss://` remains driver-selected. Added readiness unit coverage and CI PostgreSQL/Redis services. A real dependency-up readiness run was not possible locally because Docker access is denied; CI now provides the required real services. |
| R2 | Fixed by catching only `OSError`, timeout, asyncpg `PostgresError`, and Redis connection/timeout errors. Unexpected exceptions are re-raised; the regression test proves this. |
| R3 | Fixed with a FastAPI startup handler that loads settings and evaluates both DSN properties. Missing settings tests pass. |
| R4 | Fixed with hidden Pydantic input errors and named, value-free DSN validation messages. The secret-leak regression test passes. |
| R5 | Fixed by `frontend/instrumentation.ts` calling `loadSettings()` at startup. Vitest coverage was added for valid, missing, and invalid settings. |
| R6 | Fixed by adding `frontend/src/app/layout.tsx`. `npm run build` completed after setting the required build environment. Docker build could not run locally because Docker Buildx access is denied. |
| R7 | Fixed with `backend/uv.lock` and a multi-stage Dockerfile using `uv sync --frozen --no-dev`. The lock was generated with uv 0.6.14 and includes pinned Pydantic resolution. |
| R8 | Fixed with Hatch build metadata and package configuration. `uv sync --frozen` installed `khondi-api`; pytest imports the package successfully. |
| R9 | Fixed imports/formatting, added `asyncpg-stubs`, and documented the single typed Pydantic-settings call-site suppression. |
| R10 | Fixed by exempting `backend/tests/` and `frontend/tests/` from P3/P10, with hygiene test probes proving those paths are exempt. |
| R11 | Fixed CI with Redis 7.4, an amd64 image job, container health curls, and uid 10001 assertions. |
| R12 | Fixed with settings/readiness/connection tests. Coverage is now above the 85% gate. |
| R13 | Addressed by the test-path exemption while retaining the existing source literal rule. |
| R14 | Fixed with `frontend/.dockerignore` and `HOSTNAME=0.0.0.0 PORT=3000`. |
| R15 | Fixed by ignoring `*.tsbuildinfo` and `.coverage`. |

## Evidence

### Backend

Command: `uv run ruff check .`

```text
All checks passed!
```

Command: `uv run ruff format --check .`

```text
7 files already formatted
```

Command: `uv run mypy --strict .`

```text
Success: no issues found in 7 source files
```

Command: `uv run pytest`

```text
11 passed
Required test coverage of 85% reached. Total coverage: 93.59%
```

### Frontend

Commands: `npm run lint -- --max-warnings=0`, `npm run typecheck`, `npm run build`, with `ENVIRONMENT=ci` and `API_BASE_URL=http://api:8000`.

```text
✔ No ESLint warnings or errors
> typecheck
> tsc --noEmit
> build
> next build
▲ Next.js 15.1.6
```

`npm test` was attempted, but the local Windows/OneDrive runner failed before loading Vitest with `Cannot read directory "../../../../..": Access is denied` and `Could not resolve ... frontend\\vitest.config.ts`. This is an environment failure, not a test assertion result; CI remains configured to run Vitest.

### Docker and hygiene

`docker build --platform linux/amd64` was attempted for the backend. Docker returned:

```text
ERROR: CreateFile C:\Users\phuct\.docker\buildx\instances: Access is denied.
```

The image job in `.github/workflows/quality.yml` builds both images, curls both health endpoints, and checks uid 10001. The final hygiene command is intentionally deferred until the operator’s commit exists because the script compares the branch against `origin/main` and requires the newly added handoff file to be part of that diff.

## Dependencies

Added `asyncpg-stubs==0.30.1` for strict typing of the existing asyncpg dependency; it is Apache-2.0-compatible and locked in `uv.lock`. Added Hatchling only as the package build backend; it is locked and required to make `khondi_api` importable as an installed project.

## Follow-ups

None. Docker and Vitest need rerunning in the operator/CI environment with access to Docker Buildx and a filesystem that permits the local esbuild traversal.
