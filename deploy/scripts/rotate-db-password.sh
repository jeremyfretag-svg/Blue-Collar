#!/bin/bash

set -e

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"
DB_HOST="${DB_HOST:-db}"
DB_USER="${DB_USER:-bluecollar}"
DB_NAME="${DB_NAME:-bluecollar}"
NEW_PASSWORD=$(openssl rand -base64 32)

echo "Rotating database password..."

# Update password in database
PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" << EOF
ALTER USER $DB_USER WITH PASSWORD '$NEW_PASSWORD';
EOF

# Update password in Vault
curl -X POST "$VAULT_ADDR/v1/kv/data/bluecollar/database" \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"data\": {
      \"username\": \"$DB_USER\",
      \"password\": \"$NEW_PASSWORD\",
      \"host\": \"$DB_HOST\",
      \"port\": \"5432\",
      \"database\": \"$DB_NAME\"
    }
  }"

echo "Database password rotated successfully"
