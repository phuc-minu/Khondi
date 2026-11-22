# T0005 · PostgreSQL, migrations and recovery · Spec

| Field | Value |
| --- | --- |
| Task | T0005-postgres-migrations |
| Step | 1 · Spec (Gate 1 proposal; design in T0002 v1, one addition flagged below) |
| Author | Claude (architect) |
| For | Phil (approval by merging), then Claude as DevOps (implementation), with Codex as independent reviewer |
| Date (UTC) | 2026-11-21 00:35 |
| Spec version | v1 |
| Related | [T0002 v1](../T0002-local-infra-azure-parity/01-spec.md) row T0005, P4, P5, P6, AC 2 and 6; issue #33; T0003 (merged, #52); T0004 (#64, in review) |

## Goal
Give Khondi a real way to change its database schema:
- SQLAlchemy and Alembic migrations;
- a one-off `migrate` job that runs before the api starts and never inside it;
- a tested backup-and-restore path.

The same code must work unchanged against Azure PostgreSQL over TLS.

## Context
- **Approved in T0002 v1.** The T0005 row covers SQLAlchemy and Alembic, a `migrate` service (P6), a TLS-URL test (P4), and a backup and restore smoke test with `pg_dump`/`pg_restore`.
- **Issue #33** also asks for database user permissions. Those are flagged below as an addition.
- **On `main` from T0003:**
  - `khondi_api/settings.py` holds `DATABASE_URL` as a `SecretStr`.
  - `khondi_api/connections.py` has `postgres_options()`, which turns `?sslmode=require` into asyncpg's `ssl=True`.
  - `/readyz` checks PostgreSQL with asyncpg directly.
  - T0003's spec says "T0005 adds SQLAlchemy".
