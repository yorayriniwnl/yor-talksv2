# Recovery account reconciliation

Keep a restored database isolated from API, worker, and user traffic until all deletion requests after the backup have been reconciled. The backup contains historical data and cannot provide its own authoritative deletion history.

`verify-restored-deletions.mjs` provides a read-only check for account UUIDs listed as erased in an independently obtained journal. It fails if the manifest, digest, cutoff, database name, database connection, or account absence cannot be verified. It never deletes records, replays `AccountService`, changes grants, or enables traffic.

Create a minimized UTF-8 JSON manifest from the authoritative deletion journal, with these exact fields:

```json
{
  "schemaVersion": 1,
  "journalId": "recovery-review-opaque-id",
  "through": "2026-10-19T00:00:00Z",
  "deletedAccountIds": ["00000000-0000-4000-8000-000000000001"]
}
```

The manifest is limited to 1 MiB and 10,000 distinct lowercase account UUIDs. An empty list is accepted only as an explicit journal assertion; a missing manifest never passes. Do not add emails, credentials, provider payloads, or notes. Store this pseudonymous journal and its access controls separately from the historical database backups. A larger journal must be split into independently inventoried parts, all of which must pass.

Obtain the required journal cutoff and manifest SHA-256 from the recovery coordinator's independent source of truth. Do not derive the expected cutoff or approved digest from an untrusted restored file. The digest verifies the bytes supplied; it does not authenticate the journal's author or prove that its entries are complete. Those remain recovery process responsibilities.

Run after separately reviewed deletion replay against the isolated target:

```sh
RESTORE_DATABASE_URL='postgresql://recovery-user@isolated-host/recovery_database' \
RESTORE_EXPECTED_DATABASE='recovery_database' \
RESTORE_DELETION_MANIFEST_SHA256='<independently-approved-64-character-lowercase-sha256>' \
RESTORE_DELETION_JOURNAL_THROUGH='2026-10-19T00:00:00Z' \
node ops/backup/verify-restored-deletions.mjs /secure/independent-journal.json
```

The account lookup runs in one read-only repeatable-read transaction, with a 30-second statement/idle timeout and five-second lock timeout. Output contains the journal ID, cutoff and counts, without account IDs or connection credentials. A passing result proves only that the listed account rows were absent in that snapshot. It does not prove removal of shared legacy references, retained records, Redis state, provider copies, off-host backups, or later deletion requests. Reconcile those domains, verify a complete current journal and keep writes quiescent through the final recovery cutover.

Run portable validation tests with `node --test tests/restore-deletion-verification.test.mjs`. The real PostgreSQL/CLI test requires an explicit loopback disposable administrator URL and creates/drops only a uniquely named `yor_restore_verifier_*` database:

```sh
RESTORE_VERIFICATION_TEST_ADMIN_URL='postgresql://postgres:postgres@localhost:5432/postgres' \
node --test ops/backup/restore-deletion-database.test.mjs
```

The isolated encrypted roundtrip in `ci-roundtrip-smoke.sh` archives two synthetic accounts, erases one after the archive, and restores the historical archive into a new database. It proves that the checker rejects the resurrected identity without changing either row, then reconciles only that synthetic identity and proves the retained account survives. This models identity detection and reconciliation; it does not exercise full production account deletion or establish external erasure.
