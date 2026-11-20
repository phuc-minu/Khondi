# T0004 · Compose stack and networking · Spec

| Field | Value |
| --- | --- |
| Task | T0004-compose-stack |
| Step | 1 · Spec (Gate 1 proposal; design approved in T0002 v1, one addition flagged below) |
| Author | Claude (architect) |
| For | Phil (approval by merging), then Claude as DevOps (implementation), with Codex as independent reviewer |
| Date (UTC) | 2026-11-20 16:00 |
| Spec version | v1 |
| Related | [T0002 v1](../T0002-local-infra-azure-parity/01-spec.md) rows T0004, P1–P12, AC 1–4; issues #32, #31, #17; T0003 / PR #52 |

## Goal
Make `docker compose up --wait` on a fresh clone start the api, web, PostgreSQL and Redis. When it finishes:
- every container is healthy;
- `GET /readyz` returns 200;
- no paid keys are needed.

The setup must hold on Phil's Windows computer and in CI.

## Context
- **Already approved in T0002.** T0002 v1 approved this task's design: one root `compose.yaml`, health checks, startup order, `127.0.0.1` ports, a reset script, `docs/infra/local-setup.md` and a CI job that boots the stack.
- **Built on T0003 (PR #52, not merged yet).** It provides:
  - `backend/Dockerfile`: api on `PORT`, default 8000, non-root 10001.
  - `frontend/Dockerfile`: web on `PORT=3000`, non-root 10001.
  - `GET /healthz` and `GET /readyz` on the api, `GET /api/healthz` on the web.
  - The settings contract (`ENVIRONMENT`, `DATABASE_URL`, `REDIS_URL`, `API_BASE_URL`, `PORT`).
  - `docs/infra/azure-parity.md`.
- **Who implements.** Phil reassigned DevOps implementation for T0004–T0008 to Claude on 2026-11-20. Codex reviews in place of Claude. Phil's merge stays the Gate 2 decision.

## Scope
**In scope**
- **`compose.yaml` at the repository root**, project name `khondi`, with services:
  - `postgres`: `postgres:16.<patch>`, the newest 16.x patch at implementation time, as an exact tag (P5, P11). Named volume `khondi-pgdata`.
  - `redis`: `redis:7.4.<patch>`, exact tag. No persistence volume, because Redis is only a queue and cache (T0002 open question 3).
  - `api`: `build: ./backend`, `platform: linux/amd64` (P11).
  - `web`: `build: ./frontend`, `platform: linux/amd64`.
- **Environment.**
  - Each service gets an explicit `environment:` list naming only the variables it uses, with values from `.env`. Never pass `env_file:` to app services, because `PORT` differs between api and web.
  - The `postgres` service takes `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` from `.env`.
  - Required values use the `${VAR:?message}` form, so a missing `.env` fails with a clear message.
- **Health checks and startup order (P8).**
  - `postgres`: `pg_isready`.
  - `redis`: `redis-cli ping`.
  - `api`: a Python one-liner fetching `http://127.0.0.1:8000/readyz` (the image has no curl).
  - `web`: a Node one-liner fetching `/api/healthz`.
  - `depends_on` with `condition: service_healthy`: api waits for postgres and redis, and web waits for api.
- **Ports bound to `127.0.0.1` only (T0002).** web 3000, api 8000, PostgreSQL 5432, Redis 6379.
- **Host-port overrides (the addition, see Risks 1).** `KHONDI_WEB_PORT`, `KHONDI_API_PORT`, `KHONDI_PG_PORT` and `KHONDI_REDIS_PORT`, defaulting to the ports above. They change only the host side of the mapping. Container ports and the URLs apps use don't change.
- **`.env.example` additions** (names and harmless local defaults only, P10):
  - `POSTGRES_USER=khondi`, `POSTGRES_PASSWORD=khondi`, `POSTGRES_DB=khondi`;
  - the four `KHONDI_*_PORT` variables, commented with their defaults.

  Existing T0003 lines stay unchanged.
- **`scripts/dev-reset.py`** (typed with mypy `--strict`):
  1. List the `khondi` project's volumes.
  2. Require the user to type `RESET` exactly.
  3. Run `docker compose down --volumes`.

  On any other input it exits 1 having done nothing. It needs `--yes-i-really-mean-it` to run without a prompt in CI, and that flag is never documented as the normal path. Tests go in `scripts/tests/test_dev_reset.py`, and the docker call is injected so tests never run docker.
- **`docs/infra/local-setup.md`**:
  - **Prerequisites**, with measured figures: Docker Desktop with the WSL 2 backend in **Linux containers** mode, RAM used by the running stack (`docker stats`), and disk used by images and volumes.
  - First run; ports table; overriding ports.
  - Stop/start (data is kept); the reset script.
  - Troubleshooting, including:
    - a native PostgreSQL already on 5432;
    - Windows-containers mode;
    - slow builds when the repo is under OneDrive.
- **CI job `stack` in `.github/workflows/quality.yml`** (approved by T0002 "CI job that boots the stack"):
  1. Copy `.env.example` to `.env`.
  2. Run `docker compose up --wait --build`, with a 5-minute timeout.
  3. Curl api `/healthz` and `/readyz` (expect 200 and `{"status":"ready"}`) and web `/api/healthz`.
  4. Persistence check: write a row with `psql`, run `docker compose down`, then `up --wait`, and read the row back.
  5. Run `docker compose down --volumes` at the end. It's CI, so the data is throwaway.

  Other jobs are left untouched (Q16).
- **`docs/infra/azure-parity.md`** (P12): add rows for the volume (→ Flexible Server managed storage) and the host-port variables (local-only, with no Azure equivalent).

**Out of scope (later tasks)**
- `migrate` service, SQLAlchemy/Alembic (T0005).
- Worker (T0006).
- OpenTelemetry collector, `grafana/otel-lgtm` (T0007).
- Playwright and integration tests against Compose (T0008).
- Replay-mode wiring (#35).
- Dev hot-reload targets. T0003's images are production builds, and a dev overlay would be a new design (see Risks 2).
- Azure (T0009).

## Acceptance criteria
1. Starting from a fresh clone, run `cp .env.example .env` then `docker compose up --wait --build`. All four services report `healthy`. `GET 127.0.0.1:8000/readyz` returns 200 `{"status":"ready"}` and `GET 127.0.0.1:3000/api/healthz` returns 200. No paid keys are set (T0002 AC1).
2. A row written to PostgreSQL survives `docker compose down` followed by `up --wait` (T0002 AC2).
3. `scripts/dev-reset.py` deletes volumes only after `RESET` is typed exactly. Any other input exits 1 and leaves the volumes untouched (T0002 AC2).
4. Without `.env`, `docker compose up` fails before starting anything, and the message names the missing variable.
5. `docker compose config` shows every published port with host IP `127.0.0.1`, and every image has an exact tag (no `latest`, no bare major) (P11).
6. With `KHONDI_PG_PORT=5433` set, the stack starts while something else holds host port 5432, and the apps still reach PostgreSQL at `postgres:5432`.
7. No backing-service host or credential is added outside `compose.yaml`, `.env.example` and docs. `scripts/check_diff_hygiene.py` passes (P3, P10).
8. The CI `stack` job passes on the PR head commit, and all existing jobs stay green.

## Test plan
| AC | Type | What it proves |
| --- | --- | --- |
| 1, 2, 5 | CI `stack` job + `docker compose config` check | Clean boot, health, persistence, loopback-only ports, pinned images |
| 3 | pytest `scripts/tests/test_dev_reset.py` (injected runner) | Reset requires exact confirmation; wrong input does nothing |
| 4 | Manual run, output pasted in handoff | Clear failure without `.env` |
| 6 | Manual run on Phil's machine (native PostgreSQL on 5432), output pasted | Port override works where it matters |
| 7 | `check_diff_hygiene.py` in CI | No hard-coded hosts or credentials |
| 8 | CI run link | Pipeline green |

## Dependencies
- Docker Compose v2, already required by T0002.
- `postgres:16.x` and `redis:7.4.x` images, exact patch tags chosen at implementation and recorded with their digests in the handoff.
- No new Python or npm packages.

## Risks and open questions
1. **Addition beyond T0002: host-port overrides.** On Phil's computer, a native PostgreSQL service already listens on 5432. Claude found this on 2026-11-18. With fixed ports, AC1 cannot pass on that machine. The four `KHONDI_*_PORT` variables are local-only and touch no app code. **Merging this spec approves them.**
2. **No hot reload in T0004.** T0003's Dockerfiles build production images, so a code change needs `docker compose up --build`. T0004 measures that rebuild time on Phil's machine and records it in `local-setup.md`. If it's too slow, a separate dev overlay (bind mounts + dev targets) goes to Phil as a new Gate 1 item rather than slipping in here.
3. **OneDrive.** The clone currently sits under OneDrive. Build contexts there are slower, and OneDrive can lock files. The setup doc recommends cloning into the WSL 2 file system and measures both.

## Size
About 250–350 changed lines: compose ~90, reset script + tests ~110, docs ~90, CI ~40, parity rows ~5.

## Approval request
Phil, please approve spec **v1** of T0004 by merging this spec PR. Merging is the Gate 1 approval. It also approves the host-port overrides in Risks 1.

Implementation starts only after **both** this PR and PR #52 (T0003) are merged. Claude implements on its own branch and worktree. Codex reviews, and you merge (Gate 2). Nothing here touches Azure.
