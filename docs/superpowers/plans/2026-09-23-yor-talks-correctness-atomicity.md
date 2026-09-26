# Yor Talks V2 Correctness and Atomicity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make authentication challenges, subscription lifecycle, account deletion, and JSON-backed relationships safe under concurrent requests and partial failure.

**Architecture:** Keep business invariants atomic at the resource that owns them: Redis Lua scripts for expiring challenge state, Postgres constraints and transactions for durable membership/entitlement state, and single-statement JSONB updates for reaction/block/mute lists. Add only additive constraints after migration preflight proves existing rows are compatible.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL, ioredis Lua scripts, Node test runner.

**Spec:** [2026-09-23-database-hardening-design.md](../specs/2026-09-23-database-hardening-design.md)

## Global Constraints

- Preserve existing user data and business history.
- Do not run migrations against production or use production data.
- Schema changes must be additive and safe to apply to both empty and existing installations; any backfill or uniqueness constraint must first detect and resolve duplicates without silently deleting records.
- Migrations must be restartable after interruption and must not use destructive `push --force` against a nonempty database.
- No Git metadata is present in the supplied folder; commits and pushes are unavailable there.

## Review Focus

- Twelve simultaneous invalid OTP submissions must not record fewer than twelve failures or allow more than the attempt budget.
- Simultaneous subscription-order requests for the same pair and tier must not produce multiple open memberships.
- Cancellation and expiration must not leave an active entitlement after the subscription is no longer active.
- Two simultaneous reaction/block/mute changes for distinct users/targets must both remain represented.
- A poll vote pairing a poll with another poll's option must be rejected by PostgreSQL.

---

### Task 1: Make OTP and approval challenge mutations atomic

**Files:**
- Modify: `api-server/src/repositories/redis-repository.ts`
- Modify: `api-server/src/services/auth-service.ts`
- Test: `api-server/src/__tests__/redis-budget.test.ts`
- Test: `api-server/src/__tests__/auth-service.test.ts`

**Interfaces:**
- Produce `verifyAndClaimEmailOtpStrict(key: string, suppliedHash: string, claimId: string, nowIso: string, maxAttempts: number): Promise<{ status: "claimed" | "invalid" | "locked" | "expired"; state?: string }>`; only one successful request can claim a code.
- Produce `approveLoginChallengeStrict(key: string, userId: string, matchingNumber: number, nowIso: string, maxAttempts: number): Promise<"approved" | "invalid" | "locked" | "expired">`.
- Produce `consumeApprovedLoginWithOtpStrict(challengeKey: string, otpKey: string, claimId: string, nowIso: string): Promise<string | null>` so approval and the matching OTP claim are consumed together.
- `AuthService` must use these operations instead of writing stale serialized challenge state.

- [ ] **Step 1: Add a concurrency regression case**

In `redis-budget.test.ts`, create an expiring OTP state at a unique key and issue 12 concurrent wrong-code verifications. Assert exactly five results are `invalid`, the remaining results are `locked`, stored state has five attempts, and only one concurrent correct verification can claim the code.

```ts
const outcomes = await Promise.all(Array.from({ length: 12 }, (_, index) =>
  repository.verifyAndClaimEmailOtpStrict(key, wrongHash, `claim-${index}`, nowIso, 5),
));
assert.equal(outcomes.filter((value) => value.status === "invalid").length, 5);
assert.equal(outcomes.filter((value) => value.status === "locked").length, 7);
```

- [ ] **Step 2: Run the focused test to confirm the current race is exposed**

Run: `node --import tsx --test api-server/src/__tests__/redis-budget.test.ts`
Expected: the new case fails against the current implementation because no atomic OTP failure operation exists.

- [ ] **Step 3: Implement Lua operations that preserve challenge TTLs**

Use one Redis script per state transition. Read and validate the JSON state in Lua, compare expiry/attempt count, then increment or set approval status before returning a result. Preserve the existing remaining TTL; delete malformed/expired state rather than recreating it.

```ts
const result = await this.client.eval(script, 1, key, nowMs, maxAttempts);
```

- [ ] **Step 4: Route auth service transitions through the atomic methods**

Replace the separate GET/parse/SET code for email OTP and approval-number verification. A correct email code is claimed once; when TOTP approval is needed, store the claim ID in the login challenge. For direct login, consume the claim before session creation; for approval login, consume the approved challenge and matching OTP claim in one Lua operation. Keep user/TOTP validation in `AuthService`; add a TTL to the per-user approval index.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `node --import tsx --test api-server/src/__tests__/redis-budget.test.ts api-server/src/__tests__/auth-service.test.ts`
Expected: the concurrent failures never exceed the cap; expired/consumed challenges remain unusable. Then run `node_modules/.bin/tsc -p api-server/tsconfig.json --noEmit`.

### Task 2: Serialize subscription creation and enforce one open membership

**Files:**
- Modify: `api-server/src/services/subscription-service.ts`
- Modify: `lib/db/src/schema/index.ts`
- Test: `api-server/src/__tests__/subscription-service.test.ts`

**Interfaces:**
- Define the open-membership invariant as at most one `pending` or `active` subscription for `(subscriber_id, creator_id)`.
- `createOrder` must return the existing payable pending order when present; it must not create a second provider order for that pair.
- Cancellation/expiry state changes must update `subscriptions` and its matching entitlement in one transaction.

- [ ] **Step 1: Add an integration test for parallel order creation**

Use a disposable PostgreSQL fixture and a provider stub that counts `createOrder` calls. Run two identical `createOrder` calls concurrently; assert one open subscription, one created subscription order, and one provider order. Include an expired active row and assert it is transitioned before a replacement is created.

