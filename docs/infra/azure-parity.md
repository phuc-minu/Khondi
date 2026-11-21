# Khondi local-to-Azure parity

T0003 establishes the shared service configuration contract. Local Compose and Azure Container Apps use the same variable names; secrets are supplied by environment-specific secret stores.

| Local service | Azure target | Image/configuration contract |
| --- | --- | --- |
| web | Azure Container App | `frontend/Dockerfile`, `PORT`, `ENVIRONMENT`, `API_BASE_URL` |
| api | Azure Container App | `backend/Dockerfile`, `PORT`, `ENVIRONMENT`, `DATABASE_URL`, `REDIS_URL` |
| worker | Azure Container App job | api image, separate command (T0006) |
| PostgreSQL | Azure Database for PostgreSQL Flexible Server | URL only (T0005) |
| Redis | Azure Container App or managed Redis | URL only (T0006) |
| OpenTelemetry collector | Azure Container App | OTLP endpoint (T0007) |
| `khondi-pgdata` volume (PostgreSQL data) | Flexible Server managed storage and automatic backups | No volume in Azure; data lives in the managed server (T0004) |
| `migrate` one-off service (`python -m khondi_api.migrate`, api image) | Container Apps Job, manual trigger, run before each api rollout | Same image and command (P1, P6) |
| `khondi_app` database role (created by `infra/postgres/init/10-app-role.sh`) | Flexible Server role with the same grants, created by the T0009 runbook | The api never connects as the admin |
| Manual `pg_dump` / `pg_restore` | Flexible Server automatic backups and point-in-time restore | Local backups are manual |

## Configuration inventory

| Variable | Used by | Required | Local source | Azure source | Secret |
| --- | --- | --- | --- | --- | --- |
| `PORT` | api, web | no | default | Container App env | no |
| `ENVIRONMENT` | api, web | yes | `.env` | Container App env | no |
| `DATABASE_URL` | api (as `khondi_app`) | yes | `.env` | Key Vault reference | yes |
| `REDIS_URL` | api | yes | `.env` | Key Vault reference | yes |
| `API_BASE_URL` | web | yes | `.env` | Container App env | no |
| `MIGRATIONS_DATABASE_URL` | migrate | yes | `.env` | Key Vault reference, read only by the migrate job | yes |
| `POSTGRES_APP_PASSWORD` | local `postgres` init script only | yes (local) | `.env` | none: the T0009 runbook sets the `khondi_app` password in Key Vault | local value only |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | local `postgres` container only | yes (local) | `.env` | none: the Flexible Server admin login is set in Bicep (T0009) | local value only |
| `KHONDI_WEB_PORT`, `KHONDI_API_PORT`, `KHONDI_PG_PORT`, `KHONDI_REDIS_PORT` | Compose host-port mapping only | no | `.env` | none: local only, Container Apps ingress decides ports | no |
