#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
fixture=$(mktemp -d)
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/tmp" "$fixture/archives"
export TMPDIR="$fixture/tmp"
export PATH="$fixture/bin:$PATH"
export DATABASE_URL=postgresql://synthetic-isolated-test/restore
export BACKUP_AGE_IDENTITY="$fixture/identity"
export BACKUP_AGE_RECIPIENT=synthetic-test-recipient
export BACKUP_REMOTE=synthetic-test:backup
export BACKUP_DIR="$fixture/archives"
export BACKUP_TEST_CALLS="$fixture/calls"
printf 'synthetic encrypted archive\n' > "$fixture/archive.age"
# Match the backup image's normalization when a Windows checkout uses CRLF.
sed 's/\r$//' "$repo_root/lib/db/scripts/backup-database.sh" > "$fixture/backup.sh"

cat > "$fixture/bin/age" <<'SH'
#!/usr/bin/env bash
printf 'synthetic private plaintext\n'
if [[ "${BACKUP_TEST_FAILURE:-}" == decrypt ]]; then exit 17; fi
SH
cat > "$fixture/bin/pg_restore" <<'SH'
#!/usr/bin/env bash
printf 'pg_restore\n' >> "$BACKUP_TEST_CALLS"
if [[ "${BACKUP_TEST_FAILURE:-}" == inspect ]]; then exit 18; fi
SH
cat > "$fixture/bin/pg_dump" <<'SH'
#!/usr/bin/env bash
printf 'synthetic database dump\n'
if [[ "${BACKUP_TEST_FAILURE:-}" == dump ]]; then exit 19; fi
SH
cat > "$fixture/bin/rclone" <<'SH'
#!/usr/bin/env bash
exit 0
SH
cat > "$fixture/bin/psql" <<'SH'
#!/usr/bin/env bash
printf '0\n'
SH
chmod +x "$fixture/bin/"*

assert_no_temporary_files() {
  if [[ -n "$(find "$fixture/tmp" -type f -print -quit)" \
    || -n "$(find "$fixture/archives" -name '.backup.*' -print -quit)" ]]; then
    echo "Error: temporary archive or plaintext survived the $1 path" >&2
    exit 1
  fi
}

for command in verify restore; do
  for failure in decrypt inspect; do
    export BACKUP_TEST_FAILURE="$failure"
    if printf 'restore\n' | bash "$fixture/backup.sh" "$command" "$fixture/archive.age" > "$fixture/output" 2>&1; then
      echo "Error: $command accepted a failed $failure operation" >&2
      exit 1
    else
      status=$?
    fi
    expected=17
    if [[ "$failure" == inspect ]]; then expected=18; fi
    [[ "$status" == "$expected" ]] || { cat "$fixture/output" >&2; echo "Error: unexpected $command/$failure exit $status" >&2; exit 1; }
    assert_no_temporary_files "$command/$failure"
  done
  export BACKUP_TEST_FAILURE=
  printf 'restore\n' | bash "$fixture/backup.sh" "$command" "$fixture/archive.age" > "$fixture/output" 2>&1
  assert_no_temporary_files "$command/success"
done

export BACKUP_TEST_FAILURE=dump
if bash "$fixture/backup.sh" backup > "$fixture/output" 2>&1; then
  echo 'Error: backup accepted a failed dump' >&2
  exit 1
fi
assert_no_temporary_files backup/dump
echo 'Backup and restore failure/success paths remove every temporary archive and plaintext file.'
