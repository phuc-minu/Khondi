# Running Khondi locally

The local stack is defined in [`compose.yaml`](../../compose.yaml). It runs the same images as the planned Azure setup (see [azure-parity.md](azure-parity.md)).

## Prerequisites
- **Docker Desktop** with the WSL 2 backend, running in **Linux containers** mode (tray icon → *Switch to Linux containers* if it says Windows).
- **Python 3.12** for the reset script only. The apps themselves run in containers.
- **Resources**, measured on 2026-11-20 on Windows 11 with Docker Desktop:

  | What | Measured |
  | --- | --- |
  | RAM, all four containers running and idle | about 120 MiB (api 49, web 41, postgres 20, redis 8) |
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
| Follow logs | `docker compose logs -f api` (or `web`, `postgres`, `redis`) |
| Stop, keeping data | `docker compose down` |
| Delete all local data | `python scripts/dev-reset.py` (see below) |

Code changes need `up --build`; there's no hot reload in this setup yet.

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
- **A service stays `unhealthy`.** Run `docker compose ps --all` and `docker compose logs <service>`. The api exits with an error naming the variable if its settings are missing or invalid.