- **From T0004 (#64, not merged yet):** `compose.yaml` with the `postgres:16.16` service, the `khondi-pgdata` volume and the CI `stack` job. **T0005 starts only after #64 merges.**
- **Roles:** Claude implements as DevOps, and Codex reviews (owner decision, 2026-11-20). Phil merges.

## Scope
**In scope**
1. **Database module `backend/khondi_api/db.py`:**
   - `class Base(DeclarativeBase)`. It's the metadata Alembic compares against; domain tables arrive with feature work (#2).
   - `def make_engine(url: PostgresDsn) -> AsyncEngine`:
     - change the scheme to `postgresql+asyncpg`;
     - drop the `sslmode` query parameter, which asyncpg doesn't accept;
     - pass `connect_args=dict(postgres_options(url))`, reusing T0003's function so TLS logic lives in one place (Q11, P4);
     - set `pool_pre_ping=True`.
2. **Migrations inside the package**, so the existing api image can run them without a Dockerfile change (P1):
   - `backend/khondi_api/migrations/env.py`: async Alembic environment using `make_engine` and `Base.metadata`. The URL comes only from `MIGRATIONS_DATABASE_URL` (see item 5).
   - `backend/khondi_api/migrations/script.py.mako` and `versions/0001_baseline.py`. The baseline revision records the starting point and has no schema objects. Its `upgrade`/`downgrade` bodies hold a docstring saying so, not `pass` (Q4).
   - `backend/khondi_api/migrate.py`: `python -m khondi_api.migrate` builds the Alembic `Config` in code (`script_location = khondi_api:migrations`) and runs `upgrade head`. It exits non-zero with a named, secret-free error if the URL is missing or invalid (P2, P10).
   - `backend/alembic.ini`: for developers only (`alembic revision --autogenerate` from `backend/`). It holds no URL and points at the same script location.
3. **Compose `migrate` service:**
   - same build as `api`, command `python -m khondi_api.migrate`, `restart: "no"`;
   - environment: `ENVIRONMENT`, `MIGRATIONS_DATABASE_URL`;
   - `depends_on: postgres: service_healthy`.

   `api` adds `depends_on: migrate: condition: service_completed_successfully` (P6). The api never runs migrations at startup.
4. **Backup and restore**, documented in `docs/infra/local-setup.md` and exercised by CI:
   - Backup: `docker compose exec -T postgres pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB" > khondi.dump`.
   - Restore: `docker compose exec -T postgres pg_restore --clean --if-exists -U … -d … < khondi.dump`.

   `*.dump` is added to `.gitignore`.
5. **Least-privilege database roles (addition, see Risks 1):**
   - **Owner role:** the existing `POSTGRES_USER` (`khondi`) owns the schema and is used **only** by `migrate`, through `MIGRATIONS_DATABASE_URL`.
   - **App role:** `khondi_app`, created on first start of an empty volume by `infra/postgres/init/10-app-role.sh`, mounted into `/docker-entrypoint-initdb.d`. Its password comes from `POSTGRES_APP_PASSWORD`.
     - `LOGIN` and `CONNECT` on the database, and `USAGE` on `public`.
     - Default privileges from `khondi`: `SELECT, INSERT, UPDATE, DELETE` on tables and `USAGE, SELECT` on sequences.
     - **No** `CREATE` and no ownership.
   - **`DATABASE_URL`** (api) changes to use `khondi_app`.
   - **`.env.example`** gains `MIGRATIONS_DATABASE_URL` and `POSTGRES_APP_PASSWORD` (local values only).
6. **Tests:**
   - Unit (`backend/tests/test_db.py`), all through public functions:
     - `make_engine` URL and driver;
     - `sslmode=require` → `connect_args == {"ssl": True}`, with `sslmode` removed from the URL (P4);
     - plain URL → no `ssl`;
     - `migrate` with a missing or invalid URL exits non-zero without the URL text in output.
   - Integration (`@pytest.mark.integration`, CI backend job's PostgreSQL), against a fresh database:
     - running `upgrade head` twice leaves `alembic_version` at head, with the second run reporting no new revisions;
     - starting the api app (`TestClient` lifespan) against a database with no `alembic_version` does **not** create it (P6).
7. **CI `stack` job** (extends T0004's job; no other job changes, Q16):
   - after `up --wait`, `migrate` exited 0 and `alembic_version` = `0001_baseline`;
   - `docker compose run --rm migrate` again exits 0 with no change (T0002 AC6);
   - as `khondi_app`, `CREATE TABLE` fails with `permission denied` and `SELECT 1` works;
   - the T0004 persistence row is backed up with `pg_dump -Fc`, the table is dropped, it's restored with `pg_restore`, and the row is read back.
8. **`docs/infra/azure-parity.md` (P12):**
   - `migrate` → Container Apps Job, manual trigger;
   - `MIGRATIONS_DATABASE_URL` → Key Vault secret used only by that job;
   - `khondi_app` → a Flexible Server role created by the T0009 runbook;
   - `POSTGRES_APP_PASSWORD` → local only;
   - backups → Flexible Server automatic backups.

**Out of scope**
- Domain tables and models (#2).
- Replacing `/readyz`'s asyncpg check with SQLAlchemy. It works and is T0003's code (Q3).
- Worker (T0006), telemetry (T0007), Compose-wide integration tests and Playwright (T0008).
- Azure (T0009).
- Scheduled or automatic local backups. Backup is a documented manual command.

## Acceptance criteria
1. On a fresh clone with `.env` from `.env.example`, `docker compose up --wait --build` runs `migrate` to completion before `api` starts. `alembic_version` holds `0001_baseline`, and `/readyz` returns 200.
2. Running `migrate` a second time exits 0 and makes no change (T0002 AC6).
3. The api never runs migrations: starting it against an un-migrated database leaves no `alembic_version` table (P6).
4. Given `DATABASE_URL` or `MIGRATIONS_DATABASE_URL` ending in `?sslmode=require`, `make_engine` produces asyncpg `connect_args` with `ssl=True` and a URL without `sslmode` (P4).
5. With `MIGRATIONS_DATABASE_URL` missing or invalid, `python -m khondi_api.migrate` exits non-zero, names the variable and never prints its value (P2, P10).
6. The api connects as `khondi_app`, which can read and write data but cannot create or drop tables.
7. A `pg_dump -Fc` backup restored with `pg_restore` brings back a dropped table with its rows.
8. Backend CI (ruff, `mypy --strict`, pytest ≥85 % coverage) and the extended `stack` job pass on the PR head commit, and diff hygiene passes.

## Test plan
| AC | Type | What it proves |
| --- | --- | --- |
| 1, 2, 6, 7 | CI `stack` job steps | Order, idempotence, least privilege, backup/restore against the real Compose stack |
| 2, 3 | pytest integration (CI backend job PostgreSQL) | Idempotent upgrade; startup never migrates |
| 4, 5 | pytest unit | TLS options without Azure; fail-fast without leaking the URL |
| 8 | CI run link | Pipeline green |

## Dependencies
- `sqlalchemy[asyncio]` and `alembic`, pinned exactly at implementation (current: SQLAlchemy 2.1.9, Alembic 1.20.1). Both MIT. Approved in T0002 "Dependencies". Reasons and licenses go in the handoff (Q12).
- No new images. The init script runs inside `postgres:16.16`.

## Risks and open questions
1. **Addition beyond T0002: least-privilege roles.** Issue #33 asks for database user permissions, but T0002's T0005 row doesn't mention them. Without this, the api connects as the database owner and could drop tables. The change adds two variables (`MIGRATIONS_DATABASE_URL`, `POSTGRES_APP_PASSWORD`) and one init script, and it mirrors how Azure Flexible Server is normally run (admin for migrations, app role for the service). **Merging this spec approves it.** Alternative: keep one owner role now and defer roles to T0009.
2. **Init scripts run only on an empty volume.** Anyone who already ran T0004 needs `python scripts/dev-reset.py` once to get the app role. `local-setup.md` will say so. Without it, the api fails `/readyz` with an authentication error, so the failure is visible, not silent.
3. **Empty baseline.** `0001_baseline` creates no tables. It exists so idempotence, ordering and backup can be proven now. The first real tables come with #2 as new revisions.
4. **Local backups are manual.** In Azure, Flexible Server backs up automatically.

## Size
About 350–400 changed lines, excluding `uv.lock`:
- `db.py` + `migrate.py` + migrations: ~110
- tests: ~120
- compose + init script: ~45
- CI: ~30
- docs + parity: ~50

If it grows past 400, the backup/restore CI step and docs split into a follow-up PR (Q2).

## Approval request
Phil, please approve spec **v1** of T0005 by merging this spec PR. Merging is the Gate 1 approval, and it includes the least-privilege roles in Risks 1. If you'd rather defer the roles, request changes and I'll remove item 5 and AC6.

Implementation starts after this PR and #64 (T0004) are merged. Claude implements, Codex reviews, and you merge. Nothing here touches Azure.
