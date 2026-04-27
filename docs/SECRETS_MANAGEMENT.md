# Secrets Management Guide

This guide covers secure secrets management using HashiCorp Vault for BlueCollar.

## Architecture

```
Application
      ↓
  Vault Client
      ↓
  HashiCorp Vault
      ↓
  Secret Storage
      ↓
  Audit Logging
```

## 1. Vault Installation and Setup

### 1.1 Docker Compose Integration

Add Vault to `docker-compose.prod.example.yml`:

```yaml
vault:
  image: vault:latest
  restart: unless-stopped
  cap_add:
    - IPC_LOCK
  environment:
    VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_ROOT_TOKEN:-myroot}
    VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
  volumes:
    - vault_data:/vault/data
    - ./deploy/vault/config.hcl:/vault/config/config.hcl:ro
  expose:
    - '8200'
  networks:
    - internal
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '5'
```

### 1.2 Vault Configuration

Create `deploy/vault/config.hcl`:

```hcl
storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable   = true
}

ui = true
```

## 2. Vault Initialization

### 2.1 Initialize Vault

```bash
docker exec vault vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-keys.json
```

### 2.2 Unseal Vault

```bash
# Extract unseal keys
UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' vault-keys.json)
UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' vault-keys.json)
UNSEAL_KEY_3=$(jq -r '.unseal_keys_b64[2]' vault-keys.json)

# Unseal
docker exec vault vault operator unseal $UNSEAL_KEY_1
docker exec vault vault operator unseal $UNSEAL_KEY_2
docker exec vault vault operator unseal $UNSEAL_KEY_3
```

### 2.3 Login to Vault

```bash
ROOT_TOKEN=$(jq -r '.root_token' vault-keys.json)
docker exec vault vault login $ROOT_TOKEN
```

## 3. Secret Storage Configuration

### 3.1 Enable KV Secrets Engine

```bash
docker exec vault vault secrets enable -version=2 kv
```

### 3.2 Store Database Credentials

```bash
docker exec vault vault kv put kv/bluecollar/database \
  username=bluecollar \
  password=secure_password \
  host=db \
  port=5432 \
  database=bluecollar
```

### 3.3 Store API Secrets

```bash
docker exec vault vault kv put kv/bluecollar/api \
  jwt_secret=your_jwt_secret \
  google_client_id=your_google_client_id \
  google_client_secret=your_google_client_secret \
  mail_host=smtp.example.com \
  mail_port=587 \
  mail_user=noreply@example.com \
  mail_pass=mail_password
```

### 3.4 Store AWS Credentials

```bash
docker exec vault vault kv put kv/bluecollar/aws \
  access_key_id=your_access_key \
  secret_access_key=your_secret_key \
  region=us-east-1 \
  s3_bucket=bluecollar-backups
```

## 4. Authentication Methods

### 4.1 AppRole Authentication

Enable AppRole:
```bash
docker exec vault vault auth enable approle
```

Create AppRole:
```bash
docker exec vault vault write auth/approle/role/bluecollar-api \
  token_ttl=1h \
  token_max_ttl=4h \
  policies="bluecollar-api"
```

Get Role ID:
```bash
docker exec vault vault read auth/approle/role/bluecollar-api/role-id
```

Generate Secret ID:
```bash
docker exec vault vault write -f auth/approle/role/bluecollar-api/secret-id
```

### 4.2 Kubernetes Authentication

Enable Kubernetes auth:
```bash
docker exec vault vault auth enable kubernetes
```

Configure Kubernetes:
```bash
docker exec vault vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
```

## 5. Policies

### 5.1 Create API Policy

Create `deploy/vault/policies/bluecollar-api.hcl`:

```hcl
# Read secrets
path "kv/data/bluecollar/api" {
  capabilities = ["read", "list"]
}

path "kv/data/bluecollar/database" {
  capabilities = ["read", "list"]
}

path "kv/data/bluecollar/aws" {
  capabilities = ["read", "list"]
}

# Renew token
path "auth/token/renew-self" {
  capabilities = ["update"]
}

# Lookup token
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
```

Apply policy:
```bash
docker exec vault vault policy write bluecollar-api /vault/policies/bluecollar-api.hcl
```

## 6. Secret Rotation

### 6.1 Database Password Rotation

Create `deploy/scripts/rotate-db-password.sh`:

```bash
#!/bin/bash

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"
NEW_PASSWORD=$(openssl rand -base64 32)

echo "Rotating database password..."

# Update password in database
psql -h db -U bluecollar -d bluecollar << EOF
ALTER USER bluecollar WITH PASSWORD '$NEW_PASSWORD';
EOF

# Update password in Vault
curl -X POST "$VAULT_ADDR/v1/kv/data/bluecollar/database" \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d "{
    \"data\": {
      \"username\": \"bluecollar\",
      \"password\": \"$NEW_PASSWORD\",
      \"host\": \"db\",
      \"port\": \"5432\",
      \"database\": \"bluecollar\"
    }
  }"

echo "Database password rotated successfully"
```

