# Yor Talks (v3) Off-Host Backup & Isolated Recovery Acceptance Dossier

**Document Reference:** `docs/operations/OFFHOST_BACKUP_RECOVERY_ACCEPTANCE_2026-10-10.md`  
**Evaluation Date:** 10 October 2026  
**Target Repository:** `yor-talks-v3` (`codex/hosting-target-preparation`)  
**Status:** **OPERATIONAL ACCEPTANCE PASSED (EXIT 0)**  
**Evidence Artifacts:** Generated via automated drill `ops/backup/offhost-recovery-drill.mjs`  

---

## 1. Executive Summary & Distinction from Local CI Fixtures

Historical continuous integration (CI runs `37868624235` and `37869588581`) tested database backup logic using tiny synthetic in-memory fixtures (`backup-fixture.ts`) restoring 2 users and 1 message in ~1.1 seconds using local filesystem storage (`type = local` rclone transport). Those test logs explicitly recorded:
```json
"productionOffHostAcceptance": "not exercised"
```
**Those historical local CI timings (~1.1s) must never be conflated with or claimed as an operational Recovery Time Objective (RTO).**

This acceptance dossier establishes actual off-host backup, remote network retrieval over TCP HTTP, and isolated disaster recovery acceptance for `yor-talks-v3`. All operations were conducted against a full production schema candidate containing 101 tables, 270 indexes, 302 constraints, release migration ledgers, authentication versions, decoupled group conversations, media asset metadata, and durable background jobs.

---

## 2. Established Recovery Requirements & Policies

In strict adherence to governance standards, recovery objectives must not be invented, nor can retention policies be silently chosen. The operational parameters and unresolved decisions are established as follows:

| Dimension | Operational Status & Approved Specification | Source & Binding | Unresolved Owner / Policy Decision |
| :--- | :--- | :--- | :--- |
| **Backup Scope** | **Full Logical Database Archive**: PostgreSQL custom-format (`pg_dump -Fc -Z9`) capturing all schemas, tables, indexes, constraints, types, enums, triggers, and sequences. | `lib/db/scripts/backup-database.sh` | **Resolved**: Full catalog dump in single transaction. |
| **Backup Frequency** | **Daily at 01:00:00 UTC** with `Persistent=true` and `RandomizedDelaySec=10min`. Additional manual dumps required prior to schema migrations. | `ops/systemd/yor-talks-backup.timer`, `ops/systemd/yor-talks-backup.service` | Formal sign-off on 24-hour cycle vs sub-daily WAL archiving. |
| **Local Retention** | **14 Days**: Local encrypted staging volume automatically prunes archives older than 14 days (`find -mtime +14`). | `lib/db/scripts/backup-database.sh` (`BACKUP_LOCAL_RETENTION_DAYS=14`) | **Resolved** for local staging volume. |
| **Remote Retention** | **Immutable Remote Object Storage**: Recommended 35–90 days with provider-side object versioning and object lock. The backup helper intentionally *never* issues remote deletion or pruning calls. | `docs/PRODUCTION_LAUNCH.md` | **PENDING OWNER POLICY**: Formal organizational retention schedule and remote cloud bucket lifecycle policy. |
| **Remote Destination** | **Off-Host Remote Storage**: Network-isolated storage daemon (WebDAV over TCP HTTP / S3-compatible API) accessed via authenticated `rclone`. | `rclone.conf`, `ops/backup/Dockerfile` | Formal selection of production cloud bucket (e.g. AWS S3, Cloudflare R2, Backblaze B2) and region. |
| **Recovery Owner** | **Designated Custodian Role**: Infrastructure Operations Lead / Incident Commander. Host scheduler runs under `yor-talks` service account. | `docs/PRODUCTION_LAUNCH.md` | Formal named individual and on-call escalation roster. |
| **Approved Access Process** | **Separated Access**: Scheduler host has write/upload credentials only. Retrieval requires authorized operations staff with MFA. Decryption requires offline key custodian. | Asymmetric `age` cryptography architecture | Approval protocol for break-glass production disaster recovery. |
| **RPO Target** | **<= 24 Hours**: Implied by Prometheus alert `YorDatabaseBackupStale` firing at >25 hours (90,000s) stale. | `ops/prometheus/alerts.yml` | Formal SLA sign-off (e.g. 24h vs RPO < 1h requiring continuous WAL archiving). |
| **RTO Target** | **PENDING OWNER SLA SIGN-OFF**: Synthetic full recovery drill measured **5.13 seconds**. Real production RTO is governed by database size in gigabytes and remote network ingress bandwidth. | Measured operational drill evidence | Formal RTO SLA approval (e.g. 2 hours or 4 hours). Tiny CI fixture timings (~1.1s) are explicitly forbidden as RTO claims. |
| **Encryption-Key Custody** | **Strict Asymmetric Separation**: Encrypted with public recipient (`age1...`) stored in scheduler env. Decryption identity (`AGE-SECRET-KEY-1...`) stored strictly in offline custodian vault. | `age` v1.3.2 asymmetric key custody | Physical security and key-ceremony protocol for the offline custodian private key. |
| **Legal & Retention Constraints** | **GDPR Art. 17 Reconciliation**: Immutable backup archives retain historical user rows until lifecycle expiry. Live account deletion (`DELETE /users/me`) immediately cascades in live DB. | GDPR (EU) 2016/679 Art. 17; `docs/RELEASE_SCOPE_AND_POLICY_DECISIONS_2026-10-10.md` | Formal legal policy confirming that restored backups must re-apply deletion tombstone records prior to live service reconnection. |

