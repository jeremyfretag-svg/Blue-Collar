#!/bin/bash

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgresql}"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-bluecollar}"
DB_USER="${DB_USER:-bluecollar}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bluecollar_${TIMESTAMP}.sql.gz"
BACKUP_LOG="$BACKUP_DIR/backup_${TIMESTAMP}.log"

echo "Starting backup at $(date)" | tee "$BACKUP_LOG"

# Perform backup
if pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --verbose \
  --no-password \
  2>> "$BACKUP_LOG" | gzip > "$BACKUP_FILE"; then
  
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)" | tee -a "$BACKUP_LOG"
  
  # Upload to S3 if configured
  if [ -n "$S3_BUCKET" ]; then
    echo "Uploading to S3..." | tee -a "$BACKUP_LOG"
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/" \
      --region "$AWS_REGION" \
      --sse AES256 \
      2>> "$BACKUP_LOG"
    echo "S3 upload completed" | tee -a "$BACKUP_LOG"
  fi
  
  # Clean up old backups
  echo "Cleaning up backups older than $RETENTION_DAYS days" | tee -a "$BACKUP_LOG"
  find "$BACKUP_DIR" -name "bluecollar_*.sql.gz" -mtime +$RETENTION_DAYS -delete
  
  echo "Backup process finished at $(date)" | tee -a "$BACKUP_LOG"
  exit 0
else
  echo "Backup failed!" | tee -a "$BACKUP_LOG"
  exit 1
fi
