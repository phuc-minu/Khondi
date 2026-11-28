# ADR-0001: Khondi single low-cost Azure environment

- Status: Proposed — Product Owner approval required
- Date: 2026-11-24
- Scope: One low-cost Azure environment for the Python API, Next.js web app, PostgreSQL, migrations, secrets, and observability
- Repository: phuc-minu/Khondi

## Context

Khondi is an AI-powered vacation-planning SaaS with a Python backend, Next.js/React frontend, PostgreSQL, optional Redis/Arq background jobs, and OpenTelemetry. The repository already defines a local-to-Azure parity target in `docs/infra/azure-parity.md`: Azure Container Apps for web/API/worker, Azure Database for PostgreSQL Flexible Server, a migration job, Key Vault references, and Azure Monitor in place of the local LGTM stack.

The repository is public and its workflow requires a planning/ADR gate before infrastructure implementation, a separate PR review gate, and explicit approval before any Azure provisioning or production deployment.

## Decision

Use one Azure Container Apps Consumption environment for the web, API, and migration job, with Azure Container Registry for immutable images. Do not deploy Redis or the background worker initially. The API handles supported work synchronously. Preserve the existing queue/worker interfaces so Redis and Arq can be added later without changing the hosting boundary. Use Azure Database for PostgreSQL Flexible Server as the system of record.

Use one resource group and one Container Apps environment, named `rg-khondi` / `khondi`. This is a single shared environment for demo, development, and early production use. It must contain synthetic or low-risk data until a second environment is explicitly funded. PostgreSQL may stop outside an approved operating schedule; web/API scale to zero or one small replica according to availability needs.

Use a single primary region selected after confirming PostgreSQL Flexible Server, Container Apps, and GitHub OIDC availability. The default candidate is West US 2 or the owner's preferred nearby region; do not provision until the region and data-residency decision are approved.

Use Bicep rather than Terraform because the target is Azure-native, the repository is small, and Bicep supports subscription/resource-group deployment without adding a provider state backend. IaC must be generated only after Gate 1 approval.

## Target topology

- Azure Container Registry: one registry per subscription or environment policy, immutable image tags using commit SHA.
- One Container Apps environment for all initial workloads.
- Public web Container App with HTTPS ingress.
- Internal API Container App; web calls API through an internal service URL where feasible.
- Container Apps Job for migrations, run as a gated release step before API revision activation.
- PostgreSQL Flexible Server, private access if networking policy supports it; application role separate from migration/schema-owner role.
- One Key Vault; Container Apps managed identity reads secrets. GitHub Actions never receives database passwords.
- One Log Analytics workspace and Application Insights/Azure Monitor; use short retention and aggressive redaction/sampling.
- Optional Front Door/WAF only when traffic, custom-domain, or threat requirements justify its fixed cost; initial deployment can use Container Apps ingress plus DNS/TLS.
- Future extension: add a worker Container App, Container Apps Job, and TLS-enabled Redis/managed Redis when asynchronous workloads require them.

## Security and safeguards

- GitHub Actions authenticates to Azure using OIDC/workload identity federation, scoped only to the single resource group.
- PR workflow: lint, type checks, pytest/Vitest, integration/stack checks, Playwright when applicable, dependency and secret scans, Docker builds, Bicep lint/build, and IaC security scan.
- Deployment is manual or protected by one GitHub environment reviewer; there is no unattended production deployment.
- No Azure credentials, personal tokens, database passwords, or connection strings in Git, artifacts, logs, or PR text. `KHONDI_GITHUB_TOKEN` remains outside containers and documentation.
- Immutable image references by commit SHA; revisions support traffic splitting and rollback.
- Budget alerts at 50%, 75%, 90%, and 100% of approved monthly budgets; tags include `app=khondi`, `environment`, `owner`, `costCenter`, `managedBy=bicep`.
- PostgreSQL backups and point-in-time restore are enabled. Restore drills are required before PROD approval.
- Health probes use existing `/healthz`, `/readyz`, `/api/healthz`, and API readiness checks. Migrations run before traffic promotion and are backward-compatible.
- Diagnostics routes remain disabled outside controlled DEV because the repository documents that they are unauthenticated.

## Alternatives considered

1. Azure App Service: simpler for web/API, but less aligned with the existing container parity and worker/job model.
2. AKS: rejected for now; it adds cluster operations, networking, and cost without a demonstrated need.
3. Azure Static Web Apps plus a separate API: possible later, but it diverges from the current Next.js standalone container contract.
4. Keep Redis/Arq out of the initial deployment: synchronous API execution is simpler and cheaper. Reintroduce Redis plus a worker when request latency, retries, or job duration require asynchronous processing.
5. Terraform: viable, but adds state-backend and provider lifecycle management that Bicep avoids for this Azure-first repository.

## Cost decision

Costs are estimates, not a quote, and depend on region, SKU, traffic, log volume, backup retention, egress, and discounts.

- Approved target: stay below $100/month for the initial low-traffic workload.
- Cost controls: smallest suitable PostgreSQL Flexible Server, scheduled stop/start when idle, one small Container Apps replica or scale-to-zero where safe, low log retention/ingestion, no WAF/Front Door, no HA, no geo-redundant DR, and no Redis cost initially; add it only after a reviewed workload and cost update.
- Planning estimate: approximately $45–$95/month when PostgreSQL is stopped outside operating hours and traffic/log volume remain low. A continuously running database or managed Redis can exceed the budget and must trigger review before enablement.
- External provider, routing, LLM/API, domain, and egress charges are excluded and require separate budget monitoring.
- PostgreSQL is the dominant predictable cost. Microsoft pricing pages show Flexible Server compute is hourly and storage/backup are separately metered; the pricing page also documents that stopping the server removes compute charges while stopped. Validate exact region/SKU in the Azure Pricing Calculator before approval.

## Consequences

Positive:
- Strong parity with the repository's local Compose contracts.
- Small operational footprint without Kubernetes.
- Simple operations and a controlled cost ceiling.
- Secrets and deployment identity are separated from GitHub and source code.

Tradeoffs:
- Container Apps internal networking and private PostgreSQL access need validation in the selected region.
- Synchronous execution limits long-running jobs and request concurrency; the future Redis/worker extension must preserve idempotency and retry safeguards.
- Bicep modules and environment parameter files still need to be implemented and validated after approval.
- A single-region initial design is not a full disaster-recovery solution.

## Approval required

Approve or revise:
1. One Azure Container Apps environment + PostgreSQL Flexible Server as the baseline.
2. Bicep as IaC.
3. A hard monthly budget target below $100, with alerts and stop/start controls.
4. Redis/Arq omitted initially, with the existing interfaces retained for a later addition.
5. Initial region and operating schedule.
6. The implementation may begin only after this ADR and the accompanying plan are explicitly approved.
