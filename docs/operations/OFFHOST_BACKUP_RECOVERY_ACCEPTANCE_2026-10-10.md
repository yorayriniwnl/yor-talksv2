# Yor Talks (v3) Backup and Isolated Recovery Drill Evidence

**Document Reference:** `docs/operations/OFFHOST_BACKUP_RECOVERY_ACCEPTANCE_2026-10-10.md`  
**Evaluation Date:** 10 October 2026  
**Target Repository:** `yor-talks-v3` (`codex/hosting-target-preparation`)  
**Status:** **SYNTHETIC LOOPBACK DRILL PASSED (EXIT 0); PRODUCTION OFF-HOST ACCEPTANCE NOT ESTABLISHED**
**Evidence Artifacts:** Generated via automated drill `ops/backup/offhost-recovery-drill.mjs`  

---

## 1. Scope and Distinction from CI Fixtures and Production Acceptance

Historical continuous integration (CI runs `37868624235` and `37869588581`) tested database backup logic using tiny synthetic in-memory fixtures (`backup-fixture.ts`) restoring 2 users and 1 message in ~1.1 seconds using local filesystem storage (`type = local` rclone transport). Those test logs explicitly recorded:
```json
"productionOffHostAcceptance": "not exercised"
```
**Those historical local CI timings (~1.1s) must never be conflated with or claimed as an operational Recovery Time Objective (RTO).**

This dossier records a synthetic, isolated loopback drill. It exercises encrypted backup, WebDAV upload and retrieval, and restore into an empty PostgreSQL database using a full schema-shaped candidate (101 tables, 270 indexes, 302 constraints, release migration ledgers, authentication versions, group conversations, media metadata, and durable jobs). The source database and the WebDAV server both bind to `127.0.0.1` on the same workstation; the WebDAV data directory is a temporary local directory. This proves the backup and restore code paths against the tested schema. It does **not** establish off-host independence, production storage durability, production key custody, or an approved operational RPO/RTO.

---

## 2. Established Recovery Requirements & Policies

In strict adherence to governance standards, recovery objectives must not be invented, nor can retention policies be silently chosen. The operational parameters and unresolved decisions are established as follows:

| Dimension | Tested Configuration / Current State | Source & Binding | Remaining Production Acceptance |
| :--- | :--- | :--- | :--- |
| **Backup Scope** | Synthetic PostgreSQL 16.4 database restored from a custom-format archive. The schema-shaped fixture exercises 101 tables, indexes, constraints, and representative records; no production database was used. | `lib/db/scripts/backup-database.sh`; `ops/backup/offhost-recovery-drill.mjs` | Approve and rehearse the production database backup scope. |
| **Backup Frequency** | A daily 01:00 UTC systemd timer is present in the repository. It was not installed or observed on a production host. | `ops/systemd/yor-talks-backup.timer`, `ops/systemd/yor-talks-backup.service` | Select the production schedule and approve daily backups versus sub-daily/WAL recovery. |
| **Local Retention** | The script defaults local staging retention to 14 days. This is a technical default, not an organization-wide retention policy. | `lib/db/scripts/backup-database.sh` (`BACKUP_LOCAL_RETENTION_DAYS`) | Approve the data retention schedule and production setting. |
| **Remote Retention** | The helper does not delete remote objects. No cloud bucket lifecycle, versioning, or object-lock policy was configured in this drill. | `lib/db/scripts/backup-database.sh`; `docs/PRODUCTION_LAUNCH.md` | Select a provider, region, versioning, and approved retention lifecycle. |
| **Remote Destination** | The test used `rclone serve webdav` bound to `127.0.0.1`; the archive directory was on the same workstation. This is not off-host storage. | `ops/backup/offhost-recovery-drill.mjs` | Provision an independent production destination and repeat upload, retrieval, and restore through its approved access process. |
| **Recovery Owner** | No production recovery owner or on-call roster is designated. Role names in the runbook are proposed responsibilities only. | `docs/PRODUCTION_LAUNCH.md`; `docs/RELEASE_SCOPE_AND_POLICY_DECISIONS_2026-10-10.md` | Name the accountable owner and escalation contacts. |
| **Approved Access Process** | The drill generated a temporary test key and WebDAV credential locally. No production MFA, break-glass approval, or offline key-custody process was exercised. | `ops/backup/offhost-recovery-drill.mjs` | Approve and test production retrieval authorization and key custody. |
| **RPO Target** | Not approved or measured. The `YorDatabaseBackupStale` alert threshold is a detection rule, not an RPO commitment. | `ops/prometheus/alerts.yml` | Approve the production RPO and implement a backup/WAL schedule that meets it. |
| **RTO Target** | Not approved or measured. The approximately 5.13-second result is from a synthetic loopback drill and cannot predict production recovery time. | Drill timing evidence in this dossier | Approve the production RTO and measure it against the selected host, remote storage, and representative database size. |
| **Encryption-Key Custody** | The drill-generated private key was stored under the same temporary working directory and used by the same workstation. Production key separation was not tested. | `ops/backup/offhost-recovery-drill.mjs` | Establish and verify independent production encryption and recovery key custody. |
| **Deletion and Retention** | The drill verifies database restore invariants only. It does not exercise applying post-backup deletion records before a restored database returns to service. | `docs/RELEASE_SCOPE_AND_POLICY_DECISIONS_2026-10-10.md` | Approve retention policy and a recovery procedure for reconciling deletion requests before reconnecting restored service. |

