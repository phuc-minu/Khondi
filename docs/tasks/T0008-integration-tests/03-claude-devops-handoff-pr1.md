# T0008 · Integration tests and Playwright (PR 1 of 3) · Claude (DevOps) → Codex handoff

| Field | Value |
| --- | --- |
| Task | T0008-integration-tests |
| Step | 3 · Implementation handoff (PR 1: suite framework and the T0004/T0005 checks) |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (independent code review and QA) |
| Date (UTC) | 2026-11-23 03:00 |
| Branch | `claude/T0008-stack-suite`, from `main` at `4859343` |
| Commit reviewed | `dcf83d4` (implementation; this file is added in the next commit) |
| PR | Draft, opened with this file, base `main` |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

## What changed
Five of the CI `stack` job's inline check steps move into a pytest suite, `backend/tests/stack/`, which runs the same way against a developer's stack. CI now runs that suite in their place.

| File | Why |
| --- | --- |
| `backend/tests/stack/conftest.py` (new) | <ul><li>`StackSettings` (pydantic-settings, prefix `STACK_`): `api_url`, `web_url`, `database_url` (the schema owner). All required; no hosts or ports in the tests (P3, P10). `STACK_GRAFANA_URL` comes with PR 2, which uses it (Q5).</li><li>`Compose`: runs `docker compose --project-name khondi --file <repo>/compose.yaml …` with argument lists, never a shell string. A non-zero exit raises `ComposeError` with the command's stderr (Q6).</li><li>`Database`: `fetchval` / `execute` as the schema owner through asyncpg, with an optional database override for the scratch database.</li><li>Session fixtures `stack`, `compose`, `database`.</li></ul> |
| `backend/tests/stack/__init__.py` (new, empty) | Makes the suite a package, so its modules import as `stack.test_*`. Without it, PR 2's `test_worker.py` and `test_telemetry.py` would clash with the existing `tests/test_worker.py` and `tests/test_telemetry.py` (pytest's default import mode needs unique basenames). |
| `backend/tests/stack/test_health.py` (new) | `/healthz` 200; `/readyz` 200 with body `{"status": "ready"}`; web `/api/healthz` 200. |
| `backend/tests/stack/test_postgres.py` (new) | Migrations, the api's role, backup and restore, and persistence (mapping below). |
| `backend/pyproject.toml` | Marker `stack`; `-m "not stack"` added to `addopts` (spec Addition 3). |
| `.github/workflows/quality.yml` | `stack` job only. The five moved steps are removed. `astral-sh/setup-uv@v6` and a "Stack suite (T0004, T0005)" step are added in their place: `uv sync --frozen`, `uv run pytest -m stack --no-cov -v`, with the three `STACK_*` values from `.env.example`. Everything else is unchanged, including `timeout-minutes: 15`. |
| `docs/infra/local-setup.md` | New section "Checking the running stack": Git Bash and PowerShell commands, the `STACK_*` values, matching custom ports, and exactly what the suite restarts, creates and drops. The prerequisites now mention uv. |
| `docs/tasks/T0008-integration-tests/02-approval.md` | Gate 1 record. |

