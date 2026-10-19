# Privacy and data-flow inventory — 19 October 2026

This inventory describes observed implementation and its limits across account-bound and unbound data stores in Yor Talks. It does not assign statutory legal bases, invent arbitrary retention obligations, approve an operator or certify compliance. [SECURITY_FINDINGS.md](SECURITY_FINDINGS.md) records confirmed security repairs; the final compliance and release-gate reports record decisions requiring qualified legal and operational review.

## Store-by-store inventory: account-bound and unbound records

| Data store | Record category & purpose | Ownership & binding | Retention schedule & controls | Deletion behavior & recovery replay | Unresolved policy & launch gates |
| --- | --- | --- | --- | --- | --- |
| **PostgreSQL** | Account credentials & profile (`users`, `user_terms_acceptances`) | Account-bound (authenticated subject). | Active account lifetime. Access tokens 15m; sessions 7d. | `DELETE /users/me` erases row, cascades FKs, writes `deletion_journal`, suppresses promotional emails. | Approved retention schedule for dormant/inactive accounts; statutory age assurance. |
| **PostgreSQL** | Messages & direct/group conversations (`messages`, `conversations`, `conversation_members`) | Account-bound authored messages; shared group membership. | Active conversation duration. Disappearing messages vanish per expiry; unread previews exclude vanished text. | Departing member's authored messages are permanently deleted; surviving group members' conversations and messages are preserved intact. Replay script enforces identical preservation. | Expired message purge job schedule; statutory intercept / retention orders. |
| **PostgreSQL** | Commerce & financial ledger (`payment_orders`, `subscriptions`, `marketplace_orders`, `ledger_transactions`) | Account-bound references with counterparty isolation. | Retained for financial audit. `ON DELETE SET NULL` prevents cascading financial ledger. | User ID nulled; shipping details minimized; product title snapshotted; counterparty transactions intact. | Statutory tax/accounting retention period (e.g. 7–10 years); financial regulator jurisdiction. |
| **PostgreSQL** | Moderation & grievances (`reports`, `report_moderation_events`, `grievance_tickets`) | Mix: authenticated reporter (account-bound) vs public URL grievance (unbound). | Active review + dispute period. Staff internal notes private. | Reporter identity decoupled; lookup tokens hashed; resolved tickets retained for audit. | Statutory SLA deadline (dropped pending territorial approval); appeal notice retention. |
| **PostgreSQL** | Pre-registration & waitlist (`preregistrations`, `waitlist`) | **Unbound** (visitor email + preferred username). Knowledge of email does not grant ownership. | Pre-launch through account activation or verified erasure request. | Verified challenge erasure (`POST /api/privacy/request`) or account deletion erases row. Unsubscribe marks `unsubscribed_at`. | Retention policy for unactivated reservations after launch (1 Dec 2026). |
| **PostgreSQL** | Consent ledger & suppressions (`consent_records`, `email_suppressions`) | Mix: unbound (subject email hash) and account-bound (user UUID). | Permanent suppression list to honour unsubscribes and deletions. | Added on unsubscribe, account deletion, or verified objection. Never removed on backup restore. | Cross-border transfer of suppression hashes; regulator suppression list integration. |
| **PostgreSQL** | Durable deletion journal (`deletion_journal`, `recovery_replay_log`) | System / audit store. Pseudonymous (UUID + stable SHA-256 digest). Minimal. | Permanent disaster-recovery authority. | Immutable audit log. Used by `replay-deletions.mjs` to re-erase resurrected accounts after backup restore. | Off-host replication security; cryptographic key custody for manifest signing. |
| **Redis** | Sessions, rate limits, OTPs, verification nonces, socket mapping | Ephemeral account-bound sessions; unbound IP rate buckets. | Device sessions: 7d; email verification: 24h; login codes: 5m; privacy challenges: 15m; rate limits: 1m–1h. | Explicit logout / account deletion flushes user keys (`session:${userId}:*`). Background cleanup worker handles retries. | Cluster failover replication persistence; cold restart recovery protocol. |
| **Queues (BullMQ / PostgreSQL)** | Background tasks (`background_jobs`, notification worker) | Account-bound delivery tasks (`account_cleanup`, `media_cleanup`, notifications). | Ephemeral execution. Lease tokens with expiry; dead-letter recording on persistent failure. | Completed tasks scrub payloads, retaining only dedup keys and failure diagnostic metadata. | Dead-letter queue retention period; cleanup of historical job metadata. |
| **Application & Access Logs** | Pino JSON logs, HTTP request logs, Prometheus metrics | Ephemeral operational records. URLs sanitized via `requestLogPath`. | Query params and tokens stripped; credentials never logged. Deployment log retention external. | Logs not coupled to PostgreSQL transactions; retention must be enforced at aggregator. | Production log aggregator retention period (e.g. 30–90 days); access control audits. |
| **Product Analytics** | Raw telemetry events & daily rollups (`creator_analytics_daily`) | Account-bound with explicit adult opt-in requirement. | Raw events pruned after daily rollup; aggregate rollups retained. | Withdrawal clears local pending queue and halts ingestion. | Aggregate re-identification assessment; complete retention schedule approval. |
| **Media Providers (Cloudinary)** | Uploaded images, videos, audio clips, avatars | Account-bound media assets with provider public IDs. | Active asset lifetime. Unreferenced uploads held for review. | Account deletion writes `media_cleanup_holds` and queues `media_cleanup` background jobs for asynchronous provider API deletion. | Processor deletion SLA; provider-side backup retention; legacy URL ownership resolution. |
| **Backups & Archives** | PostgreSQL pg_dump encrypted with Age; remote rclone sync | Full database snapshot at backup instant $T_0$. | Local encrypted artifacts: 14 days default. Remote lifecycle operator-configured (e.g. 35 days). | Restoring historical backup resurrects users deleted between $T_0$ and $T_{now}$. **Replay engine (`replay-deletions.mjs`) is mandatory before serving traffic.** | Remote object immutability / S3 Object Lock; off-host key custody; disaster recovery drills. |

