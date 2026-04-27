#!/bin/bash

set -e

# Configuration
BACKUP_FILE="${1:?Backup file required}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-bluecollar}"
DB_USER="${DB_USER:-bluecollar}"

echo "WARNING: This will restore the database from backup: $BACKUP_FILE"
echo "Current data will be lost. Continue? (yes/no)"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

echo "Starting restore at $(date)"

# Drop existing database
echo "Dropping existing database..."
dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null || true

# Create new database
echo "Creating new database..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Restore from backup
echo "Restoring from backup..."
if gunzip -c "$BACKUP_FILE" | psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME"; then
  
  echo "Restore completed successfully at $(date)"
  exit 0
else
  echo "Restore failed!"
  exit 1
fi
