#!/usr/bin/env bash
set -euo pipefail
umask 077
# Runs inside the synthetic backup container; no real storage/provider secrets.
age-keygen -o /identity/identity 2>/dev/null
export BACKUP_AGE_RECIPIENT="$(age-keygen -y /identity/identity)"
/usr/local/bin/backup-database.sh backup
archive=$(find /backups -maxdepth 1 -name 'backup_*.dump.age' -type f -print -quit)
test -n "$archive"
rclone copyto "ci-synthetic:/remote/$(basename "$archive")" /backups/retrieved.dump.age
/usr/local/bin/backup-database.sh verify /backups/retrieved.dump.age
DATABASE_URL=postgresql://restore:ci-only-restore-password@ci-restore-postgres:5432/yor_ci_restore \
  /usr/local/bin/backup-database.sh restore /backups/retrieved.dump.age <<<restore

success=$(awk '$1=="yor_backup_last_success_timestamp_seconds"{print $2}' /metrics/yor-talks-backup.prom)
test "$success" -gt 0
# A real rclone configuration failure retains the encrypted local copy and
# signals failure while preserving the previous successful timestamp.
if BACKUP_REMOTE=unconfigured-ci-remote:/failure /usr/local/bin/backup-database.sh backup >/dev/null 2>&1; then exit 1; fi
test "$(awk '$1=="yor_backup_last_run_success"{print $2}' /metrics/yor-talks-backup.prom)" = 0
test "$(awk '$1=="yor_backup_last_success_timestamp_seconds"{print $2}' /metrics/yor-talks-backup.prom)" = "$success"
test -n "$(find /backups -maxdepth 1 -name 'backup_*.dump.age' -type f -print -quit)"
if DATABASE_URL=postgresql://restore:ci-only-restore-password@ci-restore-postgres:5432/ci_nonexistent \
  /usr/local/bin/backup-database.sh backup >/dev/null 2>&1; then exit 1; fi
# Corrupt retrieval fails verification; existing targets remain untouched.
printf synthetic-corrupt-archive > /backups/corrupt.dump.age
if /usr/local/bin/backup-database.sh verify /backups/corrupt.dump.age >/dev/null 2>&1; then exit 1; fi
if DATABASE_URL=postgresql://restore:ci-only-restore-password@ci-restore-postgres:5432/yor_ci_restore \
  /usr/local/bin/backup-database.sh restore /backups/retrieved.dump.age <<<restore >/dev/null 2>&1; then exit 1; fi
test -z "$(find /backups -maxdepth 1 -type f -name '.backup.*' -print -quit)"