- [ ] **Step 2: Add migration preflight and the partial unique index**

Before creating the index in migration `0001_database_hardening.mjs`, query duplicate open `(subscriber_id, creator_id)` pairs and abort with pair IDs if any exist. Add the same partial unique index to Drizzle and SQL:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_open_pair_idx
ON subscriptions (subscriber_id, creator_id)
WHERE status IN ('pending', 'active');
```

- [ ] **Step 3: Serialize check, reservation, and provider-order creation**

Use a transaction-scoped advisory lock derived from the canonical subscriber/creator pair and hold it through provider-order creation and DB inserts. Under the lock, mark expired active memberships and their entitlements expired, return an existing valid pending order when available, otherwise create one pending membership and one provider order. On provider failure, roll back the transaction; an order created before a later DB failure is not returned to the client and cannot be verified without its persisted order row.

- [ ] **Step 4: Make payment and cancellation transitions conditional and atomic**

Preserve the existing conditional paid-order update. In `cancel` and `listForSubscriber`, transactionally update subscription and entitlement together, and only return success when the state transition actually occurred.

- [ ] **Step 5: Run subscription tests and typecheck**

Run: `node --import tsx --test api-server/src/__tests__/subscription-service.test.ts`
Expected: parallel creates settle to one payable membership; cancellation and expiry leave matching subscription/entitlement statuses. Run the API typecheck.

### Task 3: Make account deletion transactional and cleanup observable

**Files:**
- Modify: `api-server/src/services/account-service.ts`
- Modify: `api-server/src/repositories/redis-repository.ts`
- Modify: `api-server/src/repositories/user-repository.ts`
- Modify: `api-server/src/types/index.ts`
- Modify: `lib/db/src/schema/index.ts`
- Test: `api-server/src/__tests__/account-service.test.ts`

**Interfaces:**
- `UserRepository.deleteById` must accept an existing Drizzle transaction handle or expose a transaction-safe delete method.
- Account-owned ledger nulling, invite detachment, waitlist cleanup by normalized account email, revocation of creator-issued subscription entitlements, payment/marketplace/subscription-order anonymization, JSON block/mute reference cleanup, and user deletion must use that same transaction.
- Redis session cleanup must use strict SCAN/DEL methods and log/return cleanup failure without undoing an already committed database deletion.

- [ ] **Step 1: Add a rollback regression case**

Arrange a database failure during one of the pre-delete updates and assert the user, ledger references, invite reference, payment/order rows, and JSON block/mute references are all unchanged. Also seed a creator membership entitlement and paid payment/marketplace/subscription-order history; assert deletion revokes entitlements for the deleted creator, nulls account references, preserves amounts/status/provider order IDs and product/tier snapshots, and clears shipping contact fields. Keep the existing successful deletion and password-confirmation cases.

- [ ] **Step 2: Add a transaction-aware user delete operation**

Accept a `PgTransaction` parameter in the repository delete method; do not start a nested transaction. Wrap ledger updates, invite updates, and `DELETE FROM users ... RETURNING` in `db.transaction`.

- [ ] **Step 3: Replace swallowed session cleanup with strict bounded cleanup**

Add a strict cursor-based scan/delete path that throws on Redis failure. After DB commit, delete only keys under `session:${userId}:*` and the login-approval index; challenge-key TTLs bound any residual state. Log cleanup failure with user ID and let missing-user checks continue to reject refresh/session use.

- [ ] **Step 4: Run account lifecycle tests and typecheck**

Run: `node --import tsx --test api-server/src/__tests__/account-service.test.ts`
Expected: a failed database step leaves all relational rows intact; successful deletion removes the user and detaches preserved ledger/invite references. Run the API typecheck.

### Task 4: Prevent lost updates in reactions and block/mute state

**Files:**
- Modify: `api-server/src/repositories/post-repository.ts`
- Modify: `api-server/src/repositories/message-repository.ts`
- Modify: `api-server/src/services/post-service.ts`
- Modify: `api-server/src/services/message-service.ts`
- Modify: `api-server/src/services/user-service.ts`
- Test: `api-server/src/__tests__/social-service.test.ts`
- Test: `api-server/src/__tests__/message-service.test.ts`

**Interfaces:**
- Add repository methods that atomically add a reaction by updating the current JSONB value in one SQL statement, with duplicate users remaining idempotent.
- Add block/mute update methods that validate the target user and apply JSONB add/remove operations in one SQL statement.

- [ ] **Step 1: Add concurrent JSONB update cases**

Run two simultaneous additions for distinct users/reactions against one post and message. Assert both entries remain and repeating the same user/reaction does not duplicate the user ID. Add the equivalent for two distinct block/mute targets.

- [ ] **Step 2: Implement atomic JSONB mutation statements**

Build each new JSON value from the locked row's current value in `UPDATE ... SET reactions = ...`; avoid reading arrays into JavaScript and writing the whole object back. For block/mute updates, verify the target user exists before updating the owner row.

- [ ] **Step 3: Update services to use repository mutations**

Remove service-side `getPost`/`getMessage` array mutation as the persistence path. Preserve current response shaping by loading the updated record after the atomic write.

- [ ] **Step 4: Run reaction and relationship tests and typecheck**

Run: `node --import tsx --test api-server/src/__tests__/social-service.test.ts api-server/src/__tests__/message-service.test.ts`
Expected: concurrent distinct updates remain present and same-user repeats remain idempotent. Run the API typecheck.
