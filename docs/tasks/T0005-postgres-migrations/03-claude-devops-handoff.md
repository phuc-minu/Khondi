# T0005 · PostgreSQL, migrations and recovery · Claude (DevOps) → Codex handoff

| Field | Value |
| --- | --- |
| Task | T0005-postgres-migrations |
| Step | 3 · Implementation handoff |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (independent code review and QA) |
| Date (UTC) | 2026-11-21 01:45 |
| Branch | `claude/T0005-postgres-migrations` (stacked on `claude/T0004-compose-stack` at `ecced94`) |
| Commit reviewed | `670ec64` (implementation; this file is added in the next commit) |
| PR | Draft, opened with this file; base is the T0004 branch until #64 merges |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

## What changed
Schema changes now go through Alembic revisions. A one-off `migrate` job applies them before the api starts. The api never migrates, and it now connects as `khondi_app`, a role that can read and write data but can't change the schema. Backup and restore with `pg_dump`/`pg_restore` is documented and tested in CI.

| File | Why |
| --- | --- |
| `backend/khondi_api/db.py` (new) | `Base` (the metadata Alembic compares against). `async_url()` switches to `postgresql+asyncpg` and drops only `sslmode`, keeping other query parameters. `make_engine()` passes TLS through T0003's `postgres_options()`, so TLS logic stays in one place (P4, Q11). |
| `backend/khondi_api/settings.py` | `MigrationSettings` (`ENVIRONMENT`, `MIGRATIONS_DATABASE_URL`), built the same way as `Settings`: `hide_input_in_errors`, and a DSN error naming the variable `from None`. |
| `backend/khondi_api/migrate.py` (new) | `python -m khondi_api.migrate` builds the Alembic config in code (`khondi_api:migrations`), so the runtime image needs no Dockerfile change (P1). A missing or invalid setting exits 2 and names it, without the value (P2, P10). |
| `backend/khondi_api/migrations/` (new) | Async `env.py` (offline mode refused with a clear message); `script.py.mako` with typed headers; `versions/0001_baseline.py`, with no schema objects and docstring bodies (Q4). |
| `backend/alembic.ini` (new) | For developers running `alembic revision` from `backend/`. It contains no URL. |
| `backend/pyproject.toml`, `uv.lock` | `sqlalchemy[asyncio]==2.1.9` and `alembic==1.20.1`. The lock adds greenlet, Mako and MarkupSafe. |
| `backend/tests/test_db.py`, `test_migrate.py` (new) | Unit tests: URL/driver, `sslmode=require` → `connect_args={"ssl": True}`, plain URL has no TLS, missing or invalid URL exits 2 without echoing it. Integration tests, each on a throwaway database created on the CI PostgreSQL service: upgrade twice is idempotent; api startup leaves no `alembic_version` (P6). |
| `compose.yaml` | `migrate` service (api build, `restart: "no"`). `api` waits on `migrate: service_completed_successfully`. `postgres` mounts `infra/postgres/init` read-only and gets `POSTGRES_APP_PASSWORD`. |
| `infra/postgres/init/10-app-role.sh` (new, mode 755) | Creates `khondi_app` with: LOGIN, CONNECT, USAGE on `public`, and default privileges from the owner (SELECT/INSERT/UPDATE/DELETE on tables, USAGE/SELECT on sequences). No CREATE. Values arrive as psql variables (`:'app_password'`), never interpolated into the SQL. |
| `.gitattributes` (new) | `*.sh text eol=lf`, so a Windows checkout can't break the init script with CRLF. |
| `.env.example` | `DATABASE_URL` now uses `khondi_app`; adds `MIGRATIONS_DATABASE_URL` and `POSTGRES_APP_PASSWORD` (local values only). |
| `.gitignore` | `*.dump`. |
| `.github/workflows/quality.yml` | `stack` job only (Q16), three new steps: migrate exited 0 with `alembic_version` = `0001_baseline` and a re-run changes nothing; the api's own `DATABASE_URL` is `khondi_app` and `CREATE TABLE` raises `InsufficientPrivilegeError`; a `pg_dump -Fc` → `DROP TABLE` → `pg_restore` round trip brings back the T0004 row. |
| `docs/infra/local-setup.md`, `azure-parity.md` | Migrations, roles, backup/restore, the one-time reset for existing volumes, and troubleshooting. P12 rows for `migrate`, `khondi_app`, backups, `MIGRATIONS_DATABASE_URL` and `POSTGRES_APP_PASSWORD`. |

