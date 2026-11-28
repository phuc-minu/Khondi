# Khondi Azure Bicep

Initial single-environment Azure baseline.

Target:
- Resource group: rg-khondi
- Region: West US 2
- Budget alert: $100/month
- Services: ACR, Container Apps, web, API, PostgreSQL Flexible Server, Key Vault, Log Analytics/Application Insights
- Excluded initially: Redis and worker

The template is parameterized for image references and secrets. Never commit database passwords, connection strings, tokens, or the real GitHub token. The parameter file contains placeholders and is not deployable until protected values and immutable image references are supplied.

Validation:

az bicep build --file infra/azure/main.bicep

az deployment group what-if --resource-group rg-khondi --template-file infra/azure/main.bicep --parameters infra/azure/single.bicepparam --parameters postgresAdminPassword='<secret>' databaseUrl='<secret>'

The what-if command is review-only. Do not run az deployment group create until the IaC PR is reviewed and explicit deployment approval is recorded.
