# T0004 · Compose stack and networking · Claude (DevOps) → Codex handoff

| Field | Value |
| --- | --- |
| Task | T0004-compose-stack |
| Step | 3 · Implementation handoff |
| Author | Claude (DevOps implementer; roles reassigned by the owner on 2026-11-20) |
| For | Codex (independent code review and QA) |
| Date (UTC) | 2026-11-20 17:20 |
| Branch | `claude/T0004-compose-stack` (stacked on `codex/T0003-service-skeletons-config` at `42bd16a`) |
| Commit reviewed | `f919a34421e79c909e2a43ab2eaf97b06b8e15d3` |
| PR | Draft, opened together with this file; base is the T0003 branch until #52 merges |
| State | `needs-claude-review` (for this task, the reviewer is Codex) |

## What changed
One `docker compose up --wait --build` now starts PostgreSQL, Redis, the api and the web from a fresh clone. Startup waits on health checks, and every port is reachable from this computer only.

| File | Why |
| --- | --- |
| `compose.yaml` (new) | The four services:<br>• `postgres:16.16` and `redis:7.4.12`, exact tags (P5, P11). Redis has no volume, because it is queue and cache only.<br>• api and web are built from the T0003 Dockerfiles for `linux/amd64` (P1, P11).<br>• Each service gets an explicit `environment:` list, never `env_file`, because api and web read different `PORT` values.<br>• Required variables use `${VAR:?…}`.<br>• Health checks: `pg_isready`, `redis-cli ping`, api `/readyz` through Python (the image has no curl), web `/api/healthz` through Node. `depends_on: service_healthy` sets the startup order.<br>• Ports are `127.0.0.1:${KHONDI_*_PORT:-default}:<container port>`.<br>• Named volume `khondi-pgdata`. |
| `.env.example` | Adds `POSTGRES_USER`/`PASSWORD`/`DB` (local values matching `DATABASE_URL`) and the four `KHONDI_*_PORT` variables, commented with their defaults. Existing lines are unchanged. |
| `scripts/dev-reset.py` (new) | Lists the `khondi` project's volumes and runs `docker compose -f <repo>/compose.yaml down --volumes --remove-orphans` only after `RESET` is typed exactly.<br>• `--yes-i-really-mean-it` skips the prompt.<br>• It exits 1 on any other answer or on EOF, and 2 if docker is missing.<br>• Docker failures are reported with their stderr and exit code (Q6).<br>• Docker is called through an injectable runner. |
| `scripts/tests/test_dev_reset.py` (new) | 13 tests through `main()` with a fake docker runner: exact confirmation, five wrong answers, EOF, the unattended flag, the project filter, no volumes, listing failure, compose failure, docker missing. |
| `.github/workflows/quality.yml` | New job `stack` (needs `images`; existing jobs unchanged, Q16):<br>• `jq` checks that every published port is `127.0.0.1` and every image tag is exact.<br>• `up --wait --build`.<br>• `/healthz`, `/readyz` == `{"status":"ready"}`, web `/api/healthz`.<br>• A row written with `psql` must survive `down` + `up`.<br>• Logs on failure; `down --volumes` always. |
| `docs/infra/local-setup.md` (new) | Prerequisites with measured RAM, disk and rebuild times; first run; ports and overrides; everyday commands; reset; troubleshooting (native PostgreSQL on 5432, Windows-containers mode, Docker Hub 429, OneDrive). |
| `docs/infra/azure-parity.md` | P12 rows: the volume maps to Flexible Server managed storage; `POSTGRES_*` and `KHONDI_*_PORT` are local-only. |
| `docs/tasks/T0004-compose-stack/02-approval.md` | Gate 1 record, role change and stacking. |

## Acceptance criteria
| # | Criterion (from spec v1) | Done? | Where |
| --- | --- | --- | --- |
| 1 | Fresh `.env` + `up --wait --build`, all healthy, `/readyz` 200 ready, web healthz 200, no paid keys | yes (locally); CI pending | `compose.yaml`; CI `stack`; output below |
| 2 | Data survives `down` + `up --wait` | yes (locally); CI pending | CI `stack` step "Data survives down and up"; output below |
| 3 | Reset deletes only after exact `RESET` | yes | `scripts/dev-reset.py`; `test_dev_reset.py`; real-docker abort run below |
| 4 | No `.env` fails before starting and names the variable | yes | output below |
| 5 | Ports `127.0.0.1` only, exact image tags | yes | CI `stack` `jq` step; output below |
| 6 | `KHONDI_PG_PORT=5433` works while 5432 is taken | yes | Run on the owner's machine with native `postgres` on 5432; output below |
| 7 | No hosts or credentials outside `compose.yaml`, `.env.example` and docs; hygiene passes | yes | output below |
| 8 | CI `stack` and all existing jobs pass on the head commit | **not yet** | CI runs when the PR opens; the reviewer must check the head-commit run |

## Commands run and real output
Environment: the owner's Windows 11 machine, Docker Desktop 29.2.0 (Linux engine), Docker Compose v5.0.2. A native PostgreSQL service listens on 5432 there. Compose project name `khondi-t0004qa` was used so these runs couldn't touch older volumes under `khondi`. The worktree `.env` was `.env.example` plus `KHONDI_PG_PORT=5433`.