## Acceptance criteria
| # | Criterion (spec v1) | Done? | Where |
| --- | --- | --- | --- |
| 1 | `migrate` completes before api; `alembic_version` = baseline; `/readyz` 200 | yes (locally); CI pending | compose; CI `stack`; output below |
| 2 | Second `migrate` exits 0 with no change | yes | `test_upgrade_is_idempotent`; CI `stack`; output below |
| 3 | Api startup never migrates | yes | `test_api_startup_never_migrates` |
| 4 | `sslmode=require` → `ssl=True`, `sslmode` removed | yes | `test_db.py` |
| 5 | Missing or invalid URL exits non-zero, names it, no value | yes | `test_migrate.py` (2 tests) |
| 6 | Api connects as `khondi_app`; can read and write, cannot create or drop tables | yes (locally); CI pending | CI `stack`; output below |
| 7 | `pg_dump` + `pg_restore` restores a dropped table with rows | yes (locally); CI pending | CI `stack`; output below |
| 8 | Backend CI + extended `stack` job pass on head; hygiene passes | **not yet** (local backend checks and hygiene pass) | CI on the PR head |

## Commands run and real output
Environment: the owner's Windows 11 machine, Docker Desktop 29.2.0 (Linux engine).
- **Backend checks:** run in `ghcr.io/astral-sh/uv:0.6.14-python3.12-bookworm-slim`, sharing a network namespace with `postgres:16` and `redis:7.4`, which mirrors the CI backend job. Env: `ENVIRONMENT=ci`, `DATABASE_URL=postgresql://khondi:khondi@localhost:5432/khondi_test`, `REDIS_URL=redis://localhost:6379/0`.
- **Stack checks:** Compose project `khondi-t0005qa`, with `.env` = `.env.example` + `KHONDI_PG_PORT=5433` (the native PostgreSQL holds 5432).

```text
$ uv sync --frozen && uv run ruff check . && uv run ruff format --check . && uv run mypy --strict .
All checks passed!
13 files already formatted
Success: no issues found in 13 source files

$ uv run pytest            # CI env, real PostgreSQL 16 + Redis 7.4
khondi_api/migrations/env.py                         19      1    95%
khondi_api/migrations/versions/0001_baseline.py       7      0   100%
khondi_api/settings.py                               35      2    94%
TOTAL                                               150      4    97%
Required test coverage of 85% reached. Total coverage: 97.33%
23 passed, 3 warnings in 6.90s

$ ruff check scripts && ruff format --check scripts && mypy --strict scripts && pytest -q scripts/tests
4 files already formatted
Success: no issues found in 4 source files
51 passed in 0.05s

$ python scripts/check_diff_hygiene.py origin/claude/T0004-compose-stack
Diff hygiene: no violations.

$ docker compose -p khondi-t0005qa up --wait --build                          # AC1
up exit=0 57s
SERVICE    STATE     STATUS
api        running   Up 12 seconds (healthy)
migrate    exited    Exited (0) 13 seconds ago
postgres   running   Up 21 seconds (healthy)
redis      running   Up 21 seconds (healthy)
web        running   Up 6 seconds (healthy)
migrate exit code: 0
alembic_version: 0001_baseline
{"status":"ready"} [200]

$ docker compose run --rm migrate                                               # AC2
exit=0 version=0001_baseline rows=1

$ docker compose exec -T api python -c "...asyncpg.connect(DATABASE_URL)..."    # AC6
current_user: khondi_app
select 1: 1
create table denied: permission denied for schema public
app read back: from-app            # INSERT/SELECT by khondi_app into a table the owner created

$ pg_dump -Fc > dump; DROP TABLE t0005_rw; pg_restore --clean --if-exists < dump # AC7
dump bytes=3453
after drop:
restore exit=0
after restore: from-app
```