---

## 3. Proposed Key Custody and Remote Storage Design (Not Exercised)

The diagram below describes a possible production design. It was not deployed or validated by the drill. The drill-generated key and loopback WebDAV credentials were temporary test material on one workstation.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               KEY & ACCESS CUSTODY SEPARATION                          │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ Scheduler & Host Environment (Public Only)│ Offline Custodian Vault (Private Only)     │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ • BACKUP_AGE_RECIPIENT:                   │ • BACKUP_AGE_IDENTITY:                     │
│   age1nfpjphzgykp9jjh0c7fg0vt5szh...      │   AGE-SECRET-KEY-1...                      │
│ • Permissions: Mode 0640 env / secrets     │ • Location: Offline encrypted custody vault│
│ • Privilege: Encryption & upload ONLY     │ • Access: Authorized custodian MFA break-  │
│ • Stored on host / container: YES (Public)│   glass access only                        │
│ • Private decryption key present: NO      │ • Stored on scheduler/container: NEVER     │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

### Remote Transport Custody:
- **Transport**: WebDAV (RFC 4918) / S3 over TCP HTTP.
- **Credential Storage**: Protected `rclone.conf` with obscured credentials (`rclone obscure`), permissions mode `0600`, owned by dedicated service account.
- **Decoupled Decryption Authority**: Decryption keys are never stored alongside backup archives on remote storage or on the scheduled backup runner.

---

## 4. Synthetic Loopback Drill Execution & Sanitized Evidence

The drill ran an isolated PostgreSQL 16.4 cluster, Redis 7.2.8, and an `rclone serve webdav` process on the same workstation. That WebDAV server bound to `127.0.0.1`; it was a protocol test endpoint, not an independent host or cloud provider.

### 4.1 Source Database & Backup Run Evidence
- **Source Environment**: Isolated synthetic production cluster on `127.0.0.1:55480` (PostgreSQL 16.4, 64-bit).
- **Source Database Identity**: `yor_backup_acceptance_source_ab8180aa257e`
- **Migration Ledger Versions**:
  - `20261007-message-integrity-1`
  - `20261008-notification-delivery-1`
  - `20261004-media-1`
  - `20261005-media-2`
  - `20261006-media-3`
  - `20261007-eligibility-3`