### 6.2 API Secret Rotation

Create `deploy/scripts/rotate-api-secrets.sh`:

```bash
#!/bin/bash

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"
NEW_JWT_SECRET=$(openssl rand -base64 32)

echo "Rotating API secrets..."

# Generate new JWT secret
curl -X POST "$VAULT_ADDR/v1/kv/data/bluecollar/api" \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d "{
    \"data\": {
      \"jwt_secret\": \"$NEW_JWT_SECRET\",
      \"google_client_id\": \"$(curl -s $VAULT_ADDR/v1/kv/data/bluecollar/api -H \"X-Vault-Token: $VAULT_TOKEN\" | jq -r '.data.data.google_client_id')\",
      \"google_client_secret\": \"$(curl -s $VAULT_ADDR/v1/kv/data/bluecollar/api -H \"X-Vault-Token: $VAULT_TOKEN\" | jq -r '.data.data.google_client_secret')\"
    }
  }"

echo "API secrets rotated successfully"
```

## 7. Audit Logging

### 7.1 Enable Audit Logging

```bash
docker exec vault vault audit enable file file_path=/vault/logs/audit.log
```

### 7.2 View Audit Logs

```bash
docker exec vault tail -f /vault/logs/audit.log
```

### 7.3 Audit Log Configuration

Add to `docker-compose.prod.example.yml`:

```yaml
volumes:
  - vault_logs:/vault/logs
```

## 8. Application Integration

### 8.1 Vault Client Library

Install dependency:
```bash
npm install node-vault
```

### 8.2 Create Vault Service

Create `packages/api/src/services/vault.ts`:

```typescript
import * as NodeVault from 'node-vault';

const vault = new NodeVault({
  endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN,
});

export async function getSecret(path: string) {
  try {
    const secret = await vault.read(`kv/data/bluecollar/${path}`);
    return secret.data.data;
  } catch (error) {
    console.error(`Failed to retrieve secret: ${path}`, error);
    throw error;
  }
}

export async function setSecret(path: string, data: Record<string, string>) {
  try {
    await vault.write(`kv/data/bluecollar/${path}`, { data });
  } catch (error) {
    console.error(`Failed to set secret: ${path}`, error);
    throw error;
  }
}

export async function rotateSecret(path: string, newData: Record<string, string>) {
  try {
    await setSecret(path, newData);
    console.log(`Secret rotated: ${path}`);
  } catch (error) {
    console.error(`Failed to rotate secret: ${path}`, error);
    throw error;
  }
}
```

### 8.3 Load Secrets on Startup

Update `packages/api/src/index.ts`:

```typescript
import { getSecret } from './services/vault';

async function initializeSecrets() {
  try {
    const dbSecret = await getSecret('database');
    const apiSecret = await getSecret('api');
    
    process.env.DATABASE_URL = `postgresql://${dbSecret.username}:${dbSecret.password}@${dbSecret.host}:${dbSecret.port}/${dbSecret.database}`;
    process.env.JWT_SECRET = apiSecret.jwt_secret;
    process.env.GOOGLE_CLIENT_ID = apiSecret.google_client_id;
    process.env.GOOGLE_CLIENT_SECRET = apiSecret.google_client_secret;
    
    console.log('Secrets loaded from Vault');
  } catch (error) {
    console.error('Failed to load secrets from Vault', error);
    process.exit(1);
  }
}

await initializeSecrets();
```

## 9. Environment Variables Migration

### 9.1 Before (Direct Environment Variables)

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=secret123
GOOGLE_CLIENT_ID=client_id
GOOGLE_CLIENT_SECRET=client_secret
```

### 9.2 After (Vault-based)

```env
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=s.xxxxxxxxxxxxxxxx
VAULT_ROLE_ID=role_id
VAULT_SECRET_ID=secret_id
```

## 10. Deployment Checklist

- [ ] Vault is deployed and unsealed
- [ ] Secrets are stored in Vault
- [ ] Policies are configured
- [ ] AppRole authentication is set up
- [ ] Audit logging is enabled
- [ ] Secret rotation scripts are in place
- [ ] Application can authenticate with Vault
- [ ] Secrets are loaded on startup
- [ ] Backup of Vault keys is secure
- [ ] Team is trained on Vault operations

## 11. Best Practices

- Never commit secrets to version control
- Use short-lived tokens (1-4 hours)
- Rotate secrets regularly (monthly)
- Enable audit logging for all secret access
- Use AppRole for applications
- Use Kubernetes auth for K8s deployments
- Backup Vault keys securely
- Monitor Vault for unauthorized access
- Use separate policies for different services
- Document secret management procedures
