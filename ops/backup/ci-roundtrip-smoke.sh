#!/usr/bin/env bash
set -euo pipefail
# Git Bash otherwise rewrites Linux container paths inside Compose -e values.
# This is ignored by the Linux CI shell and keeps service paths intact locally.
export MSYS_NO_PATHCONV=1

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
cd "$repo_root"

# This script is restricted to named CI/rehearsal projects and a checked-in
# synthetic fixture. It must never use production backup credentials or remotes.
project_name="${BACKUP_SMOKE_COMPOSE_PROJECT:?Set the isolated Compose project name}"
case "$project_name" in
  yor-talks-ci-release|yor-talks-backup-smoke-local) ;;
  *) echo "Error: backup smoke is restricted to an isolated CI project" >&2; exit 1 ;;
esac

ci_env_value() {
  awk -F= -v key="$1" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' ops/ci-production.env
}

database_url=$(ci_env_value DATABASE_MIGRATION_URL)
postgres_user=$(ci_env_value POSTGRES_USER)
postgres_db=$(ci_env_value POSTGRES_DB)
if [[ "$database_url" != "postgresql://yor_talks:ci-only-postgres-password-0123456789@postgres:5432/yor_talks" \
  || "$postgres_user" != "yor_talks" || "$postgres_db" != "yor_talks" ]]; then
  echo "Error: backup smoke requires the checked-in synthetic CI database" >&2
  exit 1
fi

compose=(docker compose --project-name "$project_name" --env-file ops/ci-production.env -f docker-compose.production.yml -f ops/ci-provider-isolation.compose.yml)
smoke_id="ci-smoke-$(date +%s)-$$"
[[ "$smoke_id" =~ ^ci-smoke-[0-9]+-[0-9]+$ ]] || { echo "Error: invalid isolated backup smoke ID" >&2; exit 1; }
backup_dir="/backups/$smoke_id"
remote_dir="/ci-backup-target/yor-talks/$smoke_id"
backup_remote="ci-remote:yor-talks/$smoke_id"
rclone_config="$backup_dir/rclone.conf"
restore_db="yor_backup_restore_$(date +%s)_$$"
restore_db_created=0
marker_table_created=0
backup_name=""
test_marker="ci-encrypted-backup-roundtrip-v1"

backup_env=(
  -e "BACKUP_DIR=$backup_dir"
  -e "BACKUP_REMOTE=$backup_remote"
  -e "RCLONE_CONFIG=$rclone_config"
  -e RCLONE_CONFIG_CI_REMOTE_TYPE=alias
  -e RCLONE_CONFIG_CI_REMOTE_REMOTE=/ci-backup-target
)