- **Source Inventory**: 101 tables, 270 indexes, 302 constraints.
- **Seeded Application Dataset**: 3 users (with `auth_version` tracking and password hashes), password reset tokens, direct conversations, normalized group conversations with membership roles, approved media assets with sha256 digests and references, durable background jobs, and runtime heartbeats.
- **Backup Timestamp**: `2026-10-09T23:07:28.903Z`
- **Execution Duration**: 1,543 ms
- **Encrypted Archive Identifier**: `backup_20261010_043729_20335.dump.age`
- **Archive Size**: 285,478 bytes (~278.8 KiB)
- **Archive SHA-256**: `e2f345206270f096e2d35a8e9d17de97c1248a4118cf8743b248bfb6add89fe0`
- **Upload Result**: HTTP PUT to the loopback WebDAV test endpoint succeeded (`201 Created` / `rclone copyto` exit 0). This verifies the upload path, not off-host durability.
- **Prometheus Metrics Recorded** (`metrics/yor-talks-backup.prom`):
  ```prometheus
  # HELP yor_backup_last_success_timestamp_seconds Unix timestamp of the latest encrypted off-host backup.
  # TYPE yor_backup_last_success_timestamp_seconds gauge
  yor_backup_last_success_timestamp_seconds 1791587250
  # HELP yor_backup_last_run_success Whether the latest backup and remote upload succeeded.
  # TYPE yor_backup_last_run_success gauge
  yor_backup_last_run_success 1
  # HELP yor_backup_last_attempt_timestamp_seconds Unix timestamp of the latest backup attempt.
  # TYPE yor_backup_last_attempt_timestamp_seconds gauge
  yor_backup_last_attempt_timestamp_seconds 1791587250
  ```

---

## 5. Loopback WebDAV Retrieval & Isolated Restore Verification

### 5.1 Loopback Test Retrieval (No Staging Bypass)
The local staging copy was removed and the archive was fetched from a separate temporary directory served by the loopback WebDAV process. Both directories and the server were on the same workstation; this does not establish independent off-host recovery.
- **Retrieval Test Source**: `loopback-test:yor-talks/backup_20261010_043729_20335.dump.age`
- **Retrieval Transport**: TCP HTTP stream over loopback via `rclone copyto`
- **Retrieval Duration**: **172 ms**
- **Retrieved File Size**: 285,478 bytes
- **Retrieved SHA-256**: `e2f345206270f096e2d35a8e9d17de97c1248a4118cf8743b248bfb6add89fe0` (100% bit-for-bit integrity match)

### 5.2 Isolated Restore Target Verification
- **Target Database**: `yor_backup_acceptance_target_ab8180aa257e`
- **Target Isolation Invariant**: Verified strictly empty prior to restore using `schema-object-inspection.sql` (0 tables, 0 routines, 0 types, 0 custom schemas, 0 extensions).
- **Decryption & Inspection**: Verified with `age --decrypt` using the drill-generated test key in the temporary working directory; `pg_restore --list` parsed the table catalog successfully.
- **Transactional Restore Duration**: **4,318 ms** (`--single-transaction` mode confirmed).

### 5.3 Post-Restore Application & Schema Invariant Verification (Duration: 641 ms)
1. **Catalog Inventory Match**:
   - Tables: **101 / 101** (exact match)
   - Indexes: **270 / 270** (exact match)
   - Constraints: **302 / 302** (exact match)
   - Unvalidated Constraints: **0** (strictly 0 unvalidated constraints)
2. **Release Migration Ledger**: All 6 historical release versions verified present in order.
3. **Authentication & Credential Epochs**:
   - User A restored with `auth_version = 7`.
   - Bcrypt password hash verified and matches original secret.
   - Password reset token restored with matching `auth_version = 7`.
   - Simulated token revocation (logout-all) successfully advanced `auth_version` to 8.
4. **Message Visibility & Group Integrity**:
   - Direct conversation and unique constraints restored.
   - Group conversation restored with `participant_a = NULL`, `participant_b = NULL`, and 3 normalized members (`admin`, `member`, `member`).
   - Cascade safety verified: deleting a user member row left group conversation and surviving messages intact.
5. **Media Metadata Relationships**:
   - Media asset restored with `status = 'approved'`, `provider = 'cloudinary'`, and matching SHA-256 digest.
   - Media reference constraint pointing to message attachment verified intact.
6. **Durable Background Jobs**:
   - Background job `notification_digest` restored in `status = 'pending'` with dedup key intact.
   - Worker runtime heartbeat row verified intact.

---

## 6. Negative Failure Scenarios Verification

Six negative failure modes were exercised on isolated targets to verify fail-closed behavior:

