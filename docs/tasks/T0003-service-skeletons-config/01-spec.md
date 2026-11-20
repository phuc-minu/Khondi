# T0003 · Service skeletons and configuration · Spec

| Field | Value |
| --- | --- |
| Task | T0003-service-skeletons-config |
| Step | 1 · Spec |
| Author | Claude (architect) |
| For | Codex (implementation) |
| Date (UTC) | 2026-11-20 14:45 |
| Spec version | v1 |
| Related | Parent spec [T0002 v1](../T0002-local-infra-azure-parity/01-spec.md) (approved by Phil merging PR #49 on 2026-11-20); issues #2, #35, #17 |

## Approval
This task is the first row of the T0002 implementation breakdown. Phil's Gate 1 approval of T0002 v1 covers it. This file only quotes and details the T0002 design; it adds no new scope. If building it needs anything T0002 does not cover, stop and set `state:blocked` (docs/tasks/README.md, "Scope change means Gate 1 again").

## Goal
Create the smallest runnable api and web apps, each with typed settings, health endpoints and a production Dockerfile, so that the later infrastructure tasks (T0004 to T0009) have real containers to run locally and in Azure.

## Scope
**In scope**
- `backend/`: a Python 3.12 FastAPI app (package `khondi_api`) with `GET /healthz` and `GET /readyz`, a typed settings module, a Dockerfile, pytest tests, `mypy --strict` and ruff passing.
- `frontend/`: a Next.js + TypeScript (strict) app with one page and `GET /api/healthz`, a typed settings parser, a Dockerfile, Vitest tests, ESLint and `tsc --noEmit` passing.
- Root `.env.example` (names and harmless local defaults only) and `.gitignore` entries for `.env`, `node_modules/`, `.next/`.
- `docs/infra/azure-parity.md`: the T0002 service map table, plus a configuration table (see below).
- A rule in `scripts/check_diff_hygiene.py` that rejects added lines in `backend/` or `frontend/` source containing a backing-service host literal (`localhost`, `127.0.0.1`, `postgres:`, `redis:` used as a host) or a credential-shaped URL (`://user:password@`). Tests and `.env.example` are exempt. T0002 test plan row 4 approved this change to CI (Q16).
- CI jobs for backend (ruff, mypy, pytest) and frontend (lint, type check, Vitest) and a job that builds both images for `linux/amd64`.

**Out of scope**
- Compose, PostgreSQL, Redis, worker, migrations, telemetry, Playwright (T0004 to T0008).
- Any feature module, data model or provider (#2 and later).
- Azure resources or Bicep (T0009).

## Design

### Backend
- `backend/pyproject.toml` with pinned dependencies (FastAPI, Uvicorn, Pydantic Settings; dev: pytest, httpx, mypy, ruff). Use a lockfile (uv or pip-tools; choose one and give the Q12 reason).
- `khondi_api/settings.py`: one `Settings(BaseSettings)` class, loaded once at startup. Fields for this task:
  - `PORT: int` (default 8000)
  - `ENVIRONMENT: Literal["local", "ci", "dev"]` (required)
  - `DATABASE_URL: PostgresDsn` (required, `SecretStr`-style handling so it never prints)
  - `REDIS_URL: RedisDsn` (required, same handling)
  A missing or invalid variable makes the process exit non-zero with a message naming the variable and never its value (T0002 AC 3, P2).
- `GET /healthz` returns 200 `{"status": "ok"}` with no dependency checks (P8).
- `GET /readyz` checks that PostgreSQL and Redis accept a connection within 2 seconds each and returns 200 `{"status": "ready"}` or 503 `{"status": "not_ready", "failed": ["postgres" | "redis", ...]}`. Connection errors are caught by their specific exception types, never a bare `except` (Q6). Use `asyncpg` and `redis.asyncio` for these checks only; T0005 adds SQLAlchemy.
- The connection-option builder turns `DATABASE_URL` and `REDIS_URL` into driver options, honouring `sslmode=require` and `rediss://` (P4). Unit tests cover plain and TLS URLs.
- Dockerfile: multi-stage, pinned `python:3.12.x-slim` base by exact tag, non-root user, `CMD` runs Uvicorn on `$PORT`, handles SIGTERM (Uvicorn default), no source of secrets in any layer (P1, P7, P10, P11).

### Frontend
- Next.js with the App Router, TypeScript `strict`, pinned versions, `output: "standalone"` for a small runtime image.
- `src/settings.ts`: parses `process.env` once into a typed object with a hand-written or zod parser (Q7). Fields: `PORT`, `ENVIRONMENT`, `API_BASE_URL` (server-side only). Missing or invalid values throw at startup with the variable name.
- `GET /api/healthz` returns 200 `{"status": "ok"}`.
- The home page renders the product name and nothing else; no design work in this task.
- Dockerfile: multi-stage, pinned `node:22.x-alpine` (or `-slim`) by exact tag, non-root user, runs the standalone server on `$PORT`.

### Configuration inventory
`docs/infra/azure-parity.md` gets a second table, one row per variable, that every later task extends (P12):

| Variable | Used by | Required | Local source | Azure source | Secret |
| --- | --- | --- | --- | --- | --- |
| `PORT` | api, web | no | default | Container App env | no |
| `ENVIRONMENT` | api, web | yes | `.env` | Container App env | no |
| `DATABASE_URL` | api | yes | `.env` | Key Vault reference | yes |
| `REDIS_URL` | api | yes | `.env` | Key Vault reference | yes |
| `API_BASE_URL` | web | yes | `.env` | Container App env | no |

## Acceptance criteria
1. `docker build --platform linux/amd64` succeeds for `backend/` and `frontend/`, and both images run as a non-root user.
2. With required variables set, `GET /healthz` (api) and `GET /api/healthz` (web) return 200 from the running containers.
3. With `DATABASE_URL` or `REDIS_URL` unreachable, `GET /readyz` returns 503 listing the failed dependency; with both reachable it returns 200.
4. With any required variable missing, each app exits non-zero naming the variable; the value of a secret variable never appears in output, logs or error text.
5. The connection-option builder enables TLS for `sslmode=require` and `rediss://` URLs and not for plain ones.
6. `scripts/check_diff_hygiene.py` rejects a host literal or credential URL added to app source, and its own tests prove it.
7. `docs/infra/azure-parity.md` contains the T0002 service map and the configuration inventory above.
8. CI runs and passes ruff, `mypy --strict`, pytest, ESLint, `tsc --noEmit`, Vitest and both image builds.

## Test plan
| Criterion | Test type | What the test proves |
| --- | --- | --- |
| 1, 2 | CI image build + container run with curl | Images build for Azure's platform and serve health |
| 3 | pytest with real PostgreSQL and Redis CI service containers, then with them stopped | Readiness reflects real dependencies |
| 4 | pytest and Vitest on the settings modules | Fail fast, no secret leakage |
| 5 | pytest unit tests | TLS path works without Azure |
| 6 | pytest on the hygiene script | The new rule catches what P3/P10 forbid |
| 7, 8 | Claude review + CI | Parity docs and quality gates in place |

## Dependencies
FastAPI, Uvicorn, Pydantic Settings, asyncpg, redis (Python client), pytest, httpx, mypy, ruff; Next.js, React, TypeScript, ESLint, Vitest, and zod if chosen. Each pinned with a Q12 entry in the handoff.

## Risks and open questions
None beyond T0002. If the image builds or the readiness test cannot run in CI without credentials, say so in the handoff instead of mocking them.

## Size
Around 400 to 500 changed lines excluding lockfiles and Next.js generated files. If it grows past that, split into backend and frontend PRs and say so in the handoff (Q2).
