# Message and shared-history hardening evidence

Verified locally on 8 October 2026 (Asia/Calcutta). This records the **working copy**, based on commit `ba31c9fd443659bcacc9d2c8760086adf63ee082` on `codex/media-lifecycle-20261006`. It is not evidence that this commit alone contains the changes, nor evidence of a deployed service. Unrelated frontend edits were preserved.

The previous production browser failure result remains historical evidence. These PostgreSQL/service/HTTP/Socket.IO checks do not replace the full release browser suite.

## Findings and resulting behavior

| Original behavior and impact | Implementation | Regression evidence |
| --- | --- | --- |
| Preview, export, raw lookup, and mutations could return retained expired bodies; deletion/read-triggered vanish serialized retained bodies. | `repositories/message-visibility.ts` defines the strict PostgreSQL clock boundary. History, inbox, lookup, exports, preview/read/edit/reaction/pin and retry paths enforce it. Locked preview and mutation operations recheck time after waiting. `services/message-view.ts` allowlists tombstones to `id`, `conversationId`, `deletedAt`, `seenAt`, `expiresAt`, `tombstone`. | Retained rows are intentionally left in PostgreSQL with workers stopped. Actual authenticated HTTP requests, account exports for both participants, service reads, every mutation and retries expose no bodies. Delete/vanish HTTP responses and Socket.IO updates have exactly the tombstone keys. |
| Preview authorization could change between the initial read and record/return. | Preview takes the same message lock as read/delete/mutation, holds current conversation/member/account authority, and checks sender exclusion, read receipts and persisted premium authority. `media-response.ts` repeats the availability, unread and membership check at the publication boundary, including inbox conversation summaries. | A real PostgreSQL writer holds the message lock while deletion, direct read, per-recipient receipt or expiry commits. Preview returns no content. Removed group membership and revoked preview entitlement cannot reopen content. A legitimate preview creates an event and no read receipt. |
| An approved asset reference could outlive an expired parent. Existing generic grants remained useful while cleanup was stopped. | Message grants bind a parent message and viewer. Issuance, renewal, cached delivery, shared in-flight delivery and post-provider delivery validate current parent availability, active viewer and membership. Old unscoped message grants are rejected. Message hydration always uses API grants, including when a provider signing adapter is supplied. | A valid fixture grant first returns approved bytes. Expiry, deletion during a blocked provider fetch, and member removal then revoke it. The actual media HTTP route rejects old grants. The retained-expiry test confirms the reference remains present while cleanup is stopped. |
| Group creator/legacy-recipient `ON DELETE CASCADE` removed surviving users' history; reply FKs could block approved author erasure. | Nullable direct-only participant columns and nullable legacy recipient use `ON DELETE SET NULL`; migrated and new groups do not use them. Reply/forwarded self-FKs use `SET NULL`. Normalized group memberships are authoritative. `AccountService` explicitly erases direct threads, scrubs compatibility participant/reaction identifiers, and promotes a surviving admin in its deletion transaction. Immutable financial references and durable account/media cleanup remain transactional. | Delete the creator and separately a legacy recipient from three-member groups, preserving other members' contributions and access. Deleted accounts lose access; replies survive with an unavailable target cleared. Financial IDs remain immutable and anonymized, and media/account cleanup stays durable. Injected restrictive-FK failure rolls back history, ownership, media revocation and enqueue together. |
| JSON reaction read/replace lost concurrent changes. Retry conflicts could publish duplicates or return deleted content. | Reactions serialize under the message row lock and deduplicate users. Only the idempotent insert winner gets publication authority; HTTP/socket retries confirm a current row without another receive event. Unavailable retained retries return HTTP `410` without replaying content or attaching media. | Twelve distinct users each make three simultaneous reactions; all permitted users survive exactly once. Twelve concurrent same-key service sends persist one row and yield one publication authority. Actual socket/HTTP retries do not duplicate receive events. Existing image/audio conflict tests preserve precisely the winning attachment and reject unavailable replay. |

