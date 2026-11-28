using './main.bicep'

param location = 'westus2'
param environmentName = 'single'
param nameSuffix = 'phuc'
param postgresAdminLogin = 'khondiadmin'
param webImage = 'REPLACE_WITH_ACR_WEB_IMAGE_DIGEST'
param apiImage = 'REPLACE_WITH_ACR_API_IMAGE_DIGEST'
param tenantId = 'REPLACE_WITH_AZURE_TENANT_ID'
param monthlyBudget = 100

// Secret parameters are intentionally omitted. Supply postgresAdminPassword and databaseUrl
// at deployment time from a protected secret source. Do not commit values here.
