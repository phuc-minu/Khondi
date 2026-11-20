# T0002 · Local development infrastructure that can be duplicated in Azure · Spec

| Field | Value |
| --- | --- |
| Task | T0002-local-infra-azure-parity |
| Step | 1 · Spec (Gate 1 proposal) |
| Author | Claude (architect) |
| For | Phil (approval), then Codex DevOps and Codex Senior Developer (implementation) |
| Date (UTC) | 2026-11-20 14:50 |
| Spec version | v1 |
| Related | Epic #17; issues #31, #32, #33, #34, #35, #36, #37; #2 (foundation); #12 (deployment); [ADR-001](../../architecture/khondi-architecture.md) |

## Goal
Run the whole Khondi stack on Phil's computer with Docker Compose, built so that the same stack can be stood up in Azure without rewriting any application code: same container images, same configuration names, same health checks, same telemetry. Azure stays a written, checked, **not deployed** template until Phil separately authorizes spending.

## Context
Phil asked on 2026-11-20: "make sure that we can duplicate this in Azure."

Epic #17 already says local first, with Azure dev as a fallback. Until now, Azure was a separate workstream to design only if local failed. That leaves a risk: if the local stack quietly depends on things Azure does not offer (a Postgres extension Azure does not allow, Redis without TLS, a hostname only Compose knows, files written to a container's disk), "move it to Azure" later becomes a rewrite. This spec closes that gap by making Azure parity a rule every infrastructure PR is checked against, and by ending the epic with Azure templates that compile and validate in CI but are never applied without Phil.

Nothing in the repository runs yet: there is no `backend/`, `frontend/`, Dockerfile or Compose file. ADR-001 proposes FastAPI, Next.js, PostgreSQL, Redis + Arq and OpenTelemetry, and leaves the hosting platform "TBD". This spec chooses the Azure target for parity purposes only; it does not create anything in Azure.

## Scope
**In scope**
- The parity contract (rules P1 to P12 below) that every infrastructure and service PR in epic #17 must meet.
- The local-to-Azure service map, kept as a living document at `docs/infra/azure-parity.md`.
- Local Docker Compose stack: web, api, worker, one-off migration job, PostgreSQL, Redis, OpenTelemetry collector and a local trace/log viewer.
- Azure infrastructure as code (Bicep) that describes the same stack, checked in CI with `az bicep build` and the Bicep linter only.
- The split of this work into seven small implementation PRs (T0003 to T0009).

**Out of scope**
- Creating, deploying or paying for anything in Azure. Running `az deployment ... what-if` or `create` needs Phil's separate, environment-specific authorization (AGENTS.md Gate 2 rule), even after the IaC PR merges.
- Production environments, custom domains, DNS and TLS certificates, private networking (VNet integration, private endpoints). The Azure template is a single **dev** environment.
- Kubernetes (AKS). ADR-001 prefers minimal moving parts.
- Feature code: trip intake, agent loop, providers. Those belong to #2 and later tasks.

## Design

### Parity contract
Every PR in this epic is reviewed against these rules, the same way code is reviewed against Q1 to Q16. Cite them as `P1`, `P2`, and so on.