PostgreSQL is the expiry authority, using `clock_timestamp()` rather than transaction-start `now()`. Historical schema versions contain both UTC `timestamp` and `timestamptz` fields; epoch comparison avoids changing visibility with a connection's `TimeZone`. A future message remains available and a message expired at the database update boundary is unavailable under `Asia/Kolkata` as well as the default connection timezone.

## Verification performed

Runtime: Node.js `v24.19.0`, pinned pnpm `9.15.4`, PostgreSQL `16.4`, real Redis `7.2.8`. All connection variables were explicitly assigned. The message target was the synthetic database `yor_hardening_messages_20261007` at loopback port `55447`; Redis used loopback port `6398`, logical database `2`. The new integration file requires `NODE_ENV=test`, explicit URLs, loopback identity and an exact database-name match before inserting fixtures. It deletes only its own fixtures and temporary upgrade schema.

| Command/check | Observed result |
| --- | --- |
| `corepack pnpm@9.15.4 --filter @workspace/db migrate:production` against the isolated target | Exit 0; repeated upgrade succeeds. Final run also records `20261007-message-integrity-1` transactionally in `release_schema_versions`. |
| `corepack pnpm@9.15.4 --filter @workspace/db build` | Exit 0. |
| `corepack pnpm@9.15.4 --filter @workspace/api-server typecheck` | Exit 0 on the final working copy. |
| Focused serial API command below | Exit 0; **60 passed, 0 failed, 0 skipped**, including nested avatar cases. |
| Final structural-ledger follow-up: serial `message-integrity.integration.test.ts` after the final migration change | Exit 0; **9 passed, 0 failed, 0 skipped**. |
| Final serial `bootstrap-schema.integration.test.ts` against generated private databases in the verified loopback PostgreSQL cluster | Exit 0; **5 passed, 0 failed, 0 skipped**. Fresh reviewed SQL plus all additive migrations, repeated migration with stable ledger dates, representative cascading-group upgrade, refusal of a nonempty incomplete target, function/type/custom-schema/public-extension refusal with preservation, and real PostgreSQL transactional failure/rollback are covered. |
| `git diff --check` for the changed message/account/media/schema/migration paths | Exit 0. Git reports expected Windows LF/CRLF conversion notices. |

```powershell
corepack pnpm@9.15.4 --filter @workspace/api-server exec tsx --test --test-concurrency=1 `
  src/__tests__/message-integrity.integration.test.ts `
  src/__tests__/message-service.test.ts `
  src/__tests__/message-preview.test.ts `
  src/__tests__/disappearing-message.test.ts `
  src/__tests__/media-http.integration.test.ts `
  src/__tests__/media-publication.integration.test.ts `
  src/__tests__/media-legacy-migration.integration.test.ts `
  src/__tests__/account-integrity.test.ts `
  src/__tests__/socket-security.test.ts