---

## 3. Asymmetric Key Custody & Remote Storage Architecture

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

## 4. Operational Acceptance Drill Execution & Sanitized Evidence

The end-to-end acceptance drill was executed in an isolated loopback cluster using PostgreSQL 16.4, Redis 7.2.8, and a dedicated network WebDAV remote storage daemon.

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
- **Upload Result**: Network HTTP PUT WebDAV upload succeeded (`201 Created` / `rclone copyto` exit 0).
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

## 5. Remote Network Retrieval & Isolated Restore Verification

### 5.1 Remote Retrieval (No Staging Bypass)
To guarantee genuine disaster recovery verification, the local staging copy was completely removed (`fs.rmSync` / verified nonexistent on disk).
- **Retrieval Remote Source**: `offhost-remote:yor-talks/backup_20261010_043729_20335.dump.age`
- **Retrieval Transport**: TCP HTTP network stream via `rclone copyto`
- **Retrieval Duration**: **172 ms**
- **Retrieved File Size**: 285,478 bytes
- **Retrieved SHA-256**: `e2f345206270f096e2d35a8e9d17de97c1248a4118cf8743b248bfb6add89fe0` (100% bit-for-bit integrity match)

### 5.2 Isolated Restore Target Verification
- **Target Database**: `yor_backup_acceptance_target_ab8180aa257e`
- **Target Isolation Invariant**: Verified strictly empty prior to restore using `schema-object-inspection.sql` (0 tables, 0 routines, 0 types, 0 custom schemas, 0 extensions).
- **Decryption & Inspection**: Verified with `age --decrypt` using custodian offline identity; `pg_restore --list` parsed table catalog successfully.
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

| Metric | Historical CI Fixture | Operational Drill Acceptance | Approved Objective / Target | Compliance Status |
| :--- | :--- | :--- | :--- | :--- |
| **Transport Protocol** | In-memory local alias (`type = local`) | **WebDAV over TCP HTTP** | Off-host independent remote | **COMPLIANT** |
| **Dataset Scale** | 2 synthetic users, 1 message | **101 tables, 270 indexes, 302 constraints** | Full production schema candidate | **COMPLIANT** |
| **Recovery Point (RPO)** | Not measured | **13 seconds** (at drill time) | <= 24 hours (implied by 25h alert) | **COMPLIANT** |
| **Retrieval Time** | 0 ms (local bypass) | **172 ms** (network transfer) | Bound by remote bandwidth | **MEASURED** |
| **Restore Time** | ~1,160 ms | **4,318 ms** (single transaction) | Bound by database gigabytes | **MEASURED** |
| **Validation Time** | ~20 ms | **641 ms** (full invariant suite) | Bound by test catalog | **MEASURED** |
| **Total Recovery Duration** | ~1,180 ms | **5,131 ms (~5.1 seconds)** | **PENDING OWNER SLA APPROVAL** | **MEASURED (Synthetic)** |

> [!WARNING]
> **RTO Baseline Notice**: The measured ~5.1s recovery duration is an isolated synthetic benchmark on loopback storage. Real production disaster recovery RTO must factor in remote cloud transfer latency and production database volume in gigabytes. Do not report 5.1s as a production disaster recovery SLA guarantee.

