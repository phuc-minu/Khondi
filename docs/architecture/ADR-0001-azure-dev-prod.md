# ADR-0001: Khondi Azure DEV and PROD environments

- Status: Proposed — Product Owner approval required
- Date: 2026-11-24
- Scope: Azure hosting and delivery topology for the Python API/worker, Next.js web app, PostgreSQL, Redis, migrations, secrets, and observability
- Repository: phuc-minu/Khondi

## Context

Khondi is an AI-powered vacation-planning SaaS with a Python backend, Next.js/React frontend, PostgreSQL, Redis/Arq background jobs, and OpenTelemetry. The repository already defines a local-to-Azure parity target in `docs/infra/azure-parity.md`: Azure Container Apps for web/API/worker, Azure Database for PostgreSQL Flexible Server, a migration job, Key Vault references, and Azure Monitor in place of the local LGTM stack.

The repository is public and its workflow requires a planning/ADR gate before infrastructure implementation, a separate PR review gate, and explicit approval before any Azure provisioning or production deployment.

## Decision

Use Azure Container Apps Consumption for the stateless web, API, worker, and migration job, with Azure Container Registry for immutable images. Use Azure Database for PostgreSQL Flexible Server as the system of record. Use Azure Managed Redis only if the queue/result durability and SLA requirements justify its fixed cost; otherwise begin DEV with a small managed Redis instance or an Azure Container App Redis service explicitly documented as non-durable. PROD must use a managed Redis offering with TLS and a defined eviction/restart policy.

Use one Azure subscription unless policy requires separation, but isolate environments in separate resource groups and separate Container Apps environments:
- `khondi-dev`: lower replicas, scale-to-zero for web/API/worker where safe, database stop/start schedule, shorter log retention, non-production data only.
- `khondi-prod`: independent resources, minimum API/web availability, worker at least one replica, production database, longer backups/retention, protected GitHub environment, and no shared secrets or data plane.

Use a single primary region selected after confirming PostgreSQL Flexible Server, Container Apps, Redis, and GitHub OIDC availability. The default candidate is West US 2 or the owner's preferred nearby region; do not provision until the region and data-residency decision are approved.

Use Bicep rather than Terraform because the target is Azure-native, the repository is small, and Bicep supports subscription/resource-group deployment without adding a provider state backend. IaC must be generated only after Gate 1 approval.

## Target topology

- Azure Container Registry: one registry per subscription or environment policy, immutable image tags using commit SHA.
- Container Apps environment per environment.
- Public web Container App with HTTPS ingress.
- Internal API Container App; web calls API through an internal service URL where feasible.
- Internal worker Container App, no ingress, at least one PROD replica.
- Container Apps Job for migrations, run as a gated release step before API revision activation.
- PostgreSQL Flexible Server, private access if networking policy supports it; application role separate from migration/schema-owner role.
- Redis with TLS; no business-critical state stored only in Redis.
- Key Vault per environment; Container Apps managed identity reads secrets. GitHub Actions never receives database passwords.
- Log Analytics workspace and Application Insights/Azure Monitor per environment; redact prompts, traveler data, headers, URLs, credentials, and client identifiers.
- Optional Front Door/WAF only when traffic, custom-domain, or threat requirements justify its fixed cost; initial DEV/PROD can use Container Apps ingress plus DNS/TLS.

## Security and safeguards

- GitHub Actions authenticates to Azure using OIDC/workload identity federation, scoped separately to DEV and PROD.
- PR workflow: lint, type checks, pytest/Vitest, integration/stack checks, Playwright when applicable, dependency and secret scans, Docker builds, Bicep lint/build, and IaC security scan.
- DEV deploy may be automatic only after the owner approves the workflow policy. PROD deploy is manual, protected by GitHub environment reviewers, and requires an environment-specific approval.
- No Azure credentials, personal tokens, database passwords, or connection strings in Git, artifacts, logs, or PR text. `KHONDI_GITHUB_TOKEN` remains outside containers and documentation.
- Immutable image references by commit SHA; revisions support traffic splitting and rollback.
- Budget alerts at 50%, 75%, 90%, and 100% of approved monthly budgets; tags include `app=khondi`, `environment`, `owner`, `costCenter`, `managedBy=bicep`.
- PostgreSQL backups and point-in-time restore are enabled. Restore drills are required before PROD approval.
- Health probes use existing `/healthz`, `/readyz`, `/api/healthz`, and worker heartbeat checks. Migrations run before traffic promotion and are backward-compatible.
- Diagnostics routes remain disabled outside controlled DEV because the repository documents that they are unauthenticated.

## Alternatives considered

1. Azure App Service: simpler for web/API, but less aligned with the existing container parity and worker/job model.
2. AKS: rejected for now; it adds cluster operations, networking, and cost without a demonstrated need.
3. Azure Static Web Apps plus a separate API: possible later, but it diverges from the current Next.js standalone container contract.
4. Azure Cache for Redis versus Container Apps Redis: managed Redis is preferred for PROD; a cheaper non-durable DEV option is acceptable only while Redis is treated as disposable queue/cache state.
5. Terraform: viable, but adds state-backend and provider lifecycle management that Bicep avoids for this Azure-first repository.

## Cost decision

Costs are estimates, not a quote, and depend on region, SKU, traffic, log volume, backup retention, egress, and discounts.

- DEV target: approximately $25–$90/month when the PostgreSQL server is stopped outside working hours; approximately $80–$180/month if PostgreSQL runs continuously. Container Apps may be near-zero at low traffic because Consumption can scale to zero. Log ingestion and Redis are the largest uncertainty after PostgreSQL.
- PROD initial target: approximately $180–$450/month for a small always-on deployment with one small PostgreSQL server, one managed Redis instance, low Container Apps usage, registry, Key Vault, and modest monitoring. This excludes high traffic, WAF/Front Door, geo-redundant DR, large log ingestion, and external provider/LLM/API charges.
- PostgreSQL is the dominant predictable cost. Microsoft pricing pages show Flexible Server compute is hourly and storage/backup are separately metered; the pricing page also documents that stopping the server removes compute charges while stopped. Validate exact region/SKU in the Azure Pricing Calculator before approval.

## Consequences

Positive:
- Strong parity with the repository's local Compose contracts.
- Small operational footprint without Kubernetes.
- Clear DEV/PROD isolation and safe rollback path.
- Secrets and deployment identity are separated from GitHub and source code.

Tradeoffs:
- Container Apps internal networking and private PostgreSQL access need validation in the selected region.
- Redis choice affects cost, reliability, and queue-loss behavior.
- Bicep modules and environment parameter files still need to be implemented and validated after approval.
- A single-region initial design is not a full disaster-recovery solution.

## Approval required

Approve or revise:
1. Azure Container Apps + PostgreSQL Flexible Server as the baseline.
2. Bicep as IaC.
3. Separate resource groups and Container Apps environments for DEV and PROD.
4. Managed Redis for PROD and a deliberately lower-cost DEV option.
5. Initial region and monthly budget limits.
6. The implementation may begin only after this ADR and the accompanying plan are explicitly approved.