**Base images.** Docker Hub returned `429 Too Many Requests` for anonymous pulls. `postgres:16.16` and `redis:7.4.12` were pulled from Google's Docker Hub mirror and tagged locally. Their digests match the Docker Hub images pulled earlier the same day: `postgres@sha256:3950ad7c3148ca2175ef1b6c36c9efbf78957ae8fbe8b3a5d7c35af50500382f` and `redis@sha256:2e3eb11462c4e3759e6972678dd051d150ff54b1e60714b3c33b701260172a90`. Nothing in the repository refers to the mirror.

```text
$ docker compose -p khondi-t0004qa config        # no .env (AC4)
error while interpolating services.postgres.environment.POSTGRES_USER: required variable POSTGRES_USER is missing a value: Set POSTGRES_USER in .env (copy .env.example)
exit=1

$ docker compose -p khondi-t0004qa config --format json | jq …   # AC5
[{"host_ip":"127.0.0.1","published":"8000","target":8000},{"host_ip":"127.0.0.1","published":"5433","target":5432},{"host_ip":"127.0.0.1","published":"6379","target":6379},{"host_ip":"127.0.0.1","published":"3000","target":3000}]
true
true
["postgres:16.16","redis:7.4.12"]

$ docker compose -p khondi-t0004qa up --wait --build   # AC1, AC6 (native postgres holds 5432)
up exit=0 cold build+boot=46s
SERVICE    STATUS                    PORTS
api        Up 12 seconds (healthy)   127.0.0.1:8000->8000/tcp
postgres   Up 18 seconds (healthy)   127.0.0.1:5433->5432/tcp
redis      Up 18 seconds (healthy)   127.0.0.1:6379->6379/tcp
web        Up 6 seconds (healthy)    127.0.0.1:3000->3000/tcp
$ curl http://127.0.0.1:8000/healthz ; /readyz ; http://127.0.0.1:3000/api/healthz
{"status":"ok"} [200]
{"status":"ready"} [200]
{"status":"ok"} [200]

$ psql … CREATE TABLE t0004_persist …; docker compose down; docker compose up --wait; SELECT   # AC2
after down/up: kept

$ echo "no" | python scripts/dev-reset.py      # AC3, real docker, project "khondi"
This will stop the stack and permanently delete these volumes:
  khondi_khondi_lgtm
  khondi_khondi_pg
  khondi_khondi_redis
  khondi_lgtm
  khondi_pg
  khondi_redis
Type RESET to continue: Aborted; nothing was deleted.
exit=1

$ ruff check scripts && ruff format --check scripts && mypy --strict scripts && pytest -q scripts/tests
All checks passed!
4 files already formatted
Success: no issues found in 4 source files
...................................................                      [100%]
51 passed in 0.06s

$ python scripts/check_diff_hygiene.py origin/codex/T0003-service-skeletons-config   # AC7
Diff hygiene: no violations.
```

The volumes listed in the abort run are leftovers from an older experiment (2026-11-18) under the same project name. They show that the script lists everything it would delete. Nothing was deleted.

## Quality rules self-check
- **Q1, Q3:** only the spec. No T0003 file was changed.
- **Q2:** +471 lines, over the 400 target. About 215 are code and config; the rest is 146 lines of tests, 73 of docs and 34 of the approval record. Splitting would separate the CI job from what it tests.
- **Q4, Q5:** no stubs or unused code. `UNATTENDED_FLAG` is the spec's `--yes-i-really-mean-it`.
- **Q6:** subprocess failures are reported with stderr and returned. `EOFError` from input counts as "no", which is real handling, not hiding.
- **Q8:** one suppression: `# noqa: S603 argument lists are built in this file from fixed values`, on the single `subprocess.run`. Docker is resolved to an absolute path with `shutil.which`, so S607 doesn't apply. `ruff.toml` is unchanged.
- **Q9:** each reset behavior has a test that fails without it. Compose behavior is tested by the CI `stack` job.
- **Q10:** all output above is real. CI is **not yet run**.
- **Q14:** the script writes through `sys.stdout`/`sys.stderr`, like `check_diff_hygiene.py`. No `print`.
- **Q15, P10:** `.env.example` has local values only. `.env` is git-ignored.
- **Q16:** existing CI jobs and lint settings are unchanged.

## New dependencies
- No packages.
- New images: `postgres:16.16` and `redis:7.4.12`, digests above.
- The CI job uses `jq`, which is preinstalled on `ubuntu-latest`.

## Deviations from the spec
- None in scope.
- `scripts/dev-reset.py` keeps the spec's hyphenated name. Tests load it with `importlib` (noted in `02-approval.md`).

## Risks and known limits
- **Look hardest at the reset scope.** The reset script deletes every volume labelled `com.docker.compose.project=khondi`, which on the owner's machine includes six obsolete volumes. That matches the spec ("the `khondi` project's volumes") and the script lists them first. If the reviewer prefers it to delete only `khondi-pgdata`, that's a small change.
- **Rebuild times have no hot reload** (spec Risks 2): api 38 s and web 88 s after a code change. That makes the case for a dev overlay; see Follow-ups.
- **Docker Hub limits anonymous pulls** (429). GitHub runners usually aren't affected, but a busy runner pool can be.
- **The PR stacks on T0003.** It must not merge before #52.

## Follow-ups (not in this PR)
1. A hot-reload dev overlay (bind mounts + dev targets). Needs the owner's Gate 1 (spec Risks 2).
2. Remove the six obsolete `khondi_*` volumes on the owner's machine. That's the owner's choice; nothing here deletes them.
