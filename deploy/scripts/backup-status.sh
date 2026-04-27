#!/bin/bash

BACKUP_DIR="${BACKUP_DIR:-/backups/postgresql}"

echo "=== Backup Status Report ==="
echo "Generated: $(date)"
echo ""

echo "Recent backups:"
ls -lh "$BACKUP_DIR"/bluecollar_*.sql.gz 2>/dev/null | tail -5 || echo "No backups found"

echo ""
echo "Backup statistics:"
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "bluecollar_*.sql.gz" 2>/dev/null | wc -l)

echo "Total backups: $BACKUP_COUNT"
echo "Total size: $TOTAL_SIZE"

echo ""
echo "Oldest backup:"
ls -lh "$BACKUP_DIR"/bluecollar_*.sql.gz 2>/dev/null | head -1 || echo "No backups found"

echo ""
echo "Newest backup:"
ls -lh "$BACKUP_DIR"/bluecollar_*.sql.gz 2>/dev/null | tail -1 || echo "No backups found"
