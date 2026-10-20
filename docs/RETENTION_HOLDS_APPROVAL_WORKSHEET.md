# Retention and Legal Holds Approval Worksheet — 19 October 2026

This worksheet documents the active retention policies, statutory hold mechanisms, minimization rules, and pending governance decisions across Yor Talks. In accordance with strict compliance engineering principles, **no arbitrary durations or indefinite holds are invented in application code**. All retention parameters must be formally approved by legal counsel and the designated Data Protection Officer (DPO) prior to production launch.

---

## 1. Store-by-Store Retention and Hold Schedule

| Category & Store | Current Technical Implementation | Proposed / Statutory Schedule | Lawful Basis (GDPR / DPDP) | Deletion Trigger | Hold Mechanism & Lifecycle | Unresolved Policy & Required Approval |
| --- | --- | --- | --- | --- | --- | --- |
| **Account Identity & Security**<br>`users`, `user_terms_acceptances` (PostgreSQL) | Active session: 7 days.<br>Access token: 15 minutes.<br>Password reset: 1 hour.<br>Email verification: 24 hours.<br>Login code: 5 minutes. | Active account duration.<br>Inactivity threshold: 24 months (pending approval). | Contractual necessity (Art. 6(1)(b) GDPR). | User deletion request (`DELETE /users/me`) or approved inactivity purge. | Legal hold locks row deletion via administrative hold flag. Account export/delete disabled during active statutory hold. | Inactivity duration (12 vs 24 months); account notification grace period before dormancy deletion. |
| **User-Authored Content**<br>`posts`, `comments`, `notes`, `stories`, `videos` (PostgreSQL) | Expiring stories: 24 hours.<br>Expiring notes: 24 hours.<br>Feed posts/videos: author-managed. | Ephemeral content: 24 hours.<br>Standard content: lifetime of account or explicit deletion. | Legitimate interests & contract. | Immediate physical deletion on author delete. Account deletion erases all authored content. | Content subject to active moderation investigation or report is preserved under immutable moderation hold (`report_moderation_events`). | Retention period for content removed for policy violation; copyright counter-notice holding period (10–14 business days). |
| **Direct & Group Messages**<br>`messages`, `conversations`, `conversation_members` (PostgreSQL) | Vanishing messages: configurable (1h–7d).<br>Authored messages erased on account deletion. | Vanishing messages purged on expiry.<br>Account deletion erases departing user's messages while strictly preserving other members' history. | Contractual necessity & legitimate interests. | Vanish expiry timestamp or account deletion. | Subpoena / court order flag on conversation prevents physical pruning of message bodies during active preservation order. | Automatic vacuum schedule for expired vanished messages; statutory retention obligations for electronic communications. |
| **Financial Ledger & Orders**<br>`payment_orders`, `subscriptions`, `marketplace_orders`, `ledger_transactions` (PostgreSQL) | `ON DELETE SET NULL` on foreign keys.<br>Personal shipping data minimized upon account deletion.<br>Ledger transaction rows immutable. | Statutory tax & accounting duration: 7 to 10 years depending on jurisdiction. | Legal obligation (Art. 6(1)(c) GDPR). | End of statutory accounting period. | Financial records cannot be deleted by user request. Foreign keys detached; counterparty and amounts preserved. | Final determination of governing jurisdiction's tax code (e.g. German HGB/AO 10 years vs India Income Tax 7 years). |
| **Moderation & Grievances**<br>`reports`, `report_moderation_events`, `grievance_tickets` (PostgreSQL) | Grievance tickets retained with hashed lookup tokens.<br>Statutory SLA deadline nulled pending territory approval. | Proposed: 3 years from ticket resolution for audit and appeal defense. | Legitimate interests & compliance with law. | Resolution + retention cutoff. | Open grievances lock target post/account from non-cooperative deletion. | DSA Article 20 complaint record retention period (6 months minimum); statutory grievance response SLA. |
| **Pre-registration & Waitlist**<br>`preregistrations`, `waitlist` (PostgreSQL) | Unbound visitor email and preferred username.<br>Explicit `launchUpdatesConsent: true`. | Launch date (1 Dec 2026) + 90 days for account claim. | Consent (Art. 6(1)(a) GDPR). | Verified user erasure request (`POST /api/privacy/request`) or post-launch claim expiration. | Administrative suppression flag; unsubscribes record `unsubscribed_at`. | Expiration window for unclaimed pre-registrations after public launch. |
| **Consent & Suppression Records**<br>`consent_records`, `email_suppressions` (PostgreSQL) | SHA-256 email hash + purpose.<br>Immutable suppression list. | Indefinite for suppressions (to guarantee unsubscribed addresses never receive mail). | Legal compliance & legitimate interests. | Never deleted upon database restore; replayed into restored replicas. | Suppression list cannot be placed on hold; opt-out must always prevail. | Retention period for historical withdrawal audit records vs active suppression table. |
| **Durable Deletion Journal**<br>`deletion_journal`, `recovery_replay_log` (PostgreSQL / Off-host) | Pseudonymous (UUID + stable SHA-256 digest). Minimal. | Permanent historical recovery audit log. | Legal compliance (accountability principle Art. 5(2) GDPR). | Never deleted during standard operations. | Immutable audit log used to enforce erasures against restored backups. | Cryptographic key rotation schedule for off-host manifest signatures. |
| **Ephemeral Session & Rate State**<br>Redis | Rate limit buckets: 1m–1h.<br>OTP challenges: 5–15m.<br>User sessions: 7 days. | Ephemeral TTL expiry. | Legitimate interests & security. | Automatic Redis TTL expiration; explicit logout flushes `session:${userId}:*`. | Security incident hold flushes compromised tokens and freezes affected IP blocks. | Centralized Redis backup retention policy (recommend zero persistent RDB/AOF for security tokens). |
| **Operational & Access Logs**<br>Pino JSON, system logs | URLs stripped of query parameters and tokens.<br>Passwords and credentials never logged. | Proposed: 30 to 90 days maximum for operational debugging and security telemetry. | Legitimate interests (Art. 6(1)(f) GDPR / security). | Automated log aggregation lifecycle expiry. | Security incident investigation hold freezes log deletion for affected time slice. | Selection and contract approval for production log aggregation vendor (e.g. Datadog, AWS CloudWatch, Grafana Cloud). |
| **Hosted Media Assets**<br>Cloudinary | Asynchronous deletion queued upon account or post deletion.<br>`media_cleanup_holds` for unverified URLs. | Synced to database content lifecycle. | Contractual necessity. | Account or asset deletion triggers `media_cleanup` background worker. | Legal hold locks asset deletion in Cloudinary via tag assignment. | Cloudinary contractual subprocessor agreement and real erasure confirmation SLA. |
| **Historical Database Backups**<br>Encrypted pg_dump (Age + rclone) | Local encrypted dumps: 14 days.<br>Off-host remote replication. | Proposed: 35 days rolling daily backup retention. | Legitimate interests (disaster recovery / business continuity). | Automated rolling lifecycle pruning. | Litigation hold: specific snapshot copy isolated and marked immutable. | Approval of remote cloud storage bucket lifecycle rules and cryptographic backup key custody. |

