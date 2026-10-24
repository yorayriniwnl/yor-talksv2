# Disaster Recovery Erasure Replay Runbook — 19 October 2026

## Objective
Ensure that restoring a historical database backup ($T_0$) into production or staging does not resurrect previously erased user records or roll back the authority needed to erase them. Restored services are quarantined and strictly prevented from serving user traffic until all erasures occurring between the backup snapshot time ($T_0$) and the recovery time ($T_{now}$) have been replayed and verified.

---

## 1. Architectural Guardrails

1. **Quarantine Before Traffic**:
   - The restored database environment must remain completely isolated from public ingress, application API traffic, and background queue workers during restoration.
   - When `RECOVERY_REPLAY_GATE=true`, the API `/readyz` healthcheck returns HTTP 503 (`status: "unhealthy"`), preventing load balancers and orchestrators from routing traffic to the restored instance until erasure replay passes.

2. **Independent Source of Truth**:
   - The backup contains historical data and cannot provide its own authoritative deletion history.
   - The authoritative deletion journal and manifest must be stored outside the restored database in an independently secured, immutable store (e.g., S3/GCS with Object Lock / versioning).
   - Manifest verification requires an independently obtained SHA-256 digest and UTC cutoff timestamp.

3. **Approved Deletion Semantics Preserved**:
   - Replay strictly enforces the approved deletion contract:
     - Erases departed users' authored messages (`DELETE FROM messages WHERE sender_id = $userId`).
     - **Strictly preserves surviving group members' conversations, messages, and membership.**
     - Minimizes commerce and financial orders (`marketplace_orders`, `payment_orders`).
     - Inserts email suppressions to prevent resurrected accounts from receiving promotional emails.
     - Logs recovery replay audit entries in `deletion_journal` and `recovery_replay_log`.

4. **Re-created Accounts & Stable Identifiers**:
   - When a user deletes an account and later registers a new account using the same email address, the new account receives a new UUID.
   - The deletion manifest identifies exact historical account UUIDs (`deletedAccountIds`). Replay erases only the historical account identity without corrupting fresh registrations created after the cutoff.
   - The `stable_identity_digest` (`sha256(lower(email))`) provides cryptographic auditing across account lifecycles.

5. **Separation of Provider-Mocked Evidence from Real Acceptance**:
   - Local database replay and synthetic test suites confirm that our code correctly triggers cleanups and preserves group history.
   - **Crucial Boundary**: Local tests do NOT establish that external cloud providers (Cloudinary, Resend, payment processors) have physically purged provider-side replicas or archives. External provider acceptance requires separate contractual and API verification.

---

## 2. Step-by-Step Recovery Procedure

### Step 1: Environment Isolation & Quarantined Restore
Deploy the target database container or cloud instance in an isolated virtual private network (VPC). Ensure no external ingress is enabled.

Restore the encrypted database dump into the isolated target:
```bash
export RESTORE_DATABASE_URL="postgresql://recovery-admin@isolated-db-host:5432/yor_restored_target"
export RESTORE_EXPECTED_DATABASE="yor_restored_target"

# Decrypt Age archive and stream into target database
age -d -i /secure/keys/recovery-private.key /backups/yor_talks_20261015T000000Z.dump.age | \
  pg_restore -d "$RESTORE_DATABASE_URL" --no-owner --role=yor_runtime
```

### Step 2: Acquire and Cryptographically Validate the Independent Manifest
Retrieve the authoritative deletion manifest and its independent SHA-256 digest from the recovery coordinator's secure vault:
```bash
# Verify the independent SHA-256 checksum of the manifest file
sha256sum /secure/independent-journal.json
# Ensure the output matches the approved 64-character lowercase digest exactly
```

The manifest must adhere to this exact schema (maximum 1 MiB, up to 10,000 distinct UUIDs):
```json
{
  "schemaVersion": 1,
  "journalId": "dr-incident-20261019-recovery",
  "through": "2026-10-19T00:00:00Z",
  "deletedAccountIds": [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002"
  ]
}
```

### Step 3: Run the Pre-Replay Detection Check (Verification of Resurrected Records)
Confirm that the restored database is properly identified as containing accounts listed as erased:
```bash
RESTORE_DATABASE_URL="$RESTORE_DATABASE_URL" \
RESTORE_EXPECTED_DATABASE="$RESTORE_EXPECTED_DATABASE" \
RESTORE_DELETION_MANIFEST_SHA256="<approved-sha256>" \
RESTORE_DELETION_JOURNAL_THROUGH="2026-10-19T00:00:00Z" \
node ops/backup/verify-restored-deletions.mjs /secure/independent-journal.json
```
*Expected Result*: Fails with exit code 1 (`restored database still contains accounts listed as erased; keep it isolated and replay erasure`). This proves the detection mechanism is functioning.

### Step 4: Execute Erasure Replay
Execute the idempotent deletion replay script against the isolated target database:
```bash
RESTORE_DATABASE_URL="$RESTORE_DATABASE_URL" \
RESTORE_EXPECTED_DATABASE="$RESTORE_EXPECTED_DATABASE" \
RESTORE_DELETION_MANIFEST_SHA256="<approved-sha256>" \
RESTORE_DELETION_JOURNAL_THROUGH="2026-10-19T00:00:00Z" \
node ops/backup/replay-deletions.mjs /secure/independent-journal.json
```
*Expected Output*:
```json
{
  "status": "erasure-replay-complete",
  "journalId": "dr-incident-20261019-recovery",
  "through": "2026-10-19T00:00:00Z",
  "requestedAccounts": 2,
  "replayedAccounts": 2
}
```

### Step 5: Execute Read-Only Reconciliation Verification
Verify that 0 erased accounts remain in the database using the read-only checker:
```bash
RESTORE_DATABASE_URL="$RESTORE_DATABASE_URL" \
RESTORE_EXPECTED_DATABASE="$RESTORE_EXPECTED_DATABASE" \
RESTORE_DELETION_MANIFEST_SHA256="<approved-sha256>" \
RESTORE_DELETION_JOURNAL_THROUGH="2026-10-19T00:00:00Z" \
node ops/backup/verify-restored-deletions.mjs /secure/independent-journal.json
```
*Expected Output*:
```json
{
  "status": "listed-erased-accounts-absent",
  "journalId": "dr-incident-20261019-recovery",
  "through": "2026-10-19T00:00:00Z",
  "checkedAccounts": 2,
  "remainingAccounts": 0
}
```

### Step 6: Verify Healthcheck & Release Quarantine
Start the application with recovery gate verification enabled:
```bash
RECOVERY_REPLAY_GATE=true \
RESTORE_DELETION_JOURNAL_THROUGH="2026-10-19T00:00:00Z" \
DATABASE_URL="$RESTORE_DATABASE_URL" \
npm start
```

Test readiness endpoint:
```bash
curl -f http://localhost:4000/readyz
```
*Expected Result*: Returns HTTP 200 with `status: "healthy"` and `services.recoveryReplay: "up"`.

### Step 7: Traffic Cutover
Only after Steps 1 through 6 have passed with zero errors, update the DNS records and load balancer target groups to direct production user traffic to the restored instance.

---

## 3. Disaster Recovery Drill Verification Checklist

- [x] Pre-replay detection fails when historical accounts are present.
- [x] Departed user authored messages are erased upon replay.
- [x] Surviving group members' conversation history and messages survive intact.
- [x] Buyer and payment personal shipping details are minimized.
- [x] Post-replay verification script exits 0 with 0 remaining accounts.
- [x] `/readyz` blocks traffic until recovery replay log is validated.
- [x] No production data was deleted or altered during synthetic drill testing.