## Quality rules self-check
- **Q1, Q3:** spec only. `/readyz` still uses asyncpg (T0003 code, out of scope).
  - The T0004 `stack` job's `psql` line was joined into one long line when T0004 was written. It's valid shell and not touched here; noted for the T0004 review.
- **Q2:** +439 lines excluding `uv.lock`: 104 in `test_migrate.py`, 38 in `test_db.py`, 26 in the approval record.
  - The spec says to split backup/restore into a follow-up past 400. Doing that would remove about 18 lines, leave the PR over 400, and leave AC7 untested. **Codex: your call.**
- **Q4:** the baseline's bodies are docstrings explaining they're empty by design. No `pass`, no TODO.
- **Q5:** `alembic.ini` is the developer entry point named in the spec. `async_url` is used by `make_engine` and its tests.
- **Q6:**
  - `migrate.main` catches `ValidationError`/`ValueError` from settings only, reports them and exits 2.
  - Migration and database errors propagate, so the job fails with a non-zero exit.
  - The integration fixture always drops its database in `finally`.
- **Q7, Q8:** typed settings at the edge. `mypy --strict` is clean. The only suppressions are `# type: ignore[call-arg]` with the reason "fields come from env", the same pattern as T0003's `get_settings()`.
- **Q9:** every behavior above has a test that fails without it. Compose behavior is covered by the CI `stack` job.
- **Q10:** output above is real. CI is not run yet.
- **Q12:** see "New dependencies".
- **Q14:** `migrate` writes errors to `sys.stderr`. No `print`.
- **Q15:** `.env.example` holds local values only.
- **Q16:** only the `stack` job changed. `ruff`/`mypy`/coverage settings are unchanged.

## New dependencies
| Package | Version | Why | Alternatives | License |
| --- | --- | --- | --- | --- |
| `sqlalchemy[asyncio]` | 2.1.9 | Engine and metadata for Alembic; ADR-001 persistence layer | Raw asyncpg plus hand-written SQL migrations: no autogenerate, more custom code | MIT |
| `alembic` | 1.20.1 | Versioned, idempotent migrations (P6) | yoyo, hand-rolled scripts: weaker SQLAlchemy integration | MIT |
| (transitive) `greenlet` 3.5.6, `Mako` 1.4.3, `MarkupSafe` 3.0.4 | lockfile | Required by SQLAlchemy async and Alembic templates | — | MIT, MIT, BSD-3-Clause |

## Deviations from the spec
- None in behavior.
- Size is over the spec's 400-line split threshold, explained under Q2.

## Risks and known limits
- **Existing local volumes need one reset.** On a T0004 volume, `khondi_app` doesn't exist, so `/readyz` fails with an authentication error until `scripts/dev-reset.py` is run (documented).
- **Init scripts only run on an empty volume.** Changing `POSTGRES_APP_PASSWORD` later needs a reset or a manual `ALTER ROLE`.
- **Autogenerate hasn't been exercised yet.** The baseline has no tables, so the first real revision (#2) is its first use.
- **Restore uses `--clean --if-exists`.** It replaces objects in the dump. Documented.

## Follow-ups (not in this PR)
1. Switch `/readyz` to the SQLAlchemy engine if feature work wants one connection path (T0003 code, needs its own task).
2. In T0009, create `khondi_app` and its Key Vault secret in Azure, as the parity row says.
