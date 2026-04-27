#!/bin/bash

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"
DB_USER="${DB_USER:-bluecollar}"
DB_PASSWORD="${DB_PASSWORD:-bluecollar}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-bluecollar}"

echo "Setting up Vault secrets..."

# Enable KV secrets engine
echo "Enabling KV secrets engine..."
curl -X POST "$VAULT_ADDR/v1/sys/mounts/kv" \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kv",
    "options": {
      "version": "2"
    }
  }' 2>/dev/null || echo "KV engine already enabled"

# Store database credentials
echo "Storing database credentials..."
curl -X POST "$VAULT_ADDR/v1/kv/data/bluecollar/database" \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"username\": \"$DB_USER\",
      \"password\": \"$DB_PASSWORD\",
      \"host\": \"$DB_HOST\",
      \"port\": \"$DB_PORT\",
      \"database\": \"$DB_NAME\"
    }
  }"

# Store API secrets
echo "Storing API secrets..."
curl -X POST "$VAULT_ADDR/v1/kv/data/bluecollar/api" \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"jwt_secret\": \"$(openssl rand -base64 32)\",
      \"google_client_id\": \"${GOOGLE_CLIENT_ID:-}\",
      \"google_client_secret\": \"${GOOGLE_CLIENT_SECRET:-}\",
      \"mail_host\": \"${MAIL_HOST:-}\",
      \"mail_port\": \"${MAIL_PORT:-587}\",
      \"mail_user\": \"${MAIL_USER:-}\",
      \"mail_pass\": \"${MAIL_PASS:-}\"
    }
  }"

# Store AWS credentials
echo "Storing AWS credentials..."
curl -X POST "$VAULT_ADDR/v1/kv/data/bluecollar/aws" \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"access_key_id\": \"${AWS_ACCESS_KEY_ID:-}\",
      \"secret_access_key\": \"${AWS_SECRET_ACCESS_KEY:-}\",
      \"region\": \"${AWS_REGION:-us-east-1}\",
      \"s3_bucket\": \"${BACKUP_S3_BUCKET:-}\"
    }
  }"

echo "Vault setup completed successfully"