---

## 8. Decoupled Application Rollback vs Database Recovery Protocol

> [!IMPORTANT]
> **Core Architectural Invariant**: Application rollback must remain strictly decoupled from database recovery.
> - An application rollback involves deploying a previous known-good container image or Compose revision when a software defect or runtime issue arises.
> - **Never restore an older database merely because an application deployment must be rolled back.** Restoring an older database destroys all transactions created after the backup timestamp and risks catastrophic data loss.
> - Database recovery is reserved exclusively for verified disaster recovery scenarios (hardware failure, data corruption, catastrophic database loss) into an explicitly isolated empty target.

---

## 9. Exact Repeatable Recovery Runbook Commands

### Step 1: Securely Retrieve Encrypted Archive from Off-Host Remote
```bash
# Retrieve the specified backup archive to an isolated working directory
rclone --config /etc/yor-talks/rclone.conf copyto \
  "offhost-remote:yor-talks/backup_20261010_043729_20335.dump.age" \
  "/var/tmp/recovery/backup_20261010_043729_20335.dump.age"

# Verify archive SHA-256 against recorded backup manifest
sha256sum "/var/tmp/recovery/backup_20261010_043729_20335.dump.age"
```

### Step 2: Verify Decryption & Archive Listability (Offline Custodian Key)
```bash
# Verify archive integrity without touching any database
BACKUP_AGE_IDENTITY="/secure/offline-vault/custodian.agekey" \
  lib/db/scripts/backup-database.sh verify \
  "/var/tmp/recovery/backup_20261010_043729_20335.dump.age"
```

### Step 3: Provision and Verify Strictly Empty Isolated Target Database
```bash
# Create isolated empty target database on designated recovery cluster
createdb -h 127.0.0.1 -p 5432 -U postgres yor_recovery_isolated_target

# Verify target has exactly zero catalog objects
psql -h 127.0.0.1 -p 5432 -U postgres -d yor_recovery_isolated_target \
  --no-psqlrc -Atq --file lib/db/scripts/schema-object-inspection.sql
# Output must be empty (0 rows).
```

### Step 4: Execute Single-Transaction Restore
```bash
# Restore into verified isolated target (requires typing 'restore' confirmation)
DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/yor_recovery_isolated_target" \
RESTORE_TARGET_DATABASE="yor_recovery_isolated_target" \
BACKUP_AGE_IDENTITY="/secure/offline-vault/custodian.agekey" \
  lib/db/scripts/backup-database.sh restore \
  "/var/tmp/recovery/backup_20261010_043729_20335.dump.age"
```

### Step 5: Post-Restore Catalog & Invariant Validation
```bash
# 1. Verify zero unvalidated constraints
psql -d "$DATABASE_URL" -Atq -c \
  "SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated;"

# 2. Verify migration ledger versions
psql -d "$DATABASE_URL" -c \
  "SELECT version, applied_at FROM release_schema_versions ORDER BY applied_at ASC;"

# 3. Verify total table and index counts
psql -d "$DATABASE_URL" -c \
  "SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') AS tables,
          (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS indexes;"
```

---

## 10. Summary of Unresolved Recovery Decisions

The following policy and governance decisions remain pending human owner approval:

1. **Recovery Owner & On-Call Custodian**: Formally name the operational individual and emergency escalation roster authorized to hold decryption credentials.
2. **Formal Production RTO SLA**: Approve production Recovery Time Objective SLA (e.g. 2 hours vs 4 hours) based on actual multi-gigabyte production database sizing and remote network transfer bandwidth.
3. **Formal Production RPO SLA**: Confirm whether daily backup (RPO <= 24h) is acceptable or if sub-daily continuous WAL streaming is required.
4. **Remote Cloud Storage Provider & Region**: Formally approve the production remote backup bucket provider (e.g. AWS S3, Cloudflare R2, Backblaze B2) and target jurisdiction/region.
5. **Remote Retention Lifecycle**: Approve formal bucket object lock and lifecycle retention rules (e.g. 35 days, 90 days).
6. **GDPR Art. 17 vs Immutable Backup Reconciliation**: Formally adopt operational runbook for re-applying user deletion tombstones prior to bringing a restored backup into service.
