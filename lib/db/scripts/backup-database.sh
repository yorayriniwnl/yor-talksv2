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
#   DATABASE_URL          - PostgreSQL connection string
#   BACKUP_AGE_RECIPIENT  - age public recipient used for encryption
#   BACKUP_REMOTE         - configured off-host rclone destination
#   BACKUP_METRICS_FILE   - optional Prometheus node-exporter textfile output
#

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-.backup}"
COMMAND="${1:-help}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cleanup_file=""
cleanup() {
  local exit_status=$?
  [[ -z "$cleanup_file" ]] || rm -f -- "$cleanup_file"
  if [[ "$COMMAND" == "backup" && "$exit_status" != "0" ]]; then record_backup_metrics 0 || true; fi
}
trap cleanup EXIT

record_backup_metrics() {
  local succeeded="$1"
  [[ -n "${BACKUP_METRICS_FILE:-}" ]] || return 0
  local last_success="0"
  if [[ -r "$BACKUP_METRICS_FILE" ]]; then
    last_success=$(awk '$1 == "yor_backup_last_success_timestamp_seconds" { print $2; exit }' "$BACKUP_METRICS_FILE")
    last_success="${last_success:-0}"
  fi
  local attempted_at
  attempted_at=$(date +%s)
  if [[ "$succeeded" == "1" ]]; then last_success="$attempted_at"; fi
  mkdir -p "$(dirname "$BACKUP_METRICS_FILE")"
  local metrics_temp
  metrics_temp=$(mktemp "${BACKUP_METRICS_FILE}.XXXXXX")
  {
    printf '# HELP yor_backup_last_success_timestamp_seconds Unix timestamp of the latest encrypted off-host backup.\n'
    printf '# TYPE yor_backup_last_success_timestamp_seconds gauge\n'
    printf 'yor_backup_last_success_timestamp_seconds %s\n' "$last_success"
    printf '# HELP yor_backup_last_run_success Whether the latest backup and remote upload succeeded.\n'
    printf '# TYPE yor_backup_last_run_success gauge\n'
    printf 'yor_backup_last_run_success %s\n' "$succeeded"
    printf '# HELP yor_backup_last_attempt_timestamp_seconds Unix timestamp of the latest backup attempt.\n'
    printf '# TYPE yor_backup_last_attempt_timestamp_seconds gauge\n'
    printf 'yor_backup_last_attempt_timestamp_seconds %s\n' "$attempted_at"
  } > "$metrics_temp"
  chmod 0644 "$metrics_temp"
  mv "$metrics_temp" "$BACKUP_METRICS_FILE"
}

# Backup the database
backup() {
  : "${DATABASE_URL:?DATABASE_URL is required}"
  : "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT is required}"
  : "${BACKUP_REMOTE:?BACKUP_REMOTE must name an off-host rclone destination}"
  [[ "$BACKUP_REMOTE" == *:* ]] || { echo "Error: BACKUP_REMOTE must use rclone remote:path syntax" >&2; exit 1; }
  for tool in pg_dump age rclone; do
    command -v "$tool" >/dev/null || { echo "Error: required command not found: $tool" >&2; exit 1; }
  done

  umask 077
  mkdir -p "$BACKUP_DIR"
  local backup_file="$BACKUP_DIR/backup_${TIMESTAMP}_$RANDOM.dump.age"
  local temporary_file
  temporary_file=$(mktemp "$BACKUP_DIR/.backup.XXXXXX")
  cleanup_file="$temporary_file"

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Creating encrypted PostgreSQL backup..."
  if ! pg_dump --no-password --no-owner --no-privileges --format=custom --compress=9 "$DATABASE_URL" \
    | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" > "$temporary_file"; then
    record_backup_metrics 0
    echo "Error: database dump or encryption failed" >&2
    exit 1
  fi
  [[ -s "$temporary_file" ]] || { echo "Error: encrypted backup is empty" >&2; exit 1; }
  mv "$temporary_file" "$backup_file"
  cleanup_file=""

  if ! rclone copyto "$backup_file" "${BACKUP_REMOTE%/}/$(basename "$backup_file")"; then
    record_backup_metrics 0
    echo "Error: off-host upload failed; encrypted local copy retained at $backup_file" >&2
    exit 1
  fi
  record_backup_metrics 1
  local local_retention_days="${BACKUP_LOCAL_RETENTION_DAYS:-14}"
  if [[ "$local_retention_days" =~ ^[0-9]+$ ]] && (( local_retention_days > 0 )); then
    find "$BACKUP_DIR" -maxdepth 1 -type f -name 'backup_*.dump.age' -mtime "+$local_retention_days" -delete
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Encrypted off-host backup completed: $backup_file"
  echo "$backup_file"
}