## Each removed CI step and its test (AC 2)
| Removed CI step | Test | Same or stricter |
| --- | --- | --- |
| Health and readiness: `curl --fail` on `/healthz`; `/readyz` body is exactly `{"status":"ready"}`; `curl --fail` on web `/api/healthz` | `test_api_is_alive`, `test_api_is_ready_with_postgres_and_redis`, `test_web_is_alive` | Same. Status 200 instead of "any 2xx", and the `/readyz` body is compared as JSON. |
| Migrations ran before the api and are idempotent: `migrate` exit code 0; `version_num` = `0001_baseline`; `run --rm migrate`; one row | `test_migrations_ran_before_the_api_and_are_idempotent` | Stricter. The expected version is the Alembic head from `alembic.ini`, not a literal, so a new migration that fails to apply fails the test. The version is also checked again after the second run. |
| The api's database role cannot change the schema: a Python heredoc inside the api container asserts `current_user` = `khondi_app` and that `CREATE TABLE` raises `InsufficientPrivilegeError` | `test_the_api_role_cannot_change_the_schema` | Same check, still inside the api container with the api's own `DATABASE_URL`. It now names the table `t0008_denied` and drops it afterwards if the check ever lets it through. |
| Data survives down and up: create `t0004_persist`, `down`, `up --wait`, read it back | `test_data_survives_down_and_up` | Same. The table is `t0008_persist`, dropped at the end. |
| Backup and restore: `pg_dump -Fc`, drop the table, `pg_restore --clean --if-exists` over the live database, read the table back | `test_a_backup_restores_into_a_new_database` | Changed as approved (Addition 2). It dumps `khondi`, restores into a new `t0008_restore_check` with `--exit-on-error`, checks its own table's row **and** the Alembic head in the restored copy, then drops the scratch database. The owner and database name come from `STACK_DATABASE_URL`. |

Unchanged CI steps: the port and image-tag check, `pull`, `up --wait --build`, the four T0006/T0007 steps (PR 2 moves them), logs on failure, and `down --volumes`.

## Acceptance criteria (PR 1 covers AC 1–4 and 7–8 for its checks; AC 5 and 6 are PR 3)
| # | Criterion (spec v1) | Done? | Where |
| --- | --- | --- | --- |
| 1 | `uv run pytest -m stack --no-cov` passes locally and in CI, same variable names | locally yes; CI not yet | Runs below; CI on the PR head |
| 2 | Each current check exists as a test, same or stricter; no inline Python left in the job | for PR 1's five steps yes | Table above. The T0006/T0007 steps, with their Python, go in PR 2. |
| 3 | Backend job unchanged; doesn't collect `stack` tests | yes | Collection below: 72 tests before and after; the 7 stack tests deselected |
| 4 | Two runs in a row pass; nothing `t0008_*` left | yes | Runs below |
| 7 | `local-setup.md`: commands in both shells, `STACK_*` values, what the suite restarts | for the pytest suite yes | The Playwright commands and the one-time browser install come with PR 3 |
| 8 | CI and hygiene pass on the head | hygiene yes; CI not yet | Below; CI on the PR head |

## Commands run and real output
Windows 11, Docker Desktop. `.env` from `.env.example`, plus `KHONDI_PG_PORT=5433` and `KHONDI_WEB_PORT=3010` in the shell, because a Windows PostgreSQL holds 5432 and a dev server holds 3000. So locally `STACK_WEB_URL=http://127.0.0.1:3010` and `STACK_DATABASE_URL` uses port 5433. This also shows the suite following custom ports without code changes. uv 0.9.5.

```text
$ docker compose up --wait --build
 Container khondi-migrate-1 Exited
 Container khondi-api-1 Healthy
 Container khondi-worker-1 Healthy
 Container khondi-web-1 Healthy
 Container khondi-lgtm-1 Healthy
```
**Run 1:**
```text
$ uv run pytest -m stack --no-cov -v
================ 7 passed, 72 deselected, 9 warnings in 43.54s ================
```
(The 9 warnings are the existing FastAPI `on_event` deprecations in `khondi_api/main.py`.)

