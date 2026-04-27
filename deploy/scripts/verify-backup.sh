#!/bin/bash

set -e

# Configuration
BACKUP_FILE="${1:?Backup file required}"
VERIFY_DB="${VERIFY_DB:-bluecollar_verify}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-bluecollar}"

echo "Verifying backup: $BACKUP_FILE"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Check file integrity
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo "Error: Backup file is corrupted"
  exit 1
fi

echo "Backup file integrity: OK"

# Create temporary database for verification
echo "Creating temporary verification database..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$VERIFY_DB" 2>/dev/null || true

# Restore backup to temporary database
echo "Restoring backup to temporary database..."
if gunzip -c "$BACKUP_FILE" | psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$VERIFY_DB" \
  > /dev/null 2>&1; then
  
  echo "Backup restoration: OK"
  
  # Verify database integrity
  echo "Verifying database integrity..."
  TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$VERIFY_DB" \
    -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
  
  if [ "$TABLES" -gt 0 ]; then
    echo "Database integrity: OK (found $TABLES tables)"
  else
    echo "Error: No tables found in restored database"
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$VERIFY_DB"
    exit 1
  fi
  
  # Clean up
  echo "Cleaning up temporary database..."
  dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$VERIFY_DB"
  
  echo "Backup verification: PASSED"
  exit 0
else
  echo "Error: Failed to restore backup"
  dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$VERIFY_DB" 2>/dev/null || true
  exit 1
fi
