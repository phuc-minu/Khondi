# Running Khondi locally

The local stack is defined in [`compose.yaml`](../../compose.yaml). It runs the same images as the planned Azure setup (see [azure-parity.md](azure-parity.md)).

## Prerequisites
- **Docker Desktop** with the WSL 2 backend, running in **Linux containers** mode (tray icon → *Switch to Linux containers* if it says Windows).
- **Python 3.12** for the reset script only. The apps themselves run in containers.
- **Resources**, measured on 2026-11-20 on Windows 11 with Docker Desktop:

  | What | Measured |
  | --- | --- |
  | RAM, all four containers running and idle | about 120 MiB (api 49, web 41, postgres 20, redis 8) |
  | RAM added by the `worker` container, idle | about 29 MiB (measured 2026-11-21) |
  | Disk for images | about 1.6 GB (postgres 667 MB, web 447 MB, api 315 MB, redis 170 MB) |
  | First `up --build`, with base images already pulled | 46 s |
  | `up --build` with no code changes | 21 s |
  | `up --build` after an api code change | 38 s |
  | `up --build` after a web code change | 88 s |

  These are figures from one machine, not limits. Docker Desktop's own memory use comes on top.

## First run
```sh
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
docker compose up --wait --build
```
`--wait` returns once every service passes its health check. Then:
- Web: http://127.0.0.1:3000 (health: `/api/healthz`).
- API: http://127.0.0.1:8000 (`/healthz` = process alive, `/readyz` = PostgreSQL and Redis reachable).

`.env` is git-ignored. Keep only local values in it, never real credentials.

## Ports
Every port is bound to `127.0.0.1`, so nothing is reachable from other computers.

| Service | Host port | Change it with |
| --- | --- | --- |
| web | 3000 | `KHONDI_WEB_PORT` |
| api | 8000 | `KHONDI_API_PORT` |
| PostgreSQL | 5432 | `KHONDI_PG_PORT` |
| Redis | 6379 | `KHONDI_REDIS_PORT` |

These variables only change the port on your computer. Inside the stack the apps still use `postgres:5432` and `redis:6379` from `DATABASE_URL` and `REDIS_URL`.

## Everyday commands
| Goal | Command |
| --- | --- |
| Start or update after code changes | `docker compose up --wait --build` |
| See status | `docker compose ps` |
| Follow logs | `docker compose logs -f api` (or `web`, `worker`, `postgres`, `redis`) |
| Stop, keeping data | `docker compose down` |
| Delete all local data | `python scripts/dev-reset.py` (see below) |

Code changes need `up --build`; there's no hot reload in this setup yet.

## Database migrations
Schema changes are Alembic revisions in `backend/khondi_api/migrations/versions/`.
- The `migrate` service applies them with `python -m khondi_api.migrate` on every `docker compose up`.
- The api waits until `migrate` has finished successfully, and never migrates by itself.
- To re-run it by hand: `docker compose run --rm migrate`. Running it again when nothing is new changes nothing.
- To create a revision, run this from `backend/` with the stack's database reachable on your machine:
  ```sh
  MIGRATIONS_DATABASE_URL=postgresql://khondi:khondi@127.0.0.1:5432/khondi ENVIRONMENT=local \
    uv run alembic revision --autogenerate -m "describe the change"
  ```
  Use your `KHONDI_PG_PORT` if you changed it.

