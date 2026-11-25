# Khondi single-environment implementation plan

- Status: Draft for Product Owner approval
- Date: 2026-11-24
- No Azure resources provisioned
- No production deployment authorized
- Monthly cost target: below $100

## Repository findings

The current default branch is `main` in public repository `phuc-minu/Khondi`.

Observed architecture and contracts:
- Python 3.12 backend with FastAPI-style health/readiness endpoints and a production Docker image.
- Next.js + TypeScript frontend with standalone container output and `/api/healthz`.
- PostgreSQL with Alembic migrations; API uses a lower-privilege application role and migrations use a schema-owner role.
- Redis/Arq worker with at-least-once processing, heartbeat health check, one API image reused by the worker, and explicitly non-durable queue/results.
- Existing `docs/infra/azure-parity.md` already maps web, API, worker, migration job, PostgreSQL, Redis, and telemetry to Azure targets.
- Existing `.github/workflows/quality.yml` is quality-oriented; an Azure delivery workflow is not yet part of the reviewed plan.
- Repository governance requires approval before infrastructure implementation or provisioning.

## Proposed single environment

| Concern | Decision |
| --- | --- |
| Resource group | `rg-khondi` |
| Container Apps environment | One Consumption environment: `khondi` |
| Web/API scale | Scale-to-zero where safe; one small replica when serving the demo |
| Worker | Zero when unused; one small replica during jobs |
| PostgreSQL | Smallest suitable Flexible Server; stop outside the approved operating schedule |
| Redis | Low-cost TLS-capable disposable queue/cache; managed Redis deferred |
| Secrets | One Key Vault with managed identity |
| Logs | Short retention, redaction, sampling, and ingestion budget |
| Data | Synthetic/demo data until a second environment is funded |
| Deployment | Manual or protected GitHub environment |
| DNS/TLS | Azure-provided hostname initially; custom domain later |

## Planned IaC layout after approval

```
infra/
  main.bicep
  modules/
    container-apps-environment.bicep
    container-app.bicep
    container-job.bicep
    postgres-flexible-server.bicep
    redis.bicep
    registry.bicep
    key-vault.bicep
    monitoring.bicep
    budgets.bicep
  environments/
    single.parameters.json
```

Bicep must use parameterized names, region, SKUs, tags, identity IDs, scaling rules, secret references, and log retention. It must not contain passwords, tokens, or connection strings. Validation gates: `az bicep build`, `az deployment ... what-if` with no apply, and an IaC security scan with no unresolved high/critical findings.

## Planned CI/CD

1. Pull request:
   - Existing backend/frontend quality checks.
   - Docker image builds for `linux/amd64`.
   - Bicep format/build and template lint.
   - Secret, dependency, and container vulnerability scans.
   - No Azure write access.
2. Merge to `main`:
   - Build once, push immutable SHA-tagged images to ACR.
   - Deploy the single environment using GitHub OIDC only after approval.
   - Run smoke tests against web/API health and readiness endpoints.
   - Run migration job as a separate, observable step before API traffic promotion.
3. Release:
   - Manual workflow dispatch or approved release tag.
   - Protected GitHub environment with one reviewer.
   - Reuse the exact image digest from CI.
   - Run Bicep what-if and show the diff before apply.
   - Run migration job, deploy a new Container Apps revision, smoke test, then shift traffic.
   - Keep the prior revision available for rollback.
4. Rollback:
   - Re-point traffic to the prior known-good revision.
   - Do not automatically roll back database migrations; use backward-compatible migrations and a documented forward-fix procedure.

## Network and identity plan

- Public ingress only for web initially; API is internal where the Next.js runtime can reach it.
- PostgreSQL private access is preferred; if selected-region networking complexity is too high for DEV, document the temporary public-access restriction and firewall allowlist, then remove it before PROD.
- Managed identities:
  - Container Apps runtime identity: read only required Key Vault secrets.
  - Migration job identity: migration database secret only.
  - GitHub deployment identity: scoped to `rg-khondi` and ACR push.
- Use Key Vault references rather than copying secret values into workflow variables.

## Monitoring and operations

- Alerts: failed revisions, unhealthy probes, restart loops, worker heartbeat missing, PostgreSQL unavailable, migration failure, high CPU/memory, budget thresholds, and excessive log ingestion.
- SLO candidates: web availability, API availability, readiness success rate, p95 API latency, job completion rate, migration success, and restore completion.
- Data handling: preserve the repository's redaction rules. Do not collect request bodies, prompts, LLM output, traveler PII, headers, query strings, credentials, or client IPs.
- Runbooks: deploy, rollback, migration failure, database restore, Redis outage, secret rotation, budget overrun, and teardown.

## Cost model and hard ceiling

The initial target is below $100/month for low traffic. This is a planning range, not a quote.

| Component | Control | Planning allowance |
| --- | --- | ---: |
| PostgreSQL Flexible Server | Smallest suitable tier; stop outside schedule | $25–$60 |
| Container Apps | Consumption; scale-to-zero or one small replica | $0–$15 |
| Redis | Disposable low-cost option; no managed Redis initially | $0–$10 |
| ACR, Key Vault, monitoring | Small registry, one vault, short retention and low ingestion | $5–$15 |
| Buffer | Egress/variation | $5–$10 |
| **Total target** | **Must remain below $100** | **$45–$95** |

A continuously running database, managed Redis, high log volume, HA, WAF/Front Door, geo-redundant DR, custom domains, or external provider/API usage can exceed the ceiling. Budget alerts must be configured before provisioning; any forecast over $100 pauses expansion and requires owner approval.

## Risks and open decisions

- Select region and confirm service availability/quotas.
- Confirm the PostgreSQL stop/start schedule and acceptable downtime.
- Select the low-cost Redis option and document queue-loss/retry expectations.
- Set RPO/RTO and PostgreSQL backup retention within budget.
- Confirm custom domain, DNS ownership, and TLS requirements.
- Confirm the $100 monthly ceiling and alert recipients.

## Approval gate

Please approve or revise the companion ADR and this single-environment plan. After approval, implementation can begin on an isolated branch with Bicep, GitHub Actions delivery workflow, and validation evidence. No Azure provisioning will occur without a separate, explicit environment-specific authorization after the implementation PR is reviewed.
