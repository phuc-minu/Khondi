# T0008 · Integration tests and Playwright · Spec

| Field | Value |
| --- | --- |
| Task | T0008-integration-tests |
| Step | 1 · Spec (Gate 1 proposal; design in T0002 v1, four additions flagged below) |
| Author | Claude (architect) |
| For | Phil (approval by merging), then Claude as DevOps (implementation), with Codex as independent reviewer |
| Date (UTC) | 2026-11-22 18:40 |
| Spec version | v1 |
| Related | [T0002 v1](../T0002-local-infra-azure-parity/01-spec.md) row T0008, P3, P10, AC 1, 2, 6, 7, 8; issue #37; T0011 (Playwright harness, Codex); T0004–T0007 (stack checks in CI) |

## Goal
T0002 row T0008: "pytest integration tests against Compose services, Playwright smoke test driven by `BASE_URL`, traces and screenshots on failure, CI parity."

When this task is done, one set of commands checks the running stack, and it is the same on Phil's computer and in CI:
1. `docker compose up --wait --build`
2. `uv run pytest -m stack` in `backend/` (the stack suite)
3. `npx playwright test -c playwright.stack.config.ts` in `frontend/`, with `BASE_URL` set (the stack smoke test)

## Context
- **The stack checks exist, but only inside CI.**
  - T0004–T0007 added ten check steps to the CI `stack` job: port binding, health, migrations, the database role, data persistence, backup and restore, worker restart, trace carry-through, Tempo/Loki, and collector outage.
  - About 210 of those lines are inline shell and Python in `.github/workflows/quality.yml`.
  - None of them can be run locally as they are, and a failure points at a YAML line, not a test.