```

Retained local output: `C:/Users/yoray/AppData/Local/Temp/yor-hardening-message-20261008/focused-message-media.log`, `final-migration-boundary.log`, `bootstrap-schema.log` and final `bootstrap-empty-guards.log`. These contain synthetic fixture evidence. Credentials and media grants were not printed.

Earlier verification attempts are not concealed: the first focused run had 26 passes and two failures (a fixture reused a correctly revoked media asset; an existing stale-lease test expected success instead of the newly required `lease_lost` rejection). A later expanded run had 59 passes and one failure because its old media test expected a deleted idempotent retry to succeed. Fixtures now assert the hardened behavior, and the final 60-case run passed. Socket shutdown's asynchronous presence publication was also corrected and the final run has no unhandled-rejection result. Intermediate API typechecks caught concurrent, unfinished additions in other workstreams; final typecheck passed.

The provider byte fixtures are synthetic and the development text-moderation provider is deterministic. These tests establish publication/authorization/data-integrity behavior; they do **not** establish live Cloudinary, Gemini or email acceptance.

## Migration, rollout and rollback

`lib/db/scripts/message-integrity-migration.mjs` runs one transaction, records `20261007-message-integrity-1` only after all changes succeed, and is called by the existing reviewed production migration path. It does not use schema push/force or erase retained bodies. The old schema-migration deletion of expired messages was removed; durable lifecycle cleanup owns erasure.

For representative existing data, the test constructs the old cascading group columns, arbitrary legacy recipients and restrictive reply references in a separate synthetic schema. It upgrades twice, verifies normalized memberships, deletes a creator, confirms surviving history and then repeats after removing one and all memberships. Clearing legacy group columns serves as the upgrade marker: a subsequent run cannot repopulate an empty authoritative membership from stale JSON.

The separate bootstrap integration file verifies exact cluster/database/port identity before creating databases whose names match the fixed `yor_hardening_bootstrap_[a-f0-9]{32}` pattern. It executes the actual production migration CLI using an explicit per-database URL, and cleans up only those generated synthetic targets. A deliberately appended division-by-zero statement fails the real base-SQL transaction after its DDL; PostgreSQL rolls all created tables back, and a clean retry succeeds. A populated sentinel table is left unchanged when both the CLI and direct helper refuse a nonempty incomplete schema. No push/force path is used.

The final bootstrap guard shares reviewed catalog inspection SQL with restore. A public function, enum, public `pgcrypto` extension, or empty nonpublic schema is enough to reject the target; a blanket exemption for public extension-owned objects is not used. Each real PostgreSQL case confirms the original object survives both CLI and direct-helper refusal, and a clean retry succeeds after the test removes only its own object. The first expanded run caught an inspection promise returning before its connection closed; both migration inspectors now await completion before cleanup, and the final five-case run passed. See `bootstrap-backup-review.md` for the independent backup/CI wiring review and acceptance boundary.

Rollout order:

1. Verify the approved target identity, capture a verified backup, inspect duplicate direct-conversation pairs, and drain account deletion/group writes during the migration window.
2. Run the reviewed production migration with explicit connection variables. The direct-pair unique index fails closed on pre-existing duplicates; reconcile these with an owner-approved plan rather than deleting history to make an index succeed. Lock timeout fails rather than silently forcing a change.
3. Deploy API, sockets and workers with the new membership/visibility behavior. Old unscoped message grants fail safely; clients obtain current grants by reloading authorized history.
4. Verify ledger version, nullable/non-cascading legacy references, reply `SET NULL`, canonical direct uniqueness, current grants and account cleanup on the deployed target using approved accounts. Resume writes after these checks.

An application rollback requires an application version that preserves current-message visibility, credential revocation and scoped media authorization. Keep this forward-compatible schema in place. Do not restore the old cascading FKs or `NOT NULL` legacy group columns: new and upgraded groups contain nulls by design, and reintroducing cascades restores the data-loss defect. Do not restore an older database as an automatic application rollback. Database recovery is a separately approved operation into an empty, isolated target with migration-state and relationship checks.

## Remaining gate

No owner-approved shared-history retention/anonymization policy was supplied. The implementation deliberately preserves the existing **deleted-author erasure** behavior: the deleted account's messages are erased, survivors' messages and memberships remain, unavailable reply/forwarded targets become null, and direct threads are erased. It does not invent approval to retain/anonymize a deleted author's content or identity. Approving a different retention policy requires a separate migration and deletion/media design before that policy can be accepted for release.

This workstream has no deployed/provider acceptance. Real media acceptance, production ingress/delivery checks, full candidate release suites and the chosen adult/minor/territory release scope remain part of the overall release decision. Previously copied historical public provider URLs cannot be made retroactively private by a product-response filter; provider migration/erasure and external acceptance remain necessary for such legacy objects.
