# Retention decisions and implemented controls - 22 October 2026

This worksheet separates observed code from decisions still required of the
operator. Earlier versions described legal-hold flags, automatic post-launch
purges and statutory retention periods as implemented or approved. Those claims
were not supported by the repository and are superseded here. This document
does not determine a legal basis, a jurisdiction's requirements or compliance.

## Current controls

| Records | Implemented behavior | Decision or external evidence still required |
| --- | --- | --- |
| Accounts and authored content | Authenticated deletion uses a database transaction and the shared account-erasure implementation. Authored messages are erased; other participants' group history survives. | Dormancy policy, approved retention schedule, production execution and provider erasure evidence. |
| Deleted and vanished standard messages | Reads, exports and media authorization deny hidden content immediately. The lifecycle worker clears bodies, attachments, reactions and read/preview receipts in batches of at most 500. It keeps tombstone IDs to prevent send retries from recreating content. | Confirm operational sweep latency under load. Copies already delivered to recipients and historical backups are outside this database cleanup. |
| Stories and notes | Expiry controls visibility. Highlighted stories retain their media; expired unhighlighted stories release managed media references. | Physical record retention schedule and archive behavior. No general story-content purge is certified by this audit. |
| Private chat | The server stores ciphertext and participant metadata. Account deletion cascades private-chat records. | Metadata retention policy and independent protocol/security review. No claim of removing copies on another participant's device. |
| Financial records | Account deletion detaches identities, minimizes buyer shipping fields and payment notes, preserves counterparty transactions, snapshots product identity/title, cancels subscriptions and revokes linked entitlements. | Applicable accounting rules, retention duration, provider reconciliation and processor contracts. No duration is approved here. |
| Moderation, reports and grievances | Decisions and appeals have separate public and internal rationale, access checks and an audit trail. Notice acknowledgement does not waive appeal rights. | Record retention, any approved response deadlines and a staffed operational process. |
| Preregistration and waitlist | Purpose-bound email proof permits unbound erasure, correction and communication restriction. Verified account deletion can remove the corresponding address's reservations. | Any post-launch expiration and advance-notification policy. No scheduled launch-date purge currently exists. |
| Privacy challenges | Database authority expires after 15 minutes. Successful execution consumes the proof atomically; a bounded worker clears expired token digests and marks requests expired. | Retention of completed/rejected request evidence. The worker does not delete the request history. |
| Consent and suppression | Versioned consent and current suppressions gate promotional delivery; withdrawal wins equal-time consent ties. Recovery v2 restores suppression and processing restriction state. | Audit-history duration, access control and independent off-host replication. Digests are pseudonymous, not anonymous. |
| Erasure journal and recovery log | Durable records support shared account cleanup, unbound erasure and reconciliation of the exact externally supplied manifest hash/checkpoint. | Off-host durability, encryption/key custody, journal retention and recovery exercises. A SHA-256 digest is an integrity check, not a digital signature. |
| Redis and background jobs | Sessions/challenges use expiration and explicit invalidation. Leased jobs retry and expose dead work; completed finite jobs scrub payloads. | Managed Redis failover settings, historical job/heartbeat retention and backlog response procedures. |
| Logs and metrics | Request paths are sanitized and authenticated metrics are available. Deployment logging retention is outside application storage. | Aggregator retention, access controls and validation against the actual logging configuration. Do not assume arbitrary provider errors cannot contain private information. |
| Managed media | Last-reference removal schedules retryable provider cleanup. Legacy unresolved references can remain in `media_cleanup_holds`. | Provider erasure confirmation, retention of provider backups and a process for unresolved ownership. These rows are cleanup exceptions, not legal holds. |
| Database backups | Encrypted backup/restore tooling and privacy replay exist. Local retention defaults to 14 days; remote storage lifecycle is configured externally. | Approved retention, remote replication, restore keys, alert receipt and restoration from the real off-host copy. |

## Hold behavior

There is no general legal-hold engine in the current application. In particular,
no implemented administrative flag universally blocks account deletion/export,
no conversation court-order flag prevents pruning, and no Cloudinary legal-hold
tag is managed by this code. Moderation decisions do not automatically establish
a preservation hold. Do not describe any of these as launch capabilities.

If an approved preservation requirement applies, define its scope, authority,
access, duration, review/release procedure and interaction with deletion before
implementing or relying on it. Do not disable ordinary verified rights workflows
based solely on this worksheet or an undocumented assumption.

## Operator record

Record the responsible owner, reviewed policy version, decision date, affected
stores, approved schedule, notification requirements and supporting evidence for
each outstanding item. Deployment approval belongs with the actual operator;
this worksheet does not supply signatures or infer approval from a test result.

Related implementation and evidence:
[retention and worker recovery audit, 24 October](RETENTION_AND_WORKER_RECOVERY_AUDIT_2026-10-24.md)
(verifies the controls above and lists suggested defaults for the open decisions),
[data-flow inventory](PRIVACY_DATA_FLOW_INVENTORY.md),
[backend work ledger](BACKEND_COMPLETION_2026-10-21.md),
[backup and privacy replay procedure](../ops/backup/README.md).
