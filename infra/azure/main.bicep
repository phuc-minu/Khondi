targetScope = 'resourceGroup'

@description('Azure region for the Khondi environment.')
param location string = resourceGroup().location
@description('Short environment name used in resource names and tags.')
param environmentName string = 'single'
@description('Unique suffix for globally unique resource names.')
param nameSuffix string
@description('PostgreSQL administrator login.')
param postgresAdminLogin string
@secure()
@description('PostgreSQL administrator password. Supply only at deployment time.')
param postgresAdminPassword string
@secure()
@description('Application database connection string. Supply only at deployment time.')
param databaseUrl string
@description('Container image for the Next.js web app.')
param webImage string
@description('Container image for the Python API.')
param apiImage string
@description('Tenant ID used by Key Vault and managed identities.')
param tenantId string
@description('Monthly budget alert threshold in USD.')
param monthlyBudget int = 100

var tags = {
  app: 'khondi'
  environment: environmentName
  owner: 'phuc'
  managedBy: 'bicep'
  budgetTarget: 'under-100'
}
var acrName = 'khondi${nameSuffix}acr'
var logName = 'khondi-${environmentName}-logs'
var appInsightsName = 'khondi-${environmentName}-insights'
var keyVaultName = 'khondi-${nameSuffix}-kv'
var managedEnvironmentName = 'khondi-${environmentName}'
var postgresName = 'khondi-${environmentName}-pg'
var webAppName = 'khondi-${environmentName}-web'
var apiAppName = 'khondi-${environmentName}-api'

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
  tags: tags
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 7
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
  tags: tags
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    RetentionInDays: 30
  }
  tags: tags
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
  tags: tags
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    version: '16'
    storage: {
      storageSizeGB: 32
      autoGrow: 'Disabled'
      storageType: 'Premium_LRS'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
  }
  tags: tags
}

resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource managedEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: managedEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: listKeys(logAnalytics.id, '2023-09-01').primarySharedKey
      }
    }
  }
  tags: tags
}

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: apiAppName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      ingress: {
        external: false
        targetPort: 8000
        transport: 'http'
      }
      secrets: [
        {
          name: 'database-url'
          value: databaseUrl
        }
      ]
      registries: [
        {
          server: acr.properties.loginServer
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          env: [
            { name: 'PORT'; value: '8000' }
            { name: 'ENVIRONMENT'; value: environmentName }
            { name: 'DATABASE_URL'; secretRef: 'database-url' }
          ]
          probes: [
            {
              type: 'Readiness'
              httpGet: { path: '/readyz'; port: 8000 }
              initialDelaySeconds: 10
              periodSeconds: 15
            }
          ]
          resources: { cpu: 0.25; memory: '0.5Gi' }
        }
      ]
      scale: { minReplicas: 0; maxReplicas: 1 }
    }
  }
  tags: tags
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: webAppName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: acr.properties.loginServer
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          env: [
            { name: 'PORT'; value: '3000' }
            { name: 'ENVIRONMENT'; value: environmentName }
            { name: 'API_BASE_URL'; value: 'http://${apiAppName}' }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/healthz'; port: 3000 }
              initialDelaySeconds: 10
              periodSeconds: 15
            }
          ]
          resources: { cpu: 0.25; memory: '0.5Gi' }
        }
      ]
      scale: { minReplicas: 0; maxReplicas: 1 }
    }
  }
  tags: tags
}

resource budget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: 'khondi-monthly-budget'
  properties: {
    category: 'Cost'
    amount: monthlyBudget
    timeGrain: 'Monthly'
    timePeriod: { startDate: '2026-11-01T00:00:00Z' }
    notifications: {
      fiftyPercent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 50
        contactEmails: []
        contactRoles: [ 'Owner' ]
      }
      seventyFivePercent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 75
        contactEmails: []
        contactRoles: [ 'Owner' ]
      }
      oneHundredPercent: {
        enabled: true
        operator: 'GreaterThan'
        threshold: 100
        contactEmails: []
        contactRoles: [ 'Owner' ]
      }
    }
  }
}

output resourceGroupName string = resourceGroup().name
output containerRegistryLoginServer string = acr.properties.loginServer
output webAppName string = web.name
output apiAppName string = api.name
output postgresName string = postgres.name
output keyVaultName string = keyVault.name
