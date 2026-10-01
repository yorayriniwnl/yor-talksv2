# Yor Talks V2 Migration, Query, and Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make empty and existing schema upgrades explicit and restartable, bound high-cardinality query work, and prevent reservation cleanup/cache behavior from scaling or serving deleted data incorrectly.

**Architecture:** Keep empty bootstrap distinct from existing-database upgrades. Existing upgrades run ordered, checksummed migrations and preflight the complete Drizzle table inventory; no nonempty database receives `push --force`. Use keyset pagination for list APIs, partial indexes and bounded `SKIP LOCKED` batches for cleanup, and invalidate trending cache on post deletion.

**Tech Stack:** Drizzle ORM, PostgreSQL, Node migration scripts, TypeScript, Express, React client, Redis.

**Spec:** [2026-09-23-database-hardening-design.md](../specs/2026-09-23-database-hardening-design.md)

## Global Constraints

- Preserve existing user data and business history.
- Do not run migrations against production or use production data.
- Schema changes must be additive and safe to apply to both empty and existing installations; any backfill or uniqueness constraint must first detect and resolve duplicates without silently deleting records.
- Migrations must be restartable after interruption and must not use destructive `push --force` against a nonempty database.
- Do not silently delete or merge duplicate user/business records; fail with actionable diagnostics.
- No Git metadata is present in the supplied folder; commits and pushes are unavailable there.

## Review Focus

- An empty public schema and a representative existing schema must both reach the same Drizzle inventory without data loss.
- Existing schema drift must fail before API startup instead of being reported as a successful migration.
- Cursor pagination must have a stable tie-breaker and return no duplicates or skipped rows across pages.
- Reservation cleanup must update product/order state atomically while bounding locks and query work.
- A deleted post must not be served from a cached trending page.

---

### Task 1: Version existing migrations and validate the full schema inventory

**Files:**
- Modify: `lib/db/scripts/migrate-production.mjs`
- Modify: `lib/db/scripts/migrate-beta.mjs`
- Modify: `lib/db/scripts/migration-safety.mjs`
- Add: `lib/db/scripts/migration-runner.mjs`
- Add: `lib/db/scripts/schema-inventory.mjs`
- Add: `lib/db/scripts/migrations/0001_database_hardening.mjs`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `api-server/src/types/index.ts`
- Modify: `lib/db/package.json`
- Test: `tests/migration-safety.test.mjs`

**Interfaces:**
- `schema-inventory.mjs` exports the complete current Drizzle table/column/index/unique/FK inventory and a validator that compares required objects with the public catalog while allowing documented legacy extras until their backfill migration removes them.
- The migration runner records migration version/checksum/applied time in a migration ledger and applies one migration at a time under an advisory lock.
- Empty bootstrap may use the initial schema push; a nonempty database must never use `--force` and must abort if a diff requires destructive approval. After compatibility backfills, run a non-forced schema sync to create missing Drizzle objects; fail closed if it proposes a drop or truncation.

- [ ] **Step 1: Add migration safety tests for complete inventories**

Test bootstrap on an empty catalog, acceptance of a complete inventory, and an actionable error naming every missing Drizzle table in a partial catalog. Test that an already-applied version/checksum is skipped and a checksum mismatch fails.

- [ ] **Step 2: Define and validate the full Drizzle table inventory**

Reflect the 55 current `pgTable` declarations from `lib/db/src/schema/index.ts`, including columns, primary keys, foreign keys, unique indexes, and indexes. Add a source check that fails if the checked-in inventory diverges from Drizzle metadata.

- [ ] **Step 3: Add a checksummed migration ledger and runner**

Create the ledger with `CREATE TABLE IF NOT EXISTS`; acquire one advisory lock, apply each numbered migration, record its SHA-256 and timestamp in the same transaction when its SQL permits transactional execution, and refuse a changed checksum for an applied version. For `CREATE INDEX CONCURRENTLY`, record an explicit in-progress phase and mark complete only after `pg_index.indisvalid` is true; a rerun must validate or repair an invalid index without dropping application data.

- [ ] **Step 4: Route empty and existing upgrade flows through the same target**

Keep fresh bootstrap limited to an actually empty schema. Existing flow first completes documented beta backfills, then applies versioned additive migrations and runs the non-forced Drizzle schema sync to create any missing target objects. Compare the final public catalog with the Drizzle inventory and abort if required objects remain missing or a destructive diff is proposed. Preserve concurrent-index operations as explicit nontransactional steps with retry checks.

- [ ] **Step 5: Add poll ownership and hardening indexes to migration 0001**

Preflight cross-poll votes for both post and story polls, duplicate open subscriptions, and product/order owner mismatches. Create `(poll_id, id)` option keys for both option tables and composite vote FKs for both vote tables; add the subscription open-pair unique index and cleanup indexes only after preflight succeeds. Add a unique `(product_id, seller_id)` target and matching order FK; make marketplace party/product and subscription/payment order account references nullable with `SET NULL` semantics where parents are deleted. Add product-title and tier snapshots and backfill them from existing parent rows before enabling account-deletion anonymization. Fail without deleting rows if preflight detects invalid data.

- [ ] **Step 6: Remove the unreferenced destructive manual migration**

Confirm `lib/db/src/migrate-manual.ts` has no imports, package scripts, or documented runbook references; then delete the orphan script and add a migration-safety check that production scripts do not invoke it. Do not execute its column drops.

- [ ] **Step 7: Run migration-safety tests and script checks**

Run: `node --test tests/migration-safety.test.mjs`
Expected: empty/existing decisions, drift failures, migration replay, and checksum mismatch are explicit. Do not execute a database migration as part of this step.

