#!/bin/bash
#
# PostgreSQL Database Backup and Restore Script
#
# Usage:
#   ./backup-database.sh backup         # Create a backup
#   ./backup-database.sh restore <file> # Restore from backup
#   ./backup-database.sh verify <file>  # Verify backup integrity
#
# Environment variables:
#   DATABASE_URL - Connection string (required)
#   BACKUP_DIR   - Backup directory (default: ./backups)
#

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-.backup}"
COMMAND="${1:-help}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Extract connection details from DATABASE_URL
# Expected format: postgresql://user:password@host:port/database
parse_database_url() {
  local url="$1"
  
  # Remove protocol
  local without_protocol="${url#postgresql://}"
  
  # Extract user and password
  if [[ "$without_protocol" =~ ^([^:]+):([^@]+)@(.+)$ ]]; then
    export DB_USER="${BASH_REMATCH[1]}"
    export DB_PASSWORD="${BASH_REMATCH[2]}"
    local host_and_db="${BASH_REMATCH[3]}"
  else
    echo "Error: DATABASE_URL format is invalid. Expected: postgresql://user:password@host:port/database" >&2
    exit 1
  fi
  
  # Extract host, port, and database
  if [[ "$host_and_db" =~ ^([^:]+):([^/]+)/(.+)$ ]]; then
    export DB_HOST="${BASH_REMATCH[1]}"
    export DB_PORT="${BASH_REMATCH[2]}"
    export DB_NAME="${BASH_REMATCH[3]}"
  else
    echo "Error: DATABASE_URL format is invalid. Expected: postgresql://user:password@host:port/database" >&2
    exit 1
  fi
}

# Backup the database
backup() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting database backup..."
  
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Error: DATABASE_URL environment variable not set" >&2
    exit 1
  fi
  
  parse_database_url "$DATABASE_URL"
  
  mkdir -p "$BACKUP_DIR"
  local backup_file="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backing up $DB_NAME to $backup_file..."
  
  export PGPASSWORD="$DB_PASSWORD"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-password \
    --verbose \
    --format=plain \
    --compress=9 \
    --disable-triggers \
    --no-privileges \
    >"$backup_file" 2> >(tee -a "$backup_file.log" >&2)
  
  if [[ $? -eq 0 ]]; then
    local file_size=$(du -h "$backup_file" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Backup completed: $backup_file ($file_size)"
    echo "$backup_file"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Backup failed" >&2
    rm -f "$backup_file"
    exit 1
  fi
}

# Verify backup integrity
verify() {
  local backup_file="$1"
  
  if [[ ! -f "$backup_file" ]]; then
    echo "Error: Backup file not found: $backup_file" >&2
    exit 1
  fi
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Verifying backup: $backup_file"
  
  if gzip -t "$backup_file" 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Backup file is valid (gzip OK)"
    
    # Check for common plain SQL statements without assuming comments appear
    # before the first schema/data statement.
    if gzip -cd "$backup_file" 2>/dev/null | grep -E "^(--|SET |CREATE |ALTER |INSERT |COPY |BEGIN)" >/dev/null; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Backup contains SQL statements"
      return 0
    else
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Backup does not contain valid SQL" >&2
      return 1
    fi
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Backup file is corrupted (gzip failed)" >&2
    return 1
  fi
}

# Restore from backup
restore() {
  local backup_file="$1"
  
  if [[ ! -f "$backup_file" ]]; then
    echo "Error: Backup file not found: $backup_file" >&2
    exit 1
  fi
  
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Error: DATABASE_URL environment variable not set" >&2
    exit 1
  fi
  
  # Verify backup before restoring
  if ! verify "$backup_file"; then
    echo "Error: Backup verification failed" >&2
    exit 1
  fi
  
  parse_database_url "$DATABASE_URL"
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  WARNING: This will restore database $DB_NAME"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  All existing data will be replaced"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] To proceed, type 'yes' and press enter:"
  read -r confirmation
  
  if [[ "$confirmation" != "yes" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restore cancelled"
    exit 0
  fi
  
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting restore from $backup_file..."
  
  export PGPASSWORD="$DB_PASSWORD"
  local restore_log="$BACKUP_DIR/restore_${TIMESTAMP}.log"
  if zcat "$backup_file" 2>/dev/null | psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    >"$restore_log" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Restore completed successfully"
    
    # Verify restore by checking table count
    export PGPASSWORD="$DB_PASSWORD"
    table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
      --no-password -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" \
      -t | tr -d ' ')
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✓ Restored database has $table_count tables"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✗ Restore failed" >&2
    echo "See restore log: $restore_log" >&2
    exit 1
  fi
}

# Help text
show_help() {
  cat <<EOF
PostgreSQL Database Backup and Restore Script

Usage:
  ./backup-database.sh backup         Create a new backup
  ./backup-database.sh restore <file> Restore from backup file
  ./backup-database.sh verify <file>  Verify backup integrity
  ./backup-database.sh help           Show this help

Environment Variables:
  DATABASE_URL (required) - PostgreSQL connection string
                           Format: postgresql://user:password@host:port/database
  BACKUP_DIR (optional)   - Directory to store backups (default: .backup)

Examples:
  # Create backup
  DATABASE_URL="postgresql://user:pass@localhost:5432/mydb" ./backup-database.sh backup

  # Verify backup
  ./backup-database.sh verify .backup/backup_20240101_120000.sql.gz

  # Restore database
  DATABASE_URL="postgresql://user:pass@localhost:5432/mydb" ./backup-database.sh restore .backup/backup_20240101_120000.sql.gz

EOF
}

# Main
case "$COMMAND" in
  backup)
    backup
    ;;
  restore)
    if [[ $# -lt 2 ]]; then
      echo "Error: restore requires a backup file path" >&2
      show_help
      exit 1
    fi
    restore "$2"
    ;;
  verify)
    if [[ $# -lt 2 ]]; then
      echo "Error: verify requires a backup file path" >&2
      show_help
      exit 1
    fi
    verify "$2"
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Error: Unknown command '$COMMAND'" >&2
    show_help
    exit 1
    ;;
esac