| Scenario | Injected Fault | Expected Behavior | Observed Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **A: Corrupt Archive** | Truncated byte payload (128 bytes) | Verify and restore reject corrupt archive | `age: error: ... header invalid`; exit code 1 | **PASSED** |
| **B: Wrong Key** | Mismatched age identity key | Verify and restore refuse decryption | `age: error: no identity matched`; exit code 1 | **PASSED** |
| **C: Failed Upload** | Unreachable remote storage host | Backup exits non-zero; failure metric emitted | Exits code 1; `yor_backup_last_run_success 0` recorded | **PASSED** |
| **D: Inappropriate Target** | Target name mismatch or self-restore to source DB | Helper aborts before connecting | Refused: "restore target identity is not the explicitly approved isolated database"; exit code 1 | **PASSED** |
| **E: Non-Empty Target** | Pre-existing table, function, type, schema, or extension | Helper aborts; target remains untouched | Rejection triggered across all 5 object kinds; 0 application tables created | **PASSED** |
| **F: Transactional Failure** | Permission failure during restore table creation | Single transaction rolls back entirely | Restore aborted on permission denied; **exactly 0 partial tables left in target** | **PASSED** |

---

## 7. Objective Comparison & Recovery Timings

| Metric | Historical CI Fixture | Synthetic Loopback Drill | Production Objective / Acceptance | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Transport Protocol** | In-memory local alias (`type = local`) | **WebDAV over loopback TCP HTTP** | Independent approved off-host destination and retrieval | **Not established** |
| **Dataset Scale** | 2 synthetic users, 1 message | **101 tables, 270 indexes, 302 constraints** in a synthetic schema-shaped database | Representative production schema/data and approved restore host | **Schema-shaped test passed; production unverified** |
| **Recovery Point** | Not measured | Backup age observed at about 13 seconds during the drill | Owner-approved RPO and an acceptance test that meets it | **Not approved or measured** |
| **Retrieval Time** | 0 ms (local bypass) | **172 ms** on loopback | Retrieval from approved independent storage at representative size | **Synthetic measurement only** |
| **Restore Time** | ~1,160 ms | **4,318 ms** (single transaction) | Restore on the approved target using representative database size | **Synthetic measurement only** |
| **Validation Time** | ~20 ms | **641 ms** (test invariant suite) | Production recovery validation plan | **Synthetic measurement only** |
| **Total Recovery Duration** | ~1,180 ms | **5,131 ms (~5.1 seconds)** | Owner-approved production RTO | **Not approved; synthetic measurement only** |

> [!WARNING]
> **Production acceptance notice**: The measured durations are isolated synthetic loopback results. They are not production RPO/RTO evidence, off-host durability evidence, or an operational SLA. The 25-hour backup alert threshold does not establish a 24-hour RPO.

---

## 8. Decoupled Application Rollback vs Database Recovery Protocol

> [!IMPORTANT]
> **Core Architectural Invariant**: Application rollback must remain strictly decoupled from database recovery.
> - An application rollback involves deploying a previous known-good container image or Compose revision when a software defect or runtime issue arises.
> - **Never restore an older database merely because an application deployment must be rolled back.** Restoring an older database destroys all transactions created after the backup timestamp and risks catastrophic data loss.
> - Database recovery is reserved exclusively for verified disaster recovery scenarios (hardware failure, data corruption, catastrophic database loss) into an explicitly isolated empty target.

---

## 9. Production Recovery Command Template (Not Exercised)

The following is a template for a future approved production recovery. The loopback WebDAV test server and its temporary archive were removed after the drill; no production remote archive, recovery host, or production key was available. Replace every placeholder only after the owner approves the provider, access process, target, and key custody. These commands are not evidence that those resources exist.

### Step 1: Retrieve an Archive from the Approved Independent Remote
```bash
APPROVED_REMOTE_ARCHIVE="<approved-rclone-remote:path/to/archive.dump.age>"
LOCAL_ARCHIVE="/var/tmp/recovery/archive.dump.age"

# Retrieve the selected backup archive to an isolated working directory
rclone --config /etc/yor-talks/rclone.conf copyto \
  "$APPROVED_REMOTE_ARCHIVE" "$LOCAL_ARCHIVE"

# Verify the checksum against the separately retained backup manifest
sha256sum "$LOCAL_ARCHIVE"
```