### Task 2: Paginate relationship and profile-interaction reads

**Files:**
- Modify: `api-server/src/repositories/user-repository.ts`
- Modify: `api-server/src/services/user-service.ts`
- Modify: `api-server/src/services/profile-interaction-service.ts`
- Modify: `api-server/src/controllers/user-controller.ts`
- Modify: `api-server/src/routes/users.ts`
- Modify: `api-server/src/validators/user.ts`
- Modify: `lib/api-spec/openapi.yaml`
- Modify: `api-server/src/docs/openapi.ts`
- Modify: `api-server/src/types/index.ts`
- Add: `api-server/src/utils/keyset-cursor.ts`
- Modify: `social/src/lib/api-client.ts`
- Modify: `social/src/pages/explore.tsx`
- Modify: `social/src/pages/home.tsx`
- Modify: `social/src/pages/profile.tsx`
- Modify: `social/src/components/ui/MiniProfileCard.tsx`
- Modify: `social/src/components/video/ReelsSwiper.tsx`
- Modify: `social/src/lib/store.ts`
- Test: `api-server/src/__tests__/profile-relationships.test.ts`
- Test: `api-server/src/__tests__/keyset-cursor.test.ts`

**Interfaces:**
- List endpoints accept `limit` (default 50, maximum 100) and opaque `cursor`; return `{ items, nextCursor, hasMore, limit }` in response metadata.
- Cursor order uses `(created_at, id)` and a matching composite index.
- Session/profile hydration returns relationship counts and only a bounded first page; displayed-user relationship status is loaded for the visible page rather than embedding every ID in the session.

- [ ] **Step 1: Add keyset pagination tests for ties and page boundaries**

Create rows sharing the same timestamp. Fetch successive pages and assert every row appears once, order is stable by ID tie-breaker, invalid cursors are rejected, and limits above 100 are clamped or rejected consistently.

- [ ] **Step 2: Add repository cursors and indexes**

Implement keyset methods for followers, following, pending follow requests, favorites, close friends, profile comments, and showcases. Add indexes matching each owner/filter and `(created_at, id)` tie-breaker; keep `LIMIT limit + 1` to compute `hasMore`.

- [ ] **Step 3: Change API routes and response metadata**

Validate cursor/limit query params, preserve authorization/contact-shield filtering, and return stable pagination metadata. Remove full follower/following/pending/favorite relationship hydration from login/profile payloads; supply counts plus a bounded visible page.

- [ ] **Step 4: Update client list loaders and relationship state**

Update `api-client.ts` types and profile modal loading to consume pages and append on “load more”. Fetch follow/pending/favorite status for displayed profiles in a batch so users beyond the initial relationship page are represented correctly.

- [ ] **Step 5: Run pagination tests and typechecks**

Run: `node --import tsx --test api-server/src/__tests__/profile-relationships.test.ts api-server/src/__tests__/keyset-cursor.test.ts`
Expected: all pages are stable/bounded and existing visibility rules still apply. Run API and social typechecks.

### Task 3: Bound expired marketplace reservation cleanup

**Files:**
- Modify: `api-server/src/services/marketplace-service.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/scripts/migrations/0001_database_hardening.mjs`
- Test: `api-server/src/__tests__/product-service.test.ts`

**Interfaces:**
- `releaseExpiredReservations(batchSize: number): Promise<number>` processes at most one bounded batch and may be called repeatedly.
- Add a partial index on `reservation_expires_at` for `status IN ('created','provider_pending')`.

- [ ] **Step 1: Add a cleanup batch test**

Seed more expired reservations than one batch and assert one invocation changes no more than `batchSize`; a second invocation processes the next batch. Include a concurrent settlement case and assert paid/sold state is never reset.

- [ ] **Step 2: Add the partial expiry index with preflight**

Declare the partial index in Drizzle and migration SQL. Use `CREATE INDEX CONCURRENTLY` as a standalone migration phase where required; detect an invalid interrupted index and retry only after safe validation.

- [ ] **Step 3: Select and settle a bounded batch atomically**

Inside a transaction, select expired open orders ordered by expiry and ID with `FOR UPDATE SKIP LOCKED LIMIT $1`; mark each still-open order cancelled and release only products still reserved. Return the number actually cancelled.

- [ ] **Step 4: Run marketplace tests and typecheck**

Run: `node --import tsx --test api-server/src/__tests__/product-service.test.ts`
Expected: cleanup is bounded and cannot overwrite paid/sold state. Run API typecheck.

### Task 4: Invalidate trending cache after post deletion

**Files:**
- Modify: `api-server/src/services/post-service.ts`
- Modify: `api-server/src/repositories/post-repository.ts`
- Test: `api-server/src/__tests__/social-service.test.ts`

**Interfaces:**
- Expose `invalidateTrendingFeedCache(): Promise<void>` and call it only after a successful delete.
- Cache invalidation failure must be logged; cached entries must also be checked against current post existence before returning.

- [ ] **Step 1: Add a cache-delete regression test**

Seed a trending cache page containing a post, delete that post, then request the feed. Assert the deleted ID is absent even if Redis deletion fails.

- [ ] **Step 2: Invalidate and validate cached post IDs**

Delete matching trending keys using the repository's bounded SCAN/DEL helper, and hydrate cached candidate IDs against the post table before use. Keep cache optional when Redis is unavailable.

- [ ] **Step 3: Run feed tests and typecheck**

Run: `node --import tsx --test api-server/src/__tests__/social-service.test.ts`
Expected: deleted posts cannot be returned from a stale cache. Run API typecheck.