**Run 2, straight after:**
```text
tests/stack/test_health.py::test_api_is_alive PASSED                     [ 14%]
tests/stack/test_health.py::test_api_is_ready_with_postgres_and_redis PASSED [ 28%]
tests/stack/test_health.py::test_web_is_alive PASSED                     [ 42%]
tests/stack/test_postgres.py::test_migrations_ran_before_the_api_and_are_idempotent PASSED [ 57%]
tests/stack/test_postgres.py::test_the_api_role_cannot_change_the_schema PASSED [ 71%]
tests/stack/test_postgres.py::test_a_backup_restores_into_a_new_database PASSED [ 85%]
tests/stack/test_postgres.py::test_data_survives_down_and_up PASSED      [100%]
====================== 7 passed, 72 deselected in 49.13s ======================
```
**Nothing left behind** (tables named `t0008%`, then databases named `t0008%`):
```text
$ docker compose exec -T postgres psql -U khondi -d khondi -tAc "SELECT string_agg(tablename, ',') FROM pg_tables WHERE tablename LIKE 't0008%'; SELECT count(*) FROM pg_database WHERE datname LIKE 't0008%';"

0
```
**Collection (AC 3):**
```text
$ uv run pytest --collect-only -q --no-cov            # what the backend job collects
72/79 tests collected (7 deselected) in 7.28s
$ uv run pytest --collect-only -q --no-cov -m stack
7/79 tests collected (72 deselected) in 2.33s
# without the addopts change, for comparison
79 tests collected in 2.78s
```
**Failing runs (Q9):**
1. `web` and `postgres` stopped (the persistence test excluded, because it starts the stack again):
   ```text
   E       AssertionError: {"status":"not_ready","failed":["postgres"]}
   FAILED tests/stack/test_health.py::test_api_is_ready_with_postgres_and_redis
   FAILED tests/stack/test_health.py::test_web_is_alive - httpx.ConnectError: [W...
   FAILED tests/stack/test_postgres.py::test_migrations_ran_before_the_api_and_are_idempotent
   FAILED tests/stack/test_postgres.py::test_the_api_role_cannot_change_the_schema
   FAILED tests/stack/test_postgres.py::test_a_backup_restores_into_a_new_database
   ================= 5 failed, 1 passed, 73 deselected in 16.61s =================
   ```
   The one pass is `test_api_is_alive`: liveness doesn't depend on PostgreSQL, by design.
2. `GRANT CREATE ON SCHEMA public TO khondi_app`, then the role test, then `REVOKE`:
   ```text
   E           AssertionError: assert 'khondi_app created' == 'khondi_app denied'
   FAILED tests/stack/test_postgres.py::test_the_api_role_cannot_change_the_schema
   ```
   Afterwards `has_schema_privilege('khondi_app','public','CREATE')` was `f` again and `t0008_denied` was gone, so the test's clean-up works when the check fails.
3. The persistence test with `down` temporarily changed to `down --volumes` (local edit, not committed; the volumes were ones this session had created):
   ```text
   E   asyncpg.exceptions.UndefinedTableError: relation "t0008_persist" does not exist
   FAILED tests/stack/test_postgres.py::test_data_survives_down_and_up - asyncpg...
   ```
4. `STACK_*` unset:
   ```text
   E       pydantic_core._pydantic_core.ValidationError: 3 validation errors for StackSettings
   ```

**Static checks** (`backend/`):
```text
$ uv run ruff check .
All checks passed!
$ uv run ruff format --check .
26 files already formatted
$ uv run mypy --strict .
Success: no issues found in 26 source files
$ python scripts/check_diff_hygiene.py origin/main
Diff hygiene: no violations.
$ gitleaks dir <the PR's diff saved as a file>       # zricethezav/gitleaks:v8.24.2
INF no leaks found
```
**CI on the PR head:** not run at the time of writing; the result goes in a PR comment.

**Not run locally:** the backend job's full `pytest --cov` with its PostgreSQL and Redis services. This PR changes no application code or existing test; CI runs that job on the head.

## Deviations
None from spec v1.

## Size
+326 / −49 across 8 files, including this PR's approval record. Tests 241 lines, CI +11/−46, docs and config 74. The spec estimated about 330 changed lines.

## Follow-ups (not in this PR)
- PR 2: `test_worker.py`, `test_telemetry.py`, `STACK_GRAFANA_URL`, and removing the four T0006/T0007 CI steps.
- PR 3: the Playwright stack smoke test, once T0011 merges.
