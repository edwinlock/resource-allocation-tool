#!/bin/bash

# LEARN Database Backup Script
# This script creates compressed backups of the SQLite database
# Can be run hourly or daily via cron/scheduled tasks

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="${DB_PATH:-$SCRIPT_DIR/instance/learn.db}"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/learn_db_$DATE.db"
COMPRESSED_FILE="$BACKUP_DIR/learn_db_$DATE.db.gz"
LOG_FILE="$BACKUP_DIR/backup.log"

# Retention settings (configurable via environment variables)
RETENTION_DAYS="${RETENTION_DAYS:-30}"  # Keep backups for 30 days by default
MAX_BACKUPS="${MAX_BACKUPS:-720}"       # Keep max 720 backups (30 days hourly)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

# Start backup
log "Starting database backup..."

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    log "ERROR - sqlite3 command not found. Please install SQLite3."
    exit 1
fi

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    log "ERROR - Database file not found at $DB_PATH"
    exit 1
fi

# Get database size
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
log "Database size: $DB_SIZE"

# Create backup using SQLite's built-in backup command
# This is safer than cp because it handles concurrent access and ensures consistency
if sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"; then
    log "Backup created: $BACKUP_FILE"
else
    log "ERROR - SQLite backup failed"
    exit 1
fi

# Compress the backup using gzip
if gzip -9 "$BACKUP_FILE"; then
    log "Backup compressed: $COMPRESSED_FILE"

    # Get compressed size
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    log "Compressed size: $COMPRESSED_SIZE"
else
    log "ERROR - Failed to compress backup"
    exit 1
fi

# Cleanup old backups

# Method 1: Remove backups older than RETENTION_DAYS
DELETED_BY_AGE=$(find "$BACKUP_DIR" -name "learn_db_*.db.gz" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED_BY_AGE" -gt 0 ]; then
    log "Deleted $DELETED_BY_AGE backup(s) older than $RETENTION_DAYS days"
fi

# Method 2: Keep only MAX_BACKUPS most recent backups (prevents runaway disk usage)
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "learn_db_*.db.gz" -type f | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    EXCESS=$((BACKUP_COUNT - MAX_BACKUPS))
    log "Found $BACKUP_COUNT backups, keeping $MAX_BACKUPS (removing $EXCESS oldest)"

    # Delete oldest backups beyond MAX_BACKUPS
    find "$BACKUP_DIR" -name "learn_db_*.db.gz" -type f -printf '%T+ %p\n' | \
        sort | \
        head -n "$EXCESS" | \
        cut -d' ' -f2- | \
        xargs rm -f

    log "Removed $EXCESS oldest backup(s)"
fi

# Summary
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "learn_db_*.db.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Backup complete. Total backups: $TOTAL_BACKUPS, Total size: $TOTAL_SIZE"

exit 0