### Step 2: Verify Decryption & Archive Listability (Approved Recovery Key)
```bash
LOCAL_ARCHIVE="/var/tmp/recovery/archive.dump.age"
: "${BACKUP_AGE_IDENTITY:?set the approved recovery key path}"
# Verify archive integrity without touching any database
BACKUP_AGE_IDENTITY="$BACKUP_AGE_IDENTITY" \
  lib/db/scripts/backup-database.sh verify \
  "$LOCAL_ARCHIVE"
```

### Step 3: Provision and Verify Strictly Empty Isolated Target Database
```bash
: "${RESTORE_ADMIN_DATABASE_URL:?set the approved isolated recovery cluster connection}"
: "${RESTORE_TARGET_DATABASE_URL:?set the connection to the explicitly isolated target}"
: "${RESTORE_TARGET_DATABASE:?set the exact target database name}"

# Create the isolated target on the approved recovery cluster
createdb --maintenance-db="$RESTORE_ADMIN_DATABASE_URL" "$RESTORE_TARGET_DATABASE"

# Verify target has exactly zero catalog objects
psql "$RESTORE_TARGET_DATABASE_URL" \
  --no-psqlrc -Atq --file lib/db/scripts/schema-object-inspection.sql
# Output must be empty (0 rows).
```

### Step 4: Execute Single-Transaction Restore
```bash
LOCAL_ARCHIVE="/var/tmp/recovery/archive.dump.age"
: "${BACKUP_AGE_IDENTITY:?set the approved recovery key path}"
: "${RESTORE_TARGET_DATABASE_URL:?set the connection to the explicitly isolated target}"
: "${RESTORE_TARGET_DATABASE:?set the exact target database name}"
# Restore into verified isolated target (requires typing 'restore' confirmation)
DATABASE_URL="$RESTORE_TARGET_DATABASE_URL" \
RESTORE_TARGET_DATABASE="$RESTORE_TARGET_DATABASE" \
BACKUP_AGE_IDENTITY="$BACKUP_AGE_IDENTITY" \
  lib/db/scripts/backup-database.sh restore \
  "$LOCAL_ARCHIVE"
```

### Step 5: Post-Restore Catalog & Invariant Validation
```bash
: "${RESTORE_TARGET_DATABASE_URL:?set the connection to the isolated restored target}"
# 1. Verify zero unvalidated constraints
psql "$RESTORE_TARGET_DATABASE_URL" -Atq -c \
  "SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated;"

# 2. Verify migration ledger versions
psql "$RESTORE_TARGET_DATABASE_URL" -c \
  "SELECT version, applied_at FROM release_schema_versions ORDER BY applied_at ASC;"

# 3. Verify total table and index counts
psql "$RESTORE_TARGET_DATABASE_URL" -c \
  "SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') AS tables,
          (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS indexes;"
```

---

## 10. Summary of Unresolved Recovery Decisions

The following policy and governance decisions remain pending human owner approval:

1. **Recovery Owner & On-Call Custodian**: Formally name the operational individual and emergency escalation roster authorized to hold decryption credentials.
2. **Formal Production RTO SLA**: Approve production Recovery Time Objective SLA (e.g. 2 hours vs 4 hours) based on actual multi-gigabyte production database sizing and remote network transfer bandwidth.
3. **Formal Production RPO SLA**: Approve a numeric RPO, then confirm whether daily backups meet it or whether sub-daily backups or continuous WAL archiving are required. The 25-hour alert threshold is not an approved RPO.
4. **Remote Cloud Storage Provider & Region**: Formally approve the production remote backup bucket provider (e.g. AWS S3, Cloudflare R2, Backblaze B2) and target jurisdiction/region.
5. **Remote Retention Lifecycle**: Approve formal bucket object lock and lifecycle retention rules (e.g. 35 days, 90 days).
6. **GDPR Art. 17 vs Immutable Backup Reconciliation**: Formally adopt operational runbook for re-applying user deletion tombstones prior to bringing a restored backup into service.