- **P1 One image per service, built once.** `web`, `api` and `worker` each have one Dockerfile. Compose builds and runs those images locally; Azure Container Apps runs the same images pulled from Azure Container Registry. No Compose-only code paths, no `if running_locally` branches. The worker uses the api image with a different command.
- **P2 Configuration only from environment variables.** Each app reads settings through one typed settings module (Pydantic Settings on the backend, a typed parser on the frontend) that fails at startup with a clear error naming any missing required variable. Variable names are identical locally and in Azure. Locally the values come from a git-ignored `.env` copied from `.env.example` (names and safe local defaults only). In Azure they come from Container Apps environment variables and Key Vault secret references.
- **P3 Backing services are reached only by URL.** `DATABASE_URL`, `REDIS_URL` and `OTEL_EXPORTER_OTLP_ENDPOINT`. No hostnames such as `postgres` or `localhost` in code.
- **P4 TLS-ready connections.** Azure PostgreSQL and Azure Redis require TLS. The code must work unchanged when the URL carries `sslmode=require` or uses `rediss://`. Locally the URLs are plain; one integration test runs the connection code with a TLS-style URL parsed into its driver options so the path is exercised.
- **P5 PostgreSQL 16, Azure-supported extensions only.** The local image is pinned to `postgres:16.x` to match Azure Database for PostgreSQL Flexible Server 16. Any extension must be on Azure's supported list and be listed in `docs/infra/azure-parity.md` with the `azure.extensions` server setting it needs (PostGIS, if adopted later, is supported).
- **P6 Migrations are a separate one-off job.** Alembic runs in a `migrate` service (Compose) / Container Apps Job (Azure), never at app startup, so several api replicas never race on the schema.
- **P7 Stateless containers.** No writes to the container file system other than temporary files. Durable data lives in PostgreSQL. Containers run as a non-root user, listen on the port in `PORT`, and shut down cleanly on SIGTERM within 10 seconds.
- **P8 Same health endpoints everywhere.** The api serves `GET /healthz` (process is alive, no dependencies) and `GET /readyz` (PostgreSQL and Redis reachable). Compose `healthcheck` and Container Apps liveness and readiness probes call the same paths. The web app serves `GET /api/healthz`. The worker reports health through a heartbeat key in Redis, checked by a small command.
- **P9 Telemetry goes to a collector, never to a vendor.** Apps export OTLP to `OTEL_EXPORTER_OTLP_ENDPOINT` and write JSON logs to stdout. Locally the collector forwards to `grafana/otel-lgtm`. In Azure a collector forwards to Application Insights / Log Analytics. Application code never imports an Azure telemetry SDK.
- **P10 Secrets never in images or the repository.** Locally: `.env` (git-ignored). Azure: Key Vault, read by the Container Apps managed identity. `.env.example` holds names and harmless local defaults only (Q15).
- **P11 Images build for `linux/amd64`** (what Container Apps runs), with pinned base image versions and no `latest` tags anywhere, including Compose.
- **P12 Every new service or setting updates the parity map.** A PR that adds a container, backing service, environment variable or extension also adds its Azure row to `docs/infra/azure-parity.md`. Claude rejects the PR otherwise.

### Local-to-Azure service map
This table becomes `docs/infra/azure-parity.md` in T0003 and is kept current by P12.

| Local (Docker Compose) | Azure dev equivalent | Notes |
| --- | --- | --- |
| `web` container (Next.js) | Azure Container App, external ingress | Same image from ACR |
| `api` container (FastAPI) | Azure Container App, external ingress | Same image; probes on `/healthz`, `/readyz` |
| `worker` container (Arq) | Azure Container App, no ingress, min 1 replica | Same image as api, different command |
| `migrate` one-off service | Azure Container Apps Job, manual trigger | Run before each api rollout |
| `postgres:16` with a named volume | Azure Database for PostgreSQL Flexible Server 16, Burstable tier | Managed storage and automatic backups replace the volume |
| `redis:7` | Azure Managed Redis, smallest tier (see open question 3) | TLS on, `rediss://` URL |
| `otel-collector` + `grafana/otel-lgtm` | OpenTelemetry collector → Application Insights + Log Analytics workspace | App config unchanged; only the collector's exporter differs |
| `.env` file | Key Vault + Container Apps secret references, user-assigned managed identity | Same variable names |
| Images built by `docker compose build` | Images built in CI and pushed to Azure Container Registry (Basic) | Push only when a deployment is authorized |
| Compose network DNS (`api:8000`) | Container Apps environment internal DNS | Reached through URLs only (P3) |
| Playwright against `http://localhost:3000` | Playwright against the dev app URL | `BASE_URL` variable |

