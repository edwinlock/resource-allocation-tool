# Database Backup Script

## Overview

The `backup_database.sh` script provides automated, compressed backups of the SQLite database with intelligent cleanup and error handling.

## Why Use SQLite's `.backup` Command?

The script uses SQLite's built-in `.backup` command instead of simple file copying for several important reasons:

### Advantages of `sqlite3 .backup`:

1. **Consistency**: Creates a consistent snapshot even if the database is being written to
2. **Integrity**: Ensures the backup is a valid SQLite database file
3. **Hot Backup**: Can backup a live database without locking or downtime
4. **ACID Compliance**: Respects SQLite's ACID properties during backup
5. **Safe Concurrent Access**: Handles multiple connections gracefully

### Comparison:

| Method | Consistency | Live Backup | Corruption Risk |
|--------|-------------|-------------|-----------------|
| `cp` command | ❌ May copy mid-write | ❌ Risky | ⚠️ High if active |
| `sqlite3 .backup` | ✅ Guaranteed | ✅ Safe | ✅ None |

**Source**: [SQLite Official Documentation on Backup](https://www.sqlite.org/backup.html)

The script **requires** the `sqlite3` command to be installed. It will exit with an error if not found.

## Features

- ✅ **Safe Backups**: Uses SQLite's `.backup` command for consistency
- ✅ **Compression**: Automatic gzip compression (~90% space savings)
- ✅ **Dual Retention**: Age-based (30 days) + count-based (720 backups) cleanup
- ✅ **Detailed Logging**: Timestamps, sizes, and operation status
- ✅ **Error Handling**: Clear error messages and validation
- ✅ **Configurable**: Environment variables for all settings
- ✅ **Idempotent**: Safe to run multiple times
- ✅ **Prerequisites Check**: Verifies sqlite3 is installed before running

## Usage

### Basic Usage

```bash
./backup_database.sh
```

### With Custom Settings

```bash
# Hourly backups for 60 days
export RETENTION_DAYS=60
export MAX_BACKUPS=1440  # 60 days * 24 hours
./backup_database.sh
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `./instance/learn.db` | Path to SQLite database |
| `BACKUP_DIR` | `./backups` | Backup storage directory |
| `RETENTION_DAYS` | `30` | Keep backups for N days |
| `MAX_BACKUPS` | `720` | Maximum number of backups to keep |

## Backup Strategy Recommendations

### For Hourly Backups (Recommended)

```bash
# Default settings are optimized for hourly backups
RETENTION_DAYS=30      # 30 days of history
MAX_BACKUPS=720        # 720 hours = 30 days
```

**Disk usage example:**
- Database size: 10 MB
- Compressed size: ~1 MB (gzip compression)
- 720 backups × 1 MB = **~720 MB** total

### For Daily Backups

```bash
export RETENTION_DAYS=90
export MAX_BACKUPS=90
./backup_database.sh
```

**Disk usage example:**
- Database size: 10 MB
- Compressed size: ~1 MB
- 90 backups × 1 MB = **~90 MB** total

### For Production (Hourly + Offsite)

```bash
# Run hourly with local retention
./backup_database.sh

# Weekly offsite backup (separate script)
# Copy backups to S3, Dropbox, or external storage
```

## Cleanup Strategy

The script uses **two methods** to prevent runaway disk usage:

### 1. Age-Based Cleanup

Removes backups older than `RETENTION_DAYS`:

```bash
find "$BACKUP_DIR" -name "learn_db_*.db.gz" -type f -mtime +30 -delete
```

### 2. Count-Based Cleanup

Keeps only the `MAX_BACKUPS` most recent backups:

```bash
# If more than MAX_BACKUPS exist, delete oldest ones
# Example: 750 backups, MAX=720, delete 30 oldest
```

This **dual strategy** ensures:
- Old backups are removed even with irregular schedules
- Disk usage never exceeds a predictable limit
- Recent history is always preserved

## Scheduling

### PythonAnywhere

Create a scheduled task:

```
Time: Hourly
Command: /home/YOUR-USERNAME/backup_database.sh
```

### Standard Cron

```bash
# Hourly backup
0 * * * * /path/to/backup_database.sh >> /path/to/backup_database.log 2>&1

# Daily at 3 AM
0 3 * * * RETENTION_DAYS=90 MAX_BACKUPS=90 /path/to/backup_database.sh
```

### Systemd Timer (Linux)

Create `/etc/systemd/system/backup-database.service`:

```ini
[Unit]
Description=LEARN Database Backup

[Service]
Type=oneshot
ExecStart=/path/to/backup_database.sh
User=www-data
Environment="RETENTION_DAYS=30"
Environment="MAX_BACKUPS=720"
```

Create `/etc/systemd/system/backup-database.timer`:

```ini
[Unit]
Description=Hourly database backup

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:
```bash
systemctl enable backup-database.timer
systemctl start backup-database.timer
```

## Monitoring

### Check Last Backup

```bash
# View most recent backup
ls -lht /path/to/backups/ | head -5

# Check log file
tail -n 20 /path/to/backups/backup.log
```

### Verify Backup Integrity

```bash
# Decompress and verify database
gunzip -c /path/to/backups/learn_db_20251005_113000.db.gz > /tmp/test.db
sqlite3 /tmp/test.db "PRAGMA integrity_check;"
# Should output: ok
```

### Monitor Disk Usage

```bash
# Total backup size
du -sh /path/to/backups/

# Number of backups
ls -1 /path/to/backups/learn_db_*.db.gz | wc -l
```

## Restoration

### Restore from Backup

```bash
# 1. Stop the application
# 2. Decompress backup
gunzip -c /path/to/backups/learn_db_YYYYMMDD_HHMMSS.db.gz > /tmp/restore.db

# 3. Verify integrity
sqlite3 /tmp/restore.db "PRAGMA integrity_check;"

# 4. Replace current database
cp /tmp/restore.db /path/to/instance/learn.db

# 5. Restart application
```

### List Available Backups

```bash
# Show all backups with dates
ls -lh /path/to/backups/learn_db_*.db.gz

# Show only filenames (sorted)
ls -1t /path/to/backups/learn_db_*.db.gz | head -10
```

## Troubleshooting

### "sqlite3: command not found"

The script requires SQLite3 to be installed. Install it:

```bash
# Ubuntu/Debian (PythonAnywhere uses Ubuntu - already installed)
sudo apt-get install sqlite3

# macOS (already included with macOS)
brew install sqlite3

# Verify installation
which sqlite3
sqlite3 --version
```

**Note**: On PythonAnywhere, SQLite3 is pre-installed at `/usr/bin/sqlite3`. You shouldn't encounter this error.

### "Permission denied"

Ensure script is executable and you have write permissions:

```bash
chmod +x backup_database.sh
chmod 755 /path/to/backups/
```

### "Backup file too large"

Increase compression level or clean old backups:

```bash
# Reduce retention
export RETENTION_DAYS=14
export MAX_BACKUPS=336  # 14 days hourly

# Or manually delete old backups
find /path/to/backups/ -name "learn_db_*.db.gz" -mtime +7 -delete
```

### "Database is locked"

SQLite's `.backup` command handles locks gracefully, but if issues persist:

```bash
# Check for active connections
lsof /path/to/instance/learn.db

# Wait for operations to complete, then retry
```

## Best Practices

1. **Test Restores Regularly**: Verify backups can be restored
2. **Monitor Disk Space**: Ensure backup directory has sufficient space
3. **Offsite Backups**: Copy backups to external storage weekly
4. **Retention Policy**: Adjust based on compliance requirements
5. **Log Monitoring**: Review backup logs for errors
6. **Version Control**: Keep `backup_database.sh` in version control
7. **Documentation**: Update this README when changing configuration

## Security

- Backups inherit the same permissions as the database file
- Store backups in a directory accessible only to the application user
- Encrypt backups if storing offsite:

```bash
# Encrypt before offsite transfer
gpg --symmetric backup.db.gz

# Decrypt when needed
gpg backup.db.gz.gpg
```

## Performance

Typical performance on a 10 MB database:

- Backup time: 0.1-0.5 seconds
- Compression time: 0.5-1 second
- Compressed size: ~10% of original
- Total time: <2 seconds

For larger databases (100+ MB), consider:
- Using `gzip -6` instead of `gzip -9` for faster compression
- Reducing backup frequency
- Implementing incremental backups

## Support

For issues or questions:
- Check the log file: `backups/backup.log`
- SQLite documentation: https://www.sqlite.org/backup.html
- Open an issue in the repository