cleanup() {
  local status=$?
  trap - EXIT
  if [[ "$restore_db_created" == "1" ]]; then
    "${compose[@]}" exec -T postgres dropdb --if-exists --username "$postgres_user" "$restore_db" >/dev/null 2>&1 || true
  fi
  if [[ "$marker_table_created" == "1" ]]; then
    "${compose[@]}" exec -T postgres psql --no-psqlrc --username "$postgres_user" --dbname "$postgres_db" -c 'DROP TABLE IF EXISTS public.ci_backup_smoke' >/dev/null 2>&1 || true
  fi
  # Both cleanup paths are constructed from the validated numeric smoke ID.
  "${compose[@]}" run --rm --no-deps --entrypoint rm backup -rf -- "$backup_dir" "$remote_dir" >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT

"${compose[@]}" exec -T postgres pg_isready --username "$postgres_user" --dbname "$postgres_db" >/dev/null
marker_table_created=1
"${compose[@]}" exec -T postgres psql --no-psqlrc --username "$postgres_user" --dbname "$postgres_db" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE TABLE IF NOT EXISTS public.ci_backup_smoke (id text PRIMARY KEY, marker text NOT NULL);
INSERT INTO public.ci_backup_smoke VALUES ('ci', 'ci-encrypted-backup-roundtrip-v1')
ON CONFLICT (id) DO UPDATE SET marker=EXCLUDED.marker;
SQL

recipient=$("${compose[@]}" run --rm --no-deps "${backup_env[@]}" --entrypoint sh backup -ec '
  umask 077
  mkdir -p "$BACKUP_DIR"
  cat > "$RCLONE_CONFIG" <<EOF
[ci-remote]
type = alias
remote = /ci-backup-target
EOF
  age-keygen -o "$BACKUP_DIR/identity" 2>/dev/null
  age-keygen -y "$BACKUP_DIR/identity"
')
[[ "$recipient" =~ ^age1[[:alnum:]]+$ ]] || { echo "Error: CI age key generation failed" >&2; exit 1; }

backup_started_at=$(date +%s)
"${compose[@]}" run --rm --no-deps "${backup_env[@]}" -e "BACKUP_AGE_RECIPIENT=$recipient" backup backup

backup_name=$("${compose[@]}" run --rm --no-deps "${backup_env[@]}" --entrypoint sh backup -ec '
  set -- "$BACKUP_DIR"/backup_*.dump.age
  [ "$#" -eq 1 ] && [ -s "$1" ] || { echo "expected one non-empty encrypted archive" >&2; exit 1; }
  basename "$1"
')
[[ "$backup_name" =~ ^backup_[0-9]{8}_[0-9]{6}\.dump\.age$ ]] || { echo "Error: unexpected CI backup archive name" >&2; exit 1; }

if ! remote_listing=$("${compose[@]}" run --rm --no-deps "${backup_env[@]}" --entrypoint rclone backup lsf --files-only "$backup_remote"); then
  echo "Error: CI alias could not list its upload directory; inspecting the isolated target volume" >&2
  "${compose[@]}" run --rm --no-deps "${backup_env[@]}" --entrypoint sh backup -ec \
    'find /ci-backup-target -maxdepth 6 -type f -print; rclone lsf --recursive ci-remote:' >&2 || true
  exit 1
fi
[[ "$remote_listing" == "$backup_name" ]] || { echo "Error: isolated remote alias does not contain exactly the uploaded archive" >&2; exit 1; }

if "${compose[@]}" run --rm --no-deps "${backup_env[@]}" -e "BACKUP_FILE=$backup_name" -e "CI_BACKUP_TEST_MARKER=$test_marker" \
  --entrypoint sh backup -ec '
    if grep -aFq "$CI_BACKUP_TEST_MARKER" "$BACKUP_DIR/$BACKUP_FILE"; then
      echo "encrypted archive contains the plaintext test marker" >&2
      exit 1
    else
      status=$?
      [ "$status" -eq 1 ] || exit "$status"
    fi
  '; then
  :
else
  echo "Error: encrypted archive plaintext check failed" >&2
  exit 1
fi

# Restore the copy read back through the configured remote alias, not the
# local staging archive, so the CI path exercises upload and retrieval.
"${compose[@]}" run --rm --no-deps "${backup_env[@]}" -e "BACKUP_FILE=$backup_name" --entrypoint sh backup -ec '
  mkdir -p "$BACKUP_DIR/retrieved"
  rclone copyto "$BACKUP_REMOTE/$BACKUP_FILE" "$BACKUP_DIR/retrieved/$BACKUP_FILE"
  cmp "$BACKUP_DIR/$BACKUP_FILE" "$BACKUP_DIR/retrieved/$BACKUP_FILE"
'

"${compose[@]}" run --rm --no-deps "${backup_env[@]}" -e "BACKUP_AGE_IDENTITY=$backup_dir/identity" -e "BACKUP_FILE=$backup_name" \
  backup verify "$backup_dir/retrieved/$backup_name"
backup_metrics=$("${compose[@]}" run --rm --no-deps "${backup_env[@]}" --entrypoint sh backup -ec \
  'grep -E "^yor_backup_(last_run_success|last_attempt_timestamp_seconds) " /metrics/yor-talks-backup.prom')
backup_success=$(awk '$1 == "yor_backup_last_run_success" { print $2; exit }' <<<"$backup_metrics")
backup_attempt=$(awk '$1 == "yor_backup_last_attempt_timestamp_seconds" { print $2; exit }' <<<"$backup_metrics")
[[ "$backup_success" == "1" && "$backup_attempt" =~ ^[0-9]+$ && "$backup_attempt" -ge "$backup_started_at" ]] || {
  echo "Error: backup success metrics were not updated by this run" >&2
  exit 1
}

restore_db_created=1
"${compose[@]}" exec -T postgres createdb --username "$postgres_user" --maintenance-db postgres "$restore_db"
restore_url="${database_url%/$postgres_db}/$restore_db"
# A non-public schema can contain application data too. Refuse the whole
# populated target before decrypting or applying any archive contents.
"${compose[@]}" exec -T postgres psql --no-psqlrc --username "$postgres_user" --dbname "$restore_db" -v ON_ERROR_STOP=1 \
  -c 'CREATE SCHEMA private; CREATE TABLE private.existing_data (id integer);' >/dev/null
if refusal_output=$(printf 'restore\n' | "${compose[@]}" run --rm --no-deps -i "${backup_env[@]}" \
  -e "BACKUP_AGE_IDENTITY=$backup_dir/identity" -e "DATABASE_URL=$restore_url" -e "BACKUP_FILE=$backup_name" \
  backup restore "$backup_dir/retrieved/$backup_name" 2>&1); then
  echo 'Error: backup restore accepted a target populated outside the public schema' >&2
  exit 1
fi
[[ "$refusal_output" == *"restore target is not empty"* ]] || {
  printf '%s\n' "$refusal_output" >&2
  echo 'Error: non-public target refusal did not report the expected guard' >&2
  exit 1
}
"${compose[@]}" exec -T postgres psql --no-psqlrc --username "$postgres_user" --dbname "$restore_db" -v ON_ERROR_STOP=1 \
  -c 'DROP SCHEMA private CASCADE;' >/dev/null
printf 'restore\n' | "${compose[@]}" run --rm --no-deps -i "${backup_env[@]}" \
  -e "BACKUP_AGE_IDENTITY=$backup_dir/identity" -e "DATABASE_URL=$restore_url" -e "BACKUP_FILE=$backup_name" \
  backup restore "$backup_dir/retrieved/$backup_name"

restored_marker=$("${compose[@]}" exec -T postgres psql --no-psqlrc --username "$postgres_user" --dbname "$restore_db" -Atqc \
  "SELECT marker FROM public.ci_backup_smoke WHERE id='ci'")
[[ "$restored_marker" == "$test_marker" ]] || { echo "Error: restored database marker did not match" >&2; exit 1; }

if refusal_output=$(printf 'restore\n' | "${compose[@]}" run --rm --no-deps -i "${backup_env[@]}" \
  -e "BACKUP_AGE_IDENTITY=$backup_dir/identity" -e "DATABASE_URL=$restore_url" -e "BACKUP_FILE=$backup_name" \
  backup restore "$backup_dir/retrieved/$backup_name" 2>&1); then
  echo "Error: backup restore unexpectedly accepted a non-empty target" >&2
  exit 1
fi
[[ "$refusal_output" == *"restore target is not empty"* ]] || {
  printf '%s\n' "$refusal_output" >&2
  echo "Error: non-empty target refusal did not report the expected guard" >&2
  exit 1
}

echo "Encrypted backup, isolated alias upload/retrieval, archive verification, isolated restore, and non-empty-target refusal passed."