### Infrastructure as code choice
**Bicep**, recommended over Terraform for this project: it is Azure-native, free, needs no remote state storage (Azure keeps the deployment state), and `az bicep build` plus the built-in linter run in CI with no Azure credentials. Terraform would only pay off if Khondi later needs another cloud. Layout: `infra/azure/main.bicep`, one module per resource group in the table above, `infra/azure/dev.bicepparam`. Every resource carries `project=khondi`, `env=dev` and `owner` tags, and the template includes a monthly budget alert. Teardown is one documented command that deletes the dev resource group, run only with Phil's authorization.

### Local stack shape
- One `compose.yaml` at the repository root. Default `docker compose up` starts web, api, worker, postgres, redis and the telemetry pair. The `migrate` service runs to completion before api and worker start (`depends_on: condition: service_completed_successfully`).
- Ports bound to `127.0.0.1` only: web 3000, api 8000, Grafana 3001, PostgreSQL 5432, Redis 6379. The full list lives in `docs/infra/local-setup.md`.
- Named volumes for PostgreSQL data and Grafana. `docker compose down` keeps data. Destructive reset is a script (`scripts/dev-reset.py`) that asks for typed confirmation before removing volumes.
- Replay mode (recorded LLM and provider responses, New Orleans fixtures) is the default local mode, so the stack runs with no paid API keys (#35).
- Prerequisites for Phil's Windows computer (Docker Desktop with the WSL 2 backend, RAM and disk figures measured during T0004) are documented in `docs/infra/local-setup.md`. This replaces the separate go/no-go study in #31: if the local stack cannot run, the fallback is the already-validated Azure template rather than a new design.

### Implementation breakdown
Each row is one implementation PR with its own task folder. Approving this spec approves all seven designs. Before each one starts, Claude writes that folder's short `01-spec.md` that quotes its section of this spec and adds nothing new; if anything new is needed, it comes back to Phil as a new Gate 1.

| Task | PR | Issues | Contents |
| --- | --- | --- | --- |
| T0003 | Service skeletons and configuration | #2, #35 | Minimal FastAPI app with `/healthz` and `/readyz`, minimal Next.js app with `/api/healthz`, typed settings modules (P2), Dockerfiles (P1, P7, P11), `.env.example`, `docs/infra/azure-parity.md` |
| T0004 | Compose stack and networking | #32, #31 | `compose.yaml`, PostgreSQL and Redis services, health checks, startup order, `127.0.0.1` ports, reset script, `docs/infra/local-setup.md`, CI job that boots the stack and checks health |
| T0005 | PostgreSQL, migrations and recovery | #33 | SQLAlchemy and Alembic, `migrate` service (P6), TLS-URL test (P4), backup and restore smoke test with `pg_dump` / `pg_restore` |
| T0006 | Redis and worker | #34 | Arq worker from the api image, one real job with retry and timeout, heartbeat health check, trace context passed from api to worker |
| T0007 | Observability | #36 | OpenTelemetry in api, worker and web, JSON logs with trace ID, collector config, `grafana/otel-lgtm`, redaction test |
| T0008 | Integration tests and Playwright | #37 | pytest integration tests against Compose services, Playwright smoke test driven by `BASE_URL`, traces and screenshots on failure, CI parity |
| T0009 | Azure dev template (no deployment) | #17, #12 | Bicep for every row of the service map, Azure collector config, budget alert, CI `az bicep build` + lint, cost estimate from the Azure pricing calculator, deploy and teardown runbook marked "requires Phil's authorization" |

## Acceptance criteria
1. Given a fresh clone on a machine with Docker Desktop, when the developer copies `.env.example` to `.env` and runs `docker compose up`, then web, api and worker become healthy and `GET /readyz` returns 200, with no paid API keys set.
2. Given the stack is running, when `docker compose down` and `up` are run again, then PostgreSQL data is still there; the reset script removes it only after typed confirmation.
3. Given a required environment variable is missing, when the api, worker or web starts, then it exits with an error that names the variable and never prints secret values.
4. Given the source code, when it is searched, then no backing-service hostname, port or credential appears outside `compose.yaml`, `.env.example` and the Bicep files (P3, P10).
5. Given the connection code, when it is given `sslmode=require` and `rediss://` URLs, then it builds TLS-enabled driver options (P4).
6. Given a migration, when `migrate` runs twice, then the second run makes no changes, and api startup never runs migrations (P6).
7. Given a request through web → api → worker, when it is viewed in local Grafana, then it appears as one trace and its JSON log lines share the trace ID, with no secrets in either.
8. Given the Playwright smoke test, when it runs with `BASE_URL` set to the local web URL, then it passes, and it needs no code change to target another URL.
9. Given `infra/azure/`, when CI runs, then `az bicep build` and the Bicep linter pass with no Azure credentials, and every row of `docs/infra/azure-parity.md` has a matching Bicep resource.
10. Given any PR in T0003 to T0009, when it adds a service, setting or extension, then `docs/infra/azure-parity.md` gains the matching Azure row (P12).
11. Given the repository after T0009, then no Azure resource has been created, and the runbook states that deploying needs Phil's separate authorization.

## Test plan
| Criterion | Test type | What the test proves |
| --- | --- | --- |
| 1 | CI job: `docker compose up --wait` then health requests | The stack boots from a clean checkout without paid keys |
| 2 | Integration script in CI | Data survives restart; reset needs confirmation |
| 3 | Unit tests on each settings module | Missing variables fail fast with a named, secret-free error |
| 4 | Review + `scripts/check_diff_hygiene.py` grep rule added in T0003 | No hard-coded hosts or credentials |
| 5 | Unit test on the connection-option builder | The TLS path works without needing Azure |
| 6 | Integration test running `migrate` twice | Migrations are idempotent and separate from startup |
| 7 | Integration test reading the trace back from the local backend | One trace across services, logs correlated, redaction holds |
| 8 | Playwright smoke in CI | E2E works and is URL-agnostic |
| 9 | CI job on `infra/azure/**` | Azure template is valid and complete without touching Azure |
| 10, 11 | Claude review against P12 and the runbook | Parity map stays complete; nothing was deployed |

## Dependencies
New services and tools, each pinned to an exact version in its PR (Q12 reasons go in that PR's handoff): Docker Compose v2, `postgres:16`, `redis:7`, `otel/opentelemetry-collector-contrib`, `grafana/otel-lgtm`, Alembic, SQLAlchemy, Arq, OpenTelemetry SDKs, Playwright, Azure CLI with Bicep (CI only). No Azure subscription is needed until a deployment is authorized.

## Risks and open questions
1. **App skeleton overlaps #2.** The infrastructure cannot be tested without a running api and web, but none exists. Recommendation: T0003 builds only the bare skeletons (health endpoints and settings), and #2 adds the feature modules on top. Merging this spec accepts that split.
2. **#31 changes meaning.** The separate local feasibility study and Azure fallback design become part of T0004 (local prerequisites) and T0009 (Azure template). Merging this spec accepts that.
3. **Redis in Azure.** Azure Managed Redis is Microsoft's current managed Redis offer and has a monthly cost even at the smallest size. A cheaper dev option is running `redis:7` as a Container App with no persistence, which works because Khondi only uses Redis as a job queue and cache. Recommendation: Bicep defaults to the Container App option for dev, with Azure Managed Redis as a documented switch for anything beyond dev. Flag it on the PR if you prefer the managed service from the start.
4. **Cost.** No figures are claimed here. T0009 produces an estimate from the Azure pricing calculator for the chosen dev sizes; it is reviewed before any deployment request.
5. **Windows performance.** Docker Desktop on Windows is slower with bind-mounted source code. T0004 measures it; if hot reload is too slow, the fix is keeping the clone inside the WSL 2 file system, documented in `local-setup.md`.

## Size
Seven PRs, each targeted under 400 changed lines excluding lockfiles and generated files (Q2). T0003 and T0009 are the largest; Codex splits either one if it grows past the limit and says so in the handoff.

## Approval request
Phil, please approve spec **v1** of T0002 by merging this spec PR. Merging is the Gate 1 approval for the parity rules P1 to P12, the service map, Bicep as the IaC tool, and the T0003 to T0009 breakdown. It does not authorize creating anything in Azure. Request changes on the PR if anything should differ.
