# Khondi Azure DEV/PROD implementation plan

- Status: Draft for Product Owner approval
- Date: 2026-11-24
- No Azure resources provisioned
- No production deployment authorized

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

## Proposed environment layout

| Concern | DEV | PROD |
| --- | --- | --- |
| Resource group | `rg-khondi-dev` | `rg-khondi-prod` |
| Container Apps environment | Dedicated | Dedicated |
| Web/API scale | Scale-to-zero where acceptable | Minimum one web/API replica |
| Worker | One small replica when testing | At least one replica |
| PostgreSQL | Smallest suitable Flexible Server; scheduled stop/start if acceptable | Small always-on Flexible Server; HA only after SLO requires it |
| Redis | Disposable lower-cost option during early development | Managed Redis with TLS |
| Secrets | DEV Key Vault | PROD Key Vault, separate identity and access |
| Logs | Short retention and low ingestion budget | Longer retention, alerts, controlled sampling |
| Data | Synthetic/demo only | Production data with restore and retention policy |
| Deployment | Manual or protected DEV environment | Manual approval + protected environment |
| DNS/TLS | Azure-provided hostname initially | Custom domain and managed certificate when approved |

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
    dev.parameters.json
    prod.parameters.json
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
   - Deploy DEV using GitHub OIDC only if the DEV environment policy is approved.
   - Run smoke tests against web/API health and readiness endpoints.
   - Run migration job as a separate, observable step before API traffic promotion.
3. PROD release:
   - Manual workflow dispatch or approved release tag.
   - Protected GitHub environment with reviewers.
   - Reuse the exact image digest promoted from DEV.
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
  - GitHub DEV identity: scoped to DEV resource group and ACR push.
  - GitHub PROD identity: separate, protected, and limited to the approved deployment resource group.
- Use Key Vault references rather than copying secret values into workflow variables.

## Monitoring and operations

- Alerts: failed revisions, unhealthy probes, restart loops, worker heartbeat missing, PostgreSQL unavailable, migration failure, high CPU/memory, budget thresholds, and excessive log ingestion.
- SLO candidates: web availability, API availability, readiness success rate, p95 API latency, job completion rate, migration success, and restore completion.
- Data handling: preserve the repository's redaction rules. Do not collect request bodies, prompts, LLM output, traveler PII, headers, query strings, credentials, or client IPs.
- Runbooks: deploy, rollback, migration failure, database restore, Redis outage, secret rotation, budget overrun, and teardown.

## Cost model and approval budget

These are planning ranges for a low-traffic initial deployment, not a quote.

| Environment | Expected monthly range | Main assumptions |
| --- | ---: | --- |
| DEV | $25–$90 stopped nightly; $80–$180 always-on | One small PostgreSQL server, low Container Apps usage, small registry/Key Vault, modest logs, lower-cost Redis |
| PROD | $180–$450 | One small always-on PostgreSQL server, managed Redis, minimum web/API/worker capacity, modest monitoring and egress |
| DR expansion | +$150–$500+ | Second region, replicated database/backup strategy, duplicated runtime/monitoring |

Verify exact prices with the Azure Pricing Calculator in the selected region. PostgreSQL pricing is especially sensitive to compute tier, storage, backup retention, HA, and whether the server is stopped. Container Apps Consumption can scale to zero, but always-on minimum replicas, Redis, logs, egress, and provider/API usage can dominate the total.

## Risks and open decisions

- Select region and confirm service availability/quotas.
- Decide whether PROD needs private networking on day one.
- Select the exact Redis product/SKU and define queue-loss/retry expectations.
- Set RPO/RTO and PostgreSQL backup retention.
- Confirm custom domain, DNS ownership, and TLS requirements.
- Confirm whether DEV may stop PostgreSQL automatically.
- Confirm monthly budgets and who receives alerts.
- Confirm whether deployment should be in the same subscription or separate DEV/PROD subscriptions.

## Approval gate

Please approve or revise the companion ADR and this plan. After approval, implementation can begin on an isolated branch with Bicep, GitHub Actions delivery workflow, and validation evidence. No Azure provisioning will occur without a separate, explicit environment-specific authorization after the implementation PR is reviewed.
