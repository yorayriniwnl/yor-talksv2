# Privacy reconciliation after a historical restore

Keep the restored database, Redis and provider workers isolated until reconciliation
and the final cutover review finish. Historical backups cannot supply their own
independent authority for later erasures or withdrawn communications consent.

## Current recovery format

Use `export-privacy-manifest.mjs` against the independently retained source of truth
with writes quiescent. Set `PRIVACY_JOURNAL_DATABASE_URL` and
`PRIVACY_JOURNAL_EXPECTED_DATABASE` explicitly, then run:

```sh
node ops/backup/export-privacy-manifest.mjs /secure/new-privacy-journal.json
```

The exporter opens a read-only repeatable-read transaction and writes a new file
exclusively with mode 0600. It returns the journal ID, SHA-256 and UTC checkpoint.
If recent events exceed the whole-second checkpoint, retry after the next second
with writes still quiescent. It never silently truncates records. Store the
manifest encrypted with separately protected credentials; securely record its
digest and checkpoint outside the restored backup. Exporting on the same host
does not establish off-host durability or zero-loss erasure recovery.

Version 2 contains exactly:

- `schemaVersion: 2`, opaque `journalId`, and UTC whole-second `through`.
- `erasures`: original journal `id`, nullable `accountId`, `emailHash`, and
  original UTC-millisecond `erasedAt`. A null account identifies unbound erasure.
- `suppressions`: `emailHash`, `purpose`, and `suppressedAt`.
- `restrictedAccountIds`: current processing-restricted account UUIDs.

The current bounded format accepts at most 1 MiB and 10,000 entries per collection.
Export fails above those limits. A larger production journal requires a reviewed
streaming/batched extension before recovery; do not split the file and treat one
part's completion as complete reconciliation. Digests are pseudonymous identifiers,
not anonymous data. Raw addresses, usernames, secrets and provider payloads are
excluded. The external checkpoint's authenticity and completeness remain essential.

## Replay and verify

Apply the current release migrations to the isolated restore. Provide these
variables through the protected process environment:

```text
RESTORE_DATABASE_URL=<isolated recovery database connection>
RESTORE_EXPECTED_DATABASE=<exact recovery database name>
RESTORE_DELETION_MANIFEST_SHA256=<independently approved SHA-256>
RESTORE_DELETION_JOURNAL_THROUGH=<independently approved UTC checkpoint>
```

```sh
node ops/backup/replay-deletions.mjs /secure/independent-privacy-journal.json
node ops/backup/verify-restored-deletions.mjs /secure/independent-privacy-journal.json
```

Replay uses the same parameterized account-erasure implementation as the API. It
preserves surviving group history and financial references, scrubs legacy actor
references, schedules provider/session cleanup, restores suppression and processing
restrictions, and preserves original event IDs/times. Unbound erasure applies only
to rows created by its original cutoff, protecting later independent registrations.
It also repairs legacy actor references and re-arms cleanup for already absent
accounts. Database changes, final reconciliation and completion marker commit
atomically; failures roll back, and repeating the manifest is safe.

Set `RECOVERY_REPLAY_GATE=true` on the restored API and worker processes together
with the approved digest/checkpoint. Startup, HTTP access, socket initialization
and readiness refuse service until that exact manifest has a completion marker.
An arbitrary older marker or a newer timestamp alone cannot open the gate.
Version 1 account-only manifests remain readable for legacy identity verification,
but cannot satisfy this release gate.

Start with fresh Redis when restoring historical PostgreSQL; do not restore old
sessions or private queue payloads. Drain account/media cleanup and reconcile
provider copies before cutover. The local database marker does not prove provider
erasure, backup/key custody, off-host durability or absence of later requests.
Keep writes quiescent until the final journal checkpoint is reconciled.

## Verification

Portable authority/negative tests:

```sh
node --test tests/restore-deletion-verification.test.mjs tests/disaster-recovery-erasure-replay.test.mjs
```

The real full-schema dump/restore test requires explicit loopback
`RECOVERY_TEST_ADMIN_URL` (administrator database), `RECOVERY_TEST_SCHEMA_URL`
(read-only access to the fully migrated disposable schema), and optional
`RECOVERY_TEST_PG_BIN` (PostgreSQL binary directory). It creates and drops only its
randomly named `yor_recovery_source_*` and `yor_recovery_target_*` databases:

```sh
node --test ops/backup/privacy-recovery-database.test.mjs
```

It verifies resurrection detection, deliberate failure rollback, unbound erasure,
preserved survivor records, preferences, original timestamps and repeat replay.
CI runs it against PostgreSQL 16 after migration. The separate encrypted transport
fixture is `ci-roundtrip-smoke.sh`; its local rclone alias does not prove real
external object-storage durability. `backup-script.test.sh` tests temporary-file
cleanup and failure behavior with controlled command doubles.
