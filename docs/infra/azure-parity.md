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

## Configuration inventory

| Variable | Used by | Required | Local source | Azure source | Secret |
| --- | --- | --- | --- | --- | --- |
| `PORT` | api, web | no | default | Container App env | no |
| `ENVIRONMENT` | api, web | yes | `.env` | Container App env | no |
| `DATABASE_URL` | api | yes | `.env` | Key Vault reference | yes |
| `REDIS_URL` | api | yes | `.env` | Key Vault reference | yes |
| `API_BASE_URL` | web | yes | `.env` | Container App env | no |