## Background worker
The `worker` service runs background jobs with [Arq](https://arq-docs.helpmanual.io/). It uses the api image with the command `python -m khondi_api.worker`, and it has no port.
- **Health:** the worker refreshes a heartbeat key in Redis every 10 s. `docker compose exec worker python -m khondi_api.worker --check` exits 0 while that key is fresh, and the Compose health check runs the same command.
- **Job policy:** each job gets at most 3 tries and 300 s per try. Results are kept for an hour.
- **Restarts:** on `docker compose stop` or `restart`, the worker cancels running jobs and puts them back on the queue, then exits within a few seconds. Those jobs run again on the next start.
- **Delivery is at least once.** Because of restarts, a job can run more than once. Every job must be safe to run twice, and code that queues a job should pass a stable job ID (`_job_id`) so the same job isn't queued twice.
- **Redis keeps no data on disk.** Restarting the `redis` container drops queued jobs and stored results. Anything that must survive belongs in PostgreSQL.
- **Try it:** with `DIAGNOSTICS_ENABLED=true` (the `.env.example` value), the api queues a test job and shows its result:
  ```sh
  curl -X POST http://127.0.0.1:8000/v1/diagnostics/echo -H "Content-Type: application/json"     -H "traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01" -d '{"message":"hello"}'
  curl http://127.0.0.1:8000/v1/diagnostics/echo/<job_id from the first response>
  ```
  The result's `trace_id` is the one from your `traceparent` header. Add `-H "Idempotency-Key: my-key"` to see a repeat request return `"created": false`. These routes have no authentication, so keep the setting off anywhere other people can reach the api.
- **Logs:** for now the worker logs only warnings and errors. Job-level JSON logs arrive with OpenTelemetry (T0007).

## Database roles
- `migrate` connects as the schema owner (`POSTGRES_USER`, through `MIGRATIONS_DATABASE_URL`).
- The api connects as `khondi_app` (through `DATABASE_URL`). That role can read and write data, but it can't create, change or drop tables.
- PostgreSQL creates `khondi_app` the first time it starts with an **empty** data volume.

**If you ran the stack before migrations were added (T0004),** run `python scripts/dev-reset.py` once so the role is created. Until then, `/readyz` reports `postgres` as failed.

## Backing up and restoring
```sh
docker compose exec -T postgres pg_dump -Fc -U khondi khondi > khondi.dump
docker compose exec -T postgres pg_restore --clean --if-exists -U khondi -d khondi < khondi.dump
```
- Restoring replaces the objects in the dump with the dumped versions.
- `*.dump` files are git-ignored. Keep them out of OneDrive or any shared folder if they hold real data.

## Resetting local data
`docker compose down` keeps the PostgreSQL volume (`khondi-pgdata`). To wipe it:
```sh
python scripts/dev-reset.py
```
1. The script lists every volume that belongs to the `khondi` Compose project.
2. It deletes them only if you type `RESET` exactly. Any other answer exits without deleting anything.

**Read the list before typing `RESET`.** It covers every volume labelled with the `khondi` project, including volumes from older experiments under the same name.

## Troubleshooting
- **`bind: An attempt was made to access a socket in a way forbidden` or `port is already allocated`.**
  - Cause: another program uses that port. A common one is a PostgreSQL installed directly on Windows, which holds 5432.
  - Fix: add `KHONDI_PG_PORT=5433` (or the matching `KHONDI_*_PORT`) to `.env` and run `up` again.
- **`required variable ... is missing a value`.** `.env` is missing or incomplete. Copy `.env.example` again and re-apply your changes.
- **`no matching manifest for windows/amd64`.** Docker Desktop is in Windows-containers mode. Switch to Linux containers.
- **`429 Too Many Requests` while pulling images.** Docker Hub limits anonymous pulls. Sign in with `docker login`, or wait and retry.
- **Slow builds or locked files.** The repository is under OneDrive. Build contexts there are slower, and OneDrive can lock files that `npm` or Docker are writing. Cloning into the WSL 2 file system (for example `~/src/khondi`) avoids both.
- **`/readyz` says `postgres` failed and the api log mentions `password authentication failed for user "khondi_app"`.** Your data volume predates the app role. Run `python scripts/dev-reset.py` (see "Database roles").
- **`worker` stays `unhealthy`.** Run `docker compose logs worker`. If it says `Missing or invalid setting: REDIS_URL`, fix `.env`. If Redis is down, the health check fails until `redis` is healthy again.
- **`migrate` exited with an error.** Run `docker compose logs migrate`. The api doesn't start until `migrate` succeeds.
- **A service stays `unhealthy`.** Run `docker compose ps --all` and `docker compose logs <service>`. The api exits with an error naming the variable if its settings are missing or invalid.
