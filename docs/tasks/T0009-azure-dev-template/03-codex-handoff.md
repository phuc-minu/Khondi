# T0009 · Azure Bicep baseline · Codex → Claude handoff

| Field | Value |
| --- | --- |
| Task | T0009-azure-dev-template |
| Step | 3 · Implementation handoff |
| Author | Codex (DevOps) |
| For | Claude (code review and QA) |
| Date (UTC) | 2026-11-26 |
| Branch | `codex/azure-dev-prod-plan` |
| Commit reviewed | `f160dccd638e8319adf08dd0eb22cceebb50aff7` |
| PR | #88 (draft/owner review) |
| State | `needs-claude-review` |

## What changed

This PR adds the first Bicep implementation for the approved single-environment Khondi Azure baseline.

- `infra/azure/main.bicep`: parameterized resource-group deployment for ACR, Log Analytics, Application Insights, Key Vault, PostgreSQL Flexible Server 16, Container Apps environment, web/API Container Apps, and a $100 monthly budget alert.
- `infra/azure/single.bicepparam`: non-secret West US 2 parameters and placeholders for image references and tenant ID. Secrets are intentionally omitted.
- `infra/azure/README.md`: review-only build and what-if commands plus deployment safeguards.
- `docs/architecture/ADR-0001-azure-dev-prod.md` and `docs/infra/azure-dev-prod-plan.md`: single-environment architecture, cost target, and explicit exclusion of Redis/worker from the first deployment.

No Azure service deployment was executed. The resource group `rg-khondi` already exists in West US 2; this PR does not modify it.

## Acceptance criteria

| # | Criterion | Done? | Where |
| --- | --- | --- | --- |
| 1 | Bicep template describes the initial single environment | partial | `infra/azure/main.bicep`; requires review and provider/API validation |
| 2 | Secrets are not committed | yes | Secure Bicep parameters; placeholders only in `single.bicepparam` |
| 3 | Redis and worker are excluded initially | yes | Main template and plan |
| 4 | Cost alert is included at $100/month | yes | `Microsoft.Consumption/budgets` resource |
| 5 | Template is validated with `az bicep build` | no | Not run in this handoff environment |
| 6 | Azure what-if completed | no | Intentionally not run; images and secret values are not available |
| 7 | Azure resources provisioned | no | Explicitly not authorized in this PR |

The Bicep build and what-if must be run in CI or an authorized Azure environment before deployment approval.

## Commands run and real output

The GitHub Actions diff-hygiene job initially ran:

```text
$ python scripts/check_diff_hygiene.py "origin/main"
Code changed but no handoff file under docs/tasks/T####-<slug>/ was added. See docs/tasks/README.md.
See 'Code quality rules' in AGENTS.md.
Process completed with exit code 1.
```

The handoff file was added to satisfy the repository workflow requirement. `az bicep build` and Azure what-if have not been run yet.

## Quality rules self-check

- Q1–Q16: no application-code changes are included.
- Infrastructure safeguards: no secrets, tokens, passwords, or connection strings are committed.
- Approval gate: implementation remains subject to ADR/plan approval and separate deployment authorization.
- Exceptions: validation evidence is partial because Azure CLI build/what-if was not available in the GitHub job at hand.

## New dependencies

None.

## Deviations from the spec

- The original T0002 parity design covered Redis, worker, and telemetry collector. The current owner-directed plan intentionally excludes Redis and the worker from the first low-cost deployment. This requires a tested Redis-optional application path before deployment.
- The template currently contains an internal API URL and system-assigned registry identities; Claude should verify Container Apps internal DNS and add registry pull role assignments before private ACR images are deployed.

## Risks and known limits

- Existing backend settings and readiness may still require `REDIS_URL`; the synchronous deployment cannot be considered runnable until that application contract is changed or Redis is restored.
- The `ENVIRONMENT` value must be accepted by both applications; resource naming and application environment values may need to be separate.
- Container App managed identities need scoped AcrPull permissions before pulling private ACR images.
- PostgreSQL public network access is a cost-conscious bootstrap choice and must be tightened before sensitive data is used.
- The template is an initial baseline, not a production-ready deployment.

## Follow-ups (not in this PR)

- Add Redis-optional API behavior and tests, then add the worker/Redis extension when asynchronous work is required.
- Add explicit AcrPull role assignments or a documented bootstrap sequence.
- Add CI Bicep build/lint and security scanning.
- Add a migration Container Apps Job after the application contract is finalized.
- Record Gate 1 approval in the task folder before any Azure service deployment.
