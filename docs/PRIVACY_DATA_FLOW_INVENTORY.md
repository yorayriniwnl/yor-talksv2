# Privacy and data-flow inventory - 22 October 2026

This inventory describes observed implementation, including its limits. It does
not approve retention durations, assign legal bases or certify compliance. See
the [retention worksheet](RETENTION_HOLDS_APPROVAL_WORKSHEET.md) for outstanding
operator decisions and the [backend ledger](BACKEND_COMPLETION_2026-10-21.md) for
executed evidence. Historical audit claims do not override current code.

## Stores and boundaries

| Store | Records and authority | Cleanup and recovery | Remaining boundary |
| --- | --- | --- | --- |
| PostgreSQL accounts | Credentials, profiles, terms, eligibility and processing restrictions are bound to the authenticated subject. | Transactional account erasure, authored-content deletion and durable session cleanup. Only verified account email ownership permits deletion/suppression of matching unbound reservations. | Approved inactive-account retention and actual deployment operation. |
| Standard messaging | Readable bodies, membership, reactions, read/preview receipts and media references. Current membership, contact policy, moderation, deletion and expiry apply to reads/delivery. | Hidden content is denied immediately. A bounded lifecycle job physically clears deleted/expired bodies and receipts, preserving minimal IDs for retry deduplication and surviving replies. Authored rows are erased on account deletion. | Recipient copies, legacy external media and historical backups cannot be recalled by a database update. |
| Private messaging | Public identities, participants and encrypted envelopes in `private_chat_identities`, `private_chat_threads`, `private_chat_envelopes`. Recovery files and plaintext remain on participant devices. | Participant exports include their ciphertext; account erasure cascades the server records. | Timing, participant IDs, public keys and ciphertext sizes remain visible to the server. See [private-chat limits](PRIVATE_CHAT_SECURITY.md). |
| Stories, notes and media references | Expiry and audience selection control access; highlights retain stories beyond ordinary expiry. | Managed media references are released for expired unhighlighted stories and hidden messages. | General record-retention and archive policy remain to be specified. |
| Commerce | Orders, subscriptions, entitlements and the ledger contain counterparty records. | Erasure minimizes personal fields, nulls eligible identity references and preserves financial records. | Applicable retention policy and provider reconciliation are external acceptance items. |
| Moderation and grievances | Reporter/account references, decisions, notices, public appeal outcomes and private staff notes. | Current staff authority, independent reviews and scoped appeal access; exports exclude internal review notes. | Retention, staffing and approved deadlines; no general preservation-hold mechanism. |
| Preregistration and waitlist | Unbound address and requested username. Knowledge of an address grants no rights. | Verified purpose-bound proof supports erasure/correction/restriction. Unbound erasures have journal events with a null account ID. | Post-launch retention policy is pending; no automatic launch-date purge. |
| Privacy requests | Email digest, requested purpose, hashed challenge, expiry and request audit. PostgreSQL is the authority. | Atomic single-use execution; failed delivery invalidates the proof; the expiry sweep clears pending token hashes after expiry. | Request-history retention and deployment verification of email delivery. |
| Consent/suppression | Versioned purpose decisions, subject/email digests and current suppression state. | Withdrawal is authoritative even when an older preregistration has a consent timestamp. Recovery restores suppression and restrictions. | Policy for historical audit data; digests remain potentially linkable. |
| Deletion/recovery journal | UUIDs, normalized-email digests, event times and exact replay checkpoints. | The same parameterized erasure implementation runs for live deletion and recovery, including legacy references and session cleanup. | Independent off-host replication, encryption, key custody and approved retention. No automatic signature authority is implied by a digest. |
| Redis | Sessions, OTPs, rate buckets, socket routing and queue transport. | TTLs, logout/account invalidation and retryable cleanup. Privacy proofs do not rely on Redis. | Managed failover, persistence and isolation settings need a deployment drill. |
| Durable jobs and logs | Database job leases/dedup keys, heartbeat metadata, sanitized request paths and operational metrics. | Finite completed jobs scrub payloads; permanent sweeps recover terminal states. | Metadata/log retention, actual alert delivery and access control. Provider errors need scrutiny before logging. |
| Cloudinary and email providers | Managed media and transactional/promotional delivery data. | Managed assets use retryable last-reference cleanup. Unresolved legacy references are retained as cleanup exceptions. | Actual delivery/erasure, provider backup retention and processor terms remain unverified locally. |
| Backups | Historical full database snapshots encrypted by the backup tooling. | Exact-manifest recovery gating and v2 replay restore erasures, suppressions and restrictions before serving application traffic. | Real off-host restore, retention/key custody and provider cleanup before cutover. |

## Rights workflow

1. `POST /api/privacy/challenge` accepts an address and optional purpose. Its
   successful response is generic regardless of account/record existence. The
   database limits issuance per address; transactional email sends a random
   32-byte token whose stored authority is only its hash, with a 15-minute expiry.
2. `POST /api/privacy/verify` accepts the token in its body. A valid response
   reveals only validity and the authorized purpose, and does not consume it.
   It does not return an address or identity digest.
3. `POST /api/privacy/request` consumes the proof and executes the matching
   purpose in one transaction. A different purpose, reused token or expired
   token cannot authorize a mutation. Execution failure rolls back consumption.
4. Unbound erasure removes matching reservations, revokes consent, suppresses
   promotional mail and records the erasure atomically. Current records are
   resolved from PostgreSQL, including when Redis has restarted.
5. An email challenge cannot erase an active registered account: that operation
   returns 409 and requires authenticated account deletion with its existing
   credential checks. Signed-in restriction/consent endpoints use server-owned
   identity rather than a supplied address.
6. Routes set `Cache-Control: no-store` and `Referrer-Policy: no-referrer`. The
   verification page is a frontend handoff outside this task; see the
   [API integration notes](BACKEND_FRONTEND_HANDOFF.md).

## Recovery and communication

The recovery v2 manifest contains account/unbound erasure events, suppression
state and processing-restricted account IDs. It is obtained independently of the
snapshot being restored. Its exact external hash and cutoff must match the
atomic replay completion record; a different or later marker does not open the
gate. API startup, worker startup, HTTP application routes and Socket.IO startup
enforce the gate; health probes remain available for diagnosis. Replay preserves
later independent reservations and the history/financial records of survivors.
See the [executed PostgreSQL recovery fixture](../ops/backup/privacy-recovery-database.test.mjs)
and [operator procedure](../ops/backup/README.md).

Promotional dispatch remains disabled by default. Enqueue, retry and send paths
check the release flag, live consent and suppression. Transactional security and
privacy emails have separate purposes. A passing local fixture does not prove
provider delivery, inbox placement, provider erasure or remote backup durability.
