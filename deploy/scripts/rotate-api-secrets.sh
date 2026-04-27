#!/bin/bash

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"
NEW_JWT_SECRET=$(openssl rand -base64 32)

echo "Rotating API secrets..."

# Get current secrets
CURRENT_SECRETS=$(curl -s "$VAULT_ADDR/v1/kv/data/bluecollar/api" \
  -H "X-Vault-Token: $VAULT_TOKEN")

GOOGLE_CLIENT_ID=$(echo "$CURRENT_SECRETS" | jq -r '.data.data.google_client_id')
GOOGLE_CLIENT_SECRET=$(echo "$CURRENT_SECRETS" | jq -r '.data.data.google_client_secret')
MAIL_HOST=$(echo "$CURRENT_SECRETS" | jq -r '.data.data.mail_host')
MAIL_PORT=$(echo "$CURRENT_SECRETS" | jq -r '.data.data.mail_port')
MAIL_USER=$(echo "$CURRENT_SECRETS" | jq -r '.data.data.mail_user')
MAIL_PASS=$(echo "$CURRENT_SECRETS" | jq -r '.data.data.mail_pass')

# Update JWT secret in Vault
curl -X POST "$VAULT_ADDR/v1/kv/data/bluecollar/api" \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"jwt_secret\": \"$NEW_JWT_SECRET\",
      \"google_client_id\": \"$GOOGLE_CLIENT_ID\",
      \"google_client_secret\": \"$GOOGLE_CLIENT_SECRET\",
      \"mail_host\": \"$MAIL_HOST\",
      \"mail_port\": \"$MAIL_PORT\",
      \"mail_user\": \"$MAIL_USER\",
      \"mail_pass\": \"$MAIL_PASS\"
    }
  }"

echo "API secrets rotated successfully"