- **Backend tests** already use an `integration` marker for tests that need the CI backend job's PostgreSQL and Redis service containers. Those don't touch Compose.
- **T0011 owns the Playwright harness.** It adds `frontend/playwright.config.ts` (with `webServer`, `BASE_URL`, `trace: "retain-on-failure"`, `screenshot: "only-on-failure"`), `@playwright/test`, `@axe-core/playwright`, `npm run e2e` and the CI `e2e` job. Its spec says: "T0008 will extend this harness for Compose through `BASE_URL`. Don't add Compose logic here." T0011 is not started yet.
- **Issue #37's flow** ("smoke flow loads web, calls FastAPI, verifies fixture itinerary and saves") assumes the planner, replay fixtures and saved trips. None of those exist yet: issue #2 builds them. See Addition 4.
- **Merge state.** T0005 is on its way to `main` (#74). T0006 and T0007 (#68, #72, #73) are approved but not merged.

## Design

### Where things live
```text
backend/tests/stack/            pytest suite, marker "stack", talks to the running Compose stack
  conftest.py                   StackSettings (URLs from the environment), Compose helper, fixtures
  test_health.py                T0004
  test_postgres.py              T0005
  test_worker.py                T0006
  test_telemetry.py             T0007
frontend/playwright.stack.config.ts   smoke config: no webServer, BASE_URL required
frontend/e2e-stack/smoke.spec.ts      smoke test against the running stack
```

### Stack suite (pytest)
- **Marker `stack`.** `backend/pyproject.toml` adds the marker and `-m "not stack"` to `addopts`.
  - The CI backend job's command is unchanged, so it keeps running every other test with the same 85 % coverage gate. It doesn't run these tests, because they need a running stack.
  - The stack suite is run with `uv run pytest -m stack --no-cov`. A later `-m` overrides the one in `addopts`. It measures behavior, not coverage.
- **Addresses come from the environment (P3, P10).** `StackSettings` (pydantic-settings) requires:
  - `STACK_API_URL`, `STACK_WEB_URL`, `STACK_GRAFANA_URL`;
  - `STACK_DATABASE_URL`, the schema owner on the published PostgreSQL port.

  No hostnames or ports appear in the tests. `local-setup.md` gives the local values, and CI sets the same names.
- **Compose helper.** Tests that need a container command (`pg_dump`, `psql`, stopping the worker or the collector) call `docker compose` through one small helper that names the project (`--project-name khondi`, as `dev-reset.py` does since T0004 rework r1).
- **Safe on a developer's stack:**
  - Tests create and remove only their own objects: tables named `t0008_*`, job IDs starting `t0008-`, and the scratch database below.
  - Running the suite twice in a row passes.
  - The suite restarts services (whole stack down and up, worker, collector) but never removes volumes.
  - `local-setup.md` says this plainly.
- **Mapping.** Every existing CI check moves 1:1, with the same or stricter assertions (Q16):

  | Current CI step | Becomes |
  | --- | --- |
  | Ports bind to 127.0.0.1 only and images use exact tags | **stays** a CI step (it checks `compose.yaml`, not the running stack) |
  | Health and readiness | `test_health.py` |
  | Migrations ran before the api and are idempotent (T0005) | `test_postgres.py` |
  | The api's database role cannot change the schema (T0005) | `test_postgres.py` |
  | Data survives down and up | `test_postgres.py` |
  | Backup and restore with pg_dump / pg_restore (T0005) | `test_postgres.py` (see Addition 2) |
  | A worker restart mid-job stops in time and reruns the job (T0006) | `test_worker.py` |
  | A job queued by the api carries the caller's trace ID to the worker (T0006) | `test_worker.py` |
  | One trace from web to worker reaches Tempo and Loki … (T0007) | `test_telemetry.py` |
  | Requests and jobs still succeed with the collector stopped (T0007) | `test_telemetry.py` |
  | `pull`, `up --wait --build`, logs on failure, `down --volumes` | **stay** CI steps (they set up and tear down; the suite assumes a running stack) |

### Stack smoke test (Playwright)
- **`frontend/playwright.stack.config.ts`**, separate from T0011's config so neither leaks into the other:
  - no `webServer`;
  - `use.baseURL` from `BASE_URL`, and the config throws if it is unset, so it can't silently test the wrong app;
  - `testDir: "e2e-stack"`;
  - one Chromium desktop project;
  - `trace: "retain-on-failure"`, `screenshot: "only-on-failure"`;
  - reporter list plus HTML into `playwright-report-stack/`.

  T0011's config keeps `testDir: "e2e"`, so the `e2e` job never picks up this test.
- **`e2e-stack/smoke.spec.ts`:**
  1. Open `/`; check the page title is "Khondi" and a `main` landmark exists (both from T0011); check no console errors.
  2. With a `traceparent`, `POST /api/diagnostics/echo` through the page's request context; check 202 and a `job_id`. That is web → api through the real stack.

  It needs no code change to target another URL (T0002 AC 8). The implementation PR proves that by running it against `KHONDI_WEB_PORT=3010` as well as 3000.

### CI (`stack` job only; no other job changes, Q16)
After `docker compose up --wait --build`:
1. `astral-sh/setup-uv@v6`, then `uv sync --frozen` in `backend/`, then `uv run pytest -m stack --no-cov` with the `STACK_*` variables. Their values are the `.env.example` defaults on `127.0.0.1`.
2. `actions/setup-node@v4` (Node 22, npm cache), `npm ci`, `npx playwright install --with-deps chromium`, then `npx playwright test -c playwright.stack.config.ts` with `BASE_URL=http://127.0.0.1:3000`.
3. On failure, upload `frontend/playwright-report-stack/` and `frontend/test-results/` (Playwright traces and screenshots), plus `docker compose logs` saved to a file, as artifacts.

The job's `timeout-minutes` stays 15. If the measured run needs more, the PR says so and asks; it doesn't change it silently (Q16).

### PRs
1. **Suite framework and the T0004/T0005 checks:**
   - marker and `addopts`, `conftest.py`;
   - `test_health.py`, `test_postgres.py`;
   - CI: setup-uv, the pytest step, and the five moved steps removed;
   - docs.
2. **The T0006/T0007 checks:** `test_worker.py` and `test_telemetry.py`; CI: the four moved steps removed.
3. **The Playwright stack smoke test:** config, test, CI node and Playwright steps, artifacts, docs.

PR 1 and PR 2 start after #74, #68, #72 and #73 merge to `main`. PR 3 also needs T0011 merged, because it reuses T0011's `@playwright/test`. If T0011 hasn't merged by then, PR 3 waits; it doesn't add the dependency itself.

## Additions beyond T0002's row (flagged for Gate 1)
1. **The CI stack checks move into pytest.** T0002 asks for "pytest integration tests against Compose services" and "CI parity". That's only possible if the checks live in a suite that runs anywhere, not in workflow YAML. Every assertion moves with it (mapping above), and the handoffs show each old step next to its new test.
2. **Backup and restore goes into a scratch database.** Today's CI step restores with `--clean` into the live `khondi` database. On a developer's stack that would replace whatever changed since the dump. The test instead:
   - dumps `khondi`;
   - restores it into a new database `t0008_restore_check`;
   - checks its own table and row are there;
   - drops the scratch database.

   It still proves `pg_dump` and `pg_restore` work. It no longer proves a restore over existing data, which the T0005 docs show as a manual command.
3. **`-m "not stack"` in `addopts`.** It changes which tests the backend job collects, not how strict the job is. Without it, the backend job would try to reach a stack that isn't running.
4. **#37's itinerary and save checks are deferred to #2.** There is no planner, fixture itinerary or save yet, so the smoke test checks what exists: the page loads, and web reaches the api. Issue #2's first planner task extends `smoke.spec.ts` with the itinerary and save steps. Merging this spec accepts that #37 closes with those two checks deferred.

## Acceptance criteria
1. With the stack started by `docker compose up --wait --build` from a fresh `.env.example`, `uv run pytest -m stack --no-cov` passes locally and in CI, with the same variable names (T0002 AC 1, 2, 6, 7).
2. Each check in the current `stack` job exists as a test with the same or stricter assertions, and the `stack` job holds no inline Python.
3. The backend job's command, coverage gate and test results are unchanged, and it doesn't collect `stack` tests.
4. Running the stack suite twice in a row passes, and it leaves no `t0008_*` table, `t0008-` job or `t0008_restore_check` database behind.
5. `npx playwright test -c playwright.stack.config.ts` passes with `BASE_URL` pointing at the local web on port 3000, and on port 3010 with no code change (T0002 AC 8). It fails at start-up if `BASE_URL` is unset.
6. When a stack test or the smoke test fails in CI, the run has artifacts with the Playwright trace and screenshot and the Compose logs.
7. `docs/infra/local-setup.md` gives the three commands, in Git Bash and PowerShell forms, the one-time `npx playwright install chromium`, the `STACK_*` values, and what the suite restarts.
8. CI passes on each PR's head commit, and diff hygiene passes.

## Test plan
| AC | How it is shown |
| --- | --- |
| 1, 2, 4 | Local run output, twice, pasted in the handoff; CI `stack` job; a side-by-side list of each removed CI step and its test |
| 3 | Backend job log: same command, the same test count as the PR's base plus 0, coverage ≥ 85 % |
| 5 | Local runs on 3000 and 3010 pasted in the handoff; a run with `BASE_URL` unset showing the start-up error |
| 6 | One deliberately failing run on a throwaway branch, with links to its artifacts, before the PR is opened |
| 7, 8 | Review against the docs; CI run links |

Every test must fail without the behavior it checks (Q9). The handoff shows a failing run for each new test file, for example with the service it depends on stopped.

## Dependencies
No new packages:
- the stack suite uses `pytest`, `httpx`, `asyncpg`, `redis` and `arq`, already in `backend/`;
- the smoke test uses T0011's `@playwright/test`.

CI uses `astral-sh/setup-uv@v6` and `actions/setup-node@v4`, which the backend, frontend and e2e jobs already use.

## Risks and open questions
1. **The stack job gets slower.** It now installs uv, Node packages and Chromium. The estimate is about 2 minutes more, on top of today's 3. PR 3 measures it.
2. **Order with T0011.** PR 3 depends on Codex's T0011. If the website work changes `playwright.config.ts` later, the stack config stays separate on purpose.
3. **Developers' local data.** The suite restarts services and creates and drops its own objects only. It never runs `down --volumes` or `dev-reset.py`. A developer who wants an untouched stack shouldn't run it, and `local-setup.md` says so.
4. **Windows.** `docker compose` is called with argument lists, never through a shell string. The Playwright browser needs a one-time install.

## Size
Estimated changed lines:

| PR | Tests | CI (added / removed) | Config and docs | Total changed |
| --- | --- | --- | --- | --- |
| 1 | ~230 | +15 / −45 | ~40 | ~330 |
| 2 | ~230 | +0 / −180 | ~10 | ~420 |
| 3 | ~70 | +20 / 0 | ~30 | ~120 |

PR 2 counts its removed CI lines. Without them it is ~240.

## Approval request
Phil, please approve spec **v1** of T0008 by merging this spec PR. Merging is the Gate 1 approval, and it includes:
- moving the CI stack checks into the pytest `stack` suite (Addition 1);
- restoring into a scratch database (Addition 2);
- `-m "not stack"` in the backend's pytest options (Addition 3);
- deferring #37's itinerary and save checks to #2 (Addition 4);
- the three-PR split and its start conditions above.

Claude implements, Codex reviews, and you merge. Nothing here touches Azure.