# Verify backup integrity
verify() {
  local backup_file="$1"
  : "${BACKUP_AGE_IDENTITY:?BACKUP_AGE_IDENTITY is required for encrypted verification}"
  command -v age >/dev/null || { echo "Error: required command not found: age" >&2; exit 1; }
  command -v pg_restore >/dev/null || { echo "Error: required command not found: pg_restore" >&2; exit 1; }
  [[ -f "$backup_file" ]] || { echo "Error: Backup file not found: $backup_file" >&2; exit 1; }
  local temporary_file
  umask 077
  temporary_file=$(mktemp)
  cleanup_file="$temporary_file"
  age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$backup_file" > "$temporary_file"
  pg_restore --list "$temporary_file" >/dev/null
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Encrypted archive integrity verified: $backup_file"
}

# Restore from backup
restore() {
  local backup_file="$1"
  : "${DATABASE_URL:?DATABASE_URL must point at an isolated restore target}"
  : "${BACKUP_AGE_IDENTITY:?BACKUP_AGE_IDENTITY is required for restore}"
  : "${RESTORE_TARGET_DATABASE:?RESTORE_TARGET_DATABASE must explicitly name the isolated target}"
  for tool in age pg_restore psql; do
    command -v "$tool" >/dev/null || { echo "Error: required command not found: $tool" >&2; exit 1; }
  done
  [[ -f "$backup_file" ]] || { echo "Error: Backup file not found: $backup_file" >&2; exit 1; }
  local object_count temporary_file actual_database archive_database
  local inspection_sql
  inspection_sql="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/schema-object-inspection.sql"
  [[ -r "$inspection_sql" ]] || { echo "Error: reviewed restore target inspection SQL is unavailable" >&2; exit 1; }
  actual_database=$(psql --no-psqlrc --no-password -v ON_ERROR_STOP=1 -Atqc 'SELECT current_database()' "$DATABASE_URL")
  if [[ "$actual_database" != "$RESTORE_TARGET_DATABASE" || "$actual_database" == "postgres" || "$actual_database" == template* ]]; then
    echo "Error: restore target identity is not the explicitly approved isolated database." >&2
    exit 1
  fi
  object_count=$(psql --no-psqlrc --no-password -v ON_ERROR_STOP=1 -Atq --file="$inspection_sql" "$DATABASE_URL" | awk 'END {print NR+0}')
  if [[ "$object_count" != "0" ]]; then
    echo "Error: restore target is not empty; use a separate empty database. No restore was attempted." >&2
    exit 1
  fi

  umask 077
  temporary_file=$(mktemp)
  cleanup_file="$temporary_file"
  age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$backup_file" > "$temporary_file"
  pg_restore --list "$temporary_file" >/dev/null
  # Read the full listing: exiting awk early can SIGPIPE pg_restore under pipefail.
  archive_database=$(pg_restore --list "$temporary_file" | awk '/dbname:/ && !found { sub(/^.*dbname: /, ""); print; found=1 }')
  if [[ -z "$archive_database" || "$archive_database" == "$actual_database" ]]; then
    echo "Error: archive source and isolated restore target must be distinct." >&2
    exit 1
  fi
  echo "Restoring into a verified empty database. Type 'restore' to continue:"
  read -r confirmation
  [[ "$confirmation" == "restore" ]] || { echo "Restore cancelled"; exit 1; }
  pg_restore --single-transaction --no-owner --no-privileges --exit-on-error --dbname="$DATABASE_URL" "$temporary_file"
  local table_count
  table_count=$(psql --no-psqlrc --no-password -v ON_ERROR_STOP=1 -Atqc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" "$DATABASE_URL")
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restore completed; public table count: $table_count"
}

# Help text
show_help() {
  cat <<EOF
Encrypted PostgreSQL Backup and Restore Script

Usage:
  ./backup-database.sh backup         Encrypt a dump and upload it off-host
  ./backup-database.sh restore <file> Restore from backup file
  ./backup-database.sh verify <file>  Verify backup integrity
  ./backup-database.sh help           Show this help

Environment Variables:
  DATABASE_URL          PostgreSQL connection string
  BACKUP_AGE_RECIPIENT  age public recipient
  BACKUP_REMOTE         configured rclone remote:path destination
  BACKUP_METRICS_FILE   optional Prometheus textfile output
  BACKUP_DIR            encrypted local staging (default: .backup)
  RESTORE_TARGET_DATABASE exact approved empty restore database; differs from source

Examples:
  # Create encrypted off-host backup
  BACKUP_AGE_RECIPIENT="age1..." BACKUP_REMOTE="remote:yor-talks" \\
    DATABASE_URL="postgresql://..." ./backup-database.sh backup

  # Verify backup
  BACKUP_AGE_IDENTITY=/secure/identity ./backup-database.sh verify .backup/backup_YYYYMMDD_HHMMSS.dump.age

  # Restore only into a separate empty database
  BACKUP_AGE_IDENTITY=/secure/identity RESTORE_TARGET_DATABASE=restore_db DATABASE_URL="postgresql://.../restore_db" \\
    ./backup-database.sh restore .backup/backup_YYYYMMDD_HHMMSS.dump.age

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