---

## Verified rights-request workflows

1. **Email Ownership Boundary**:
   - Merely knowing or providing an email address **never establishes ownership** or confirms the existence of an account, waitlist reservation, or pre-registration.
   - `POST /api/privacy/challenge` returns an identical, generic HTTP 200 response (`{ success: true, message: "If records exist for this address, a secure verification link has been sent.", data: { initiated: true } }`) regardless of whether records exist.
   - A cryptographically random 32-byte single-use token with a 15-minute expiration is delivered exclusively to the target email address.
   - Challenge tokens are single-use; once verified, they cannot be replayed.

2. **Unbound Record Handling**:
   - Pre-registration and waitlist entries are unbound until an account is registered and email ownership is confirmed via link verification.
   - Verified rights requests (`POST /api/privacy/request`) allow subjects to:
     - **Erasure**: Permanently delete unbound waitlist and pre-registration records, register email suppression, and revoke consent.
     - **Restriction / Objection**: Suppress future communications, withdraw consent, and record restriction.
     - **Correction**: Update pre-registration preferred handles (subject to uniqueness constraints).
     - **Access**: Inspect pre-registration status or verify historical account deletion status.

3. **Active Account Anti-Takeover Boundary**:
   - An unauthenticated email challenge token **cannot delete an active registered user account**.
   - If an active account exists, the rights workflow returns HTTP 409 explaining that full account deletion requires logging into the account and confirming the current password (`DELETE /users/me`). This prevents malicious account deletion via temporary email interception or shared mailbox access.

4. **Account Deletion & Group History Preservation**:
   - When an account is deleted via `DELETE /users/me`:
     - The departing author's messages are permanently erased (`DELETE FROM messages WHERE sender_id = $userId`).
     - Surviving group members' conversation history, messages, and membership are strictly preserved.
     - Financial records are minimized, preserving ledger integrity.
     - A permanent record is written to `deletion_journal` containing the account UUID and `stable_identity_digest` (`sha256(lower(email))`).
     - Promotional and launch email suppressions are recorded automatically.
     - All granted consents are marked withdrawn.

5. **Disaster Recovery Erasure Replay Engine**:
   - Restoring a historical PostgreSQL backup restores users deleted after the backup was created.
   - Services are blocked from serving traffic (`/readyz` returns HTTP 503) when `RECOVERY_REPLAY_GATE=true` until the erasure replay has completed and verified.
   - `ops/backup/replay-deletions.mjs` consumes an independently validated manifest (verified with external SHA-256 and cutoff timestamp), re-executing erasures on all resurrected accounts, minimizing financial data, and preserving surviving group messages.
   - `ops/backup/verify-restored-deletions.mjs` verifies with a read-only repeatable-read transaction that 0 erased accounts remain before traffic cutover.

6. **Email Consent & Suppression Enforcement**:
   - Promotional email dispatch remains strictly disabled (`PROMOTIONAL_EMAIL_ENABLED=false`).
   - 3-stage suppression and consent enforcement is applied at:
     1. **Enqueue stage**: Rejects jobs if promotional sending is disabled, email is suppressed, or consent is absent/withdrawn.
     2. **Worker retry stage**: Re-verifies live database suppression to drop jobs if a recipient unsubscribed while queued.
     3. **Send execution stage**: Pre-flight verification in `EmailService` prior to provider dispatch.
   - Transactional security emails (`sendVerificationEmail`, `sendPasswordResetEmail`, `sendEmailLoginCode`, `sendPrivacyChallengeEmail`) are completely independent of promotional suppression preferences.