---

## 2. Financial Minimization and Counterparty Protection Rules

When an account is deleted under approved privacy workflows, financial records must not cascade to deletion. The following minimization rules are enforced:

1. **Buyer Order Minimization (`marketplace_orders`)**:
   - `shipping_name` is scrubbed to `'Deleted account'`.
   - `shipping_address` is cleared to empty string `''`.
   - `shipping_phone` is set to `NULL`.
   - Transaction ID, currency, minor-unit amount, and order status are retained for counterparty accounting.
2. **Payment Order Minimization (`payment_orders`)**:
   - `message` (user-entered note) is cleared to empty string `''`.
   - `payer_id` or `creator_id` foreign key is nulled (`ON DELETE SET NULL`), preserving the counterparty's ledger balance and provider order reference.
3. **Product Snapshot Preservation**:
   - For orders where the seller is deleted, `product_snapshot` retains an immutable JSON snapshot `{ id, title }`, ensuring the buyer retains a historical record of the purchase without referencing the deleted user row.
4. **Subscription Revocation**:
   - Active entitlements linked to deleted accounts are marked `revoked`.
   - Subscriptions are marked `cancelled`.

---

## 3. Approval Sign-off Gate

Prior to changing runtime configurations or deploying scheduled purge jobs to production, obtain formal approval:

- **Legal Counsel / DPO Approval**: ___________________________ &nbsp;&nbsp;&nbsp;&nbsp; Date: _______________
- **Lead Security Architect Approval**: ___________________________ &nbsp;&nbsp;&nbsp;&nbsp; Date: _______________
- **Data Protection Officer (DPO)**: ___________________________ &nbsp;&nbsp;&nbsp;&nbsp; Date: _______________
