# Yor Talks V2 Data Lifecycle and Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bound Redis notification retention, physically expire content according to policy, minimize retained personal data, and produce complete bounded account exports.

**Architecture:** Reuse the existing notification worker process for durable ID-only delivery jobs and add a lifecycle worker that deletes or redacts eligible records in locked batches. Stream account export JSON page-by-page under a repeatable-read transaction so the HTTP response does not require one unbounded result array.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL, BullMQ, Redis, Express streams, Node test runner.

**Spec:** [2026-09-23-database-hardening-design.md](../specs/2026-09-23-database-hardening-design.md)

## Global Constraints

- Preserve existing user data and business history.
- Do not run migrations against production or use production data.
- Schema changes must be additive and safe to apply to both empty and existing installations; any backfill or uniqueness constraint must first detect and resolve duplicates without silently deleting records.
- Unknown or unset retention policy values must be surfaced as configuration errors rather than silently selecting a legal retention period.
- Migrations must be restartable after interruption and must not use destructive `push --force` against a nonempty database.
- No Git metadata is present in the supplied folder; commits and pushes are unavailable there.

## Review Focus

- An expired message, note, or non-highlight story must stop being returned and be physically removed in bounded batches.
- A cleanup run must not delete content that is not expired or data protected by an active retention window.
- Redis completed-job storage must stay bounded while notification delivery remains recoverable from PostgreSQL.
- An export larger than one page must remain valid JSON, stable in ordering, and exclude authentication secrets.
- Unset or invalid grievance/order retention settings must fail closed and surface an operator-visible error.

---

### Task 1: Bound BullMQ retention and queue notification IDs only

**Files:**
- Modify: `api-server/src/services/queue-service.ts`
- Modify: `api-server/src/workers/notification-worker.ts`
- Modify: `api-server/src/repositories/notification-repository.ts`
- Test: `api-server/src/__tests__/queue-service.test.ts`

**Interfaces:**
- Notification job data is `{ notificationId: string }`.
- Worker loads the canonical `NotificationRecord` from `NotificationRepository.findById` before delivery.
- `QueueService.enqueue` uses `notificationId` as the BullMQ `jobId` for this job type, preserving idempotent recovery.
- Set bounded `removeOnComplete` age/count and bounded `removeOnFail` age/count on every queue add path, including recovery.

- [ ] **Step 1: Add a queue-options regression test**

Enqueue one ID-backed and one payload-backed job using a fake Queue; assert both receive finite completion/failure retention and neither stores the notification body.

- [ ] **Step 2: Pass only notification IDs to BullMQ**

Change notification creation/recovery enqueues to `{ notificationId }`. Keep DB notifications as the source of truth and make missing/deleted notification jobs complete without sending.

- [ ] **Step 3: Configure bounded job cleanup in every enqueue path**

Use one exported options constant in `queue-service.ts`; use the same values in startup recovery in `notification-worker.ts`. Do not set `removeOnComplete: false`.

- [ ] **Step 4: Run queue and notification-worker tests**

Run: `node --import tsx --test api-server/src/__tests__/queue-service.test.ts`
Expected: completed jobs age out and delivery loads the notification by ID. Run API typecheck.

### Task 2: Add bounded content and PII lifecycle cleanup

**Files:**
- Add: `api-server/src/workers/data-lifecycle-worker.ts`
- Modify: `api-server/src/index.ts`
- Modify: `api-server/src/config/env.ts`
- Modify: `api-server/src/services/storage-service.ts`
- Modify: `api-server/src/types/index.ts`
- Modify: `api-server/src/lib/worker-health.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/scripts/migrations/0002_data_retention.mjs`
- Modify: `.env.example`
- Modify: `ops/.env.production.example`
- Modify: `ops/ci-production.env`
- Modify: `docker-compose.production.yml`
- Modify: `scripts/check-production-config.mjs`
- Test: `api-server/src/__tests__/data-lifecycle-worker.test.ts`

**Interfaces:**
- Add positive-integer settings `GRIEVANCE_PII_RETENTION_DAYS` and `MARKETPLACE_SHIPPING_PII_RETENTION_DAYS`; production lifecycle processing must report an error and skip the affected PII cleanup if its setting is absent or invalid.
- `runDataLifecycleBatch(batchSize: number, now: Date): Promise<{ messages: number; notes: number; stories: number; grievances: number; orders: number; media: number }>` processes bounded rows and returns counts.
- Run one lifecycle batch at startup and then at a fixed interval; use row locks with `SKIP LOCKED` so multiple API instances can safely share work.
- Store Cloudinary deletion retries in a minimal cleanup outbox, deleting the outbox row after successful provider deletion; never persist message/story content in the queue payload.

- [ ] **Step 1: Add tests for eligible and ineligible retention rows**

Use a disposable database fixture with expired and unexpired notes/messages/stories, open and closed grievance records, and cancelled/fulfilled orders on both sides of the configured cutoff. Assert only eligible rows are purged/redacted and every call handles at most `batchSize` rows.

- [ ] **Step 2: Add nullable redaction fields and retention configuration**

Make reporter name/email and shipping name/address/phone nullable after their policy window, while keeping request validation required on intake. Validate env values as positive integer days; update production compose, examples, CI fixture, and config coverage checks. Add partial expiry/deletion indexes for messages and non-highlight stories, and add the media cleanup outbox table. The sample values in local/CI fixtures are test-only and are not legal retention recommendations.

- [ ] **Step 3: Implement transactionally bounded cleanup SQL**

Select candidates in deterministic order with `FOR UPDATE SKIP LOCKED LIMIT $1`; delete expired notes, expired non-highlight stories, and messages past `expires_at` or already marked `deleted_at` (explicit user deletion has no grace period). Null `reply_to_id` and `forwarded_from_id` references before deleting parent messages if required by the FKs. Redact only terminal grievance/order records older than their configured cutoff; preserve order IDs, amounts, status, and ledger rows. Queue media cleanup by provider public ID and resource type; retry failures from the outbox.

- [ ] **Step 4: Start and stop the lifecycle worker with the API**

Follow the existing worker start/close pattern in `api-server/src/index.ts`. Track lifecycle-worker health in `worker-health.ts` and fail production readiness when required retention values are absent or the cleanup loop cannot run. Log per-batch counts and failures.

- [ ] **Step 5: Run lifecycle tests and configuration checks**

Run: `node --import tsx --test api-server/src/__tests__/data-lifecycle-worker.test.ts api-server/src/__tests__/env-config.test.ts`
Expected: cutoff and batch semantics match configuration, unset values are reported, and rows outside the policy window are unchanged. Run `node scripts/check-production-config.mjs` and API typecheck.

### Task 3: Stream a complete, versioned account export

**Files:**
- Modify: `api-server/src/services/account-service.ts`
- Modify: `api-server/src/controllers/user-controller.ts`
- Modify: `api-server/src/repositories/user-repository.ts`
- Modify: `api-server/src/__tests__/account-service.test.ts`
- Modify: `social/src/lib/api-client.ts` only if response metadata/type changes are needed.

**Interfaces:**
- Produce `streamAccountExport(userId: string): AsyncGenerator<string>` that emits one valid versioned JSON document in stable table/key order.
- Run all export queries in a repeatable-read transaction and fetch each collection in bounded keyset pages; apply explicit field projections and never export password hashes, TOTP material, session values, or provider secrets.
- Return `404` before starting the response when the account does not exist; set JSON attachment headers and stream through Express backpressure.

- [ ] **Step 1: Add export completeness and large-page tests**

Seed related rows across posts/comments, profile data, follows/requests/favorites, conversations/messages/reads, notifications, stories, videos/articles, community/event/broadcast memberships, creator workspace/projects/business records, saves, subscriptions/orders/entitlements, reports/shields, marketplace participation, and ledger references. Parse the streamed document and assert all intended categories are present, secrets and unrelated users' private fields are absent, ordering/cursors are stable, and a dataset over one page is emitted without a single full-table query.

- [ ] **Step 2: Define the export inventory and projections**

Create a typed table-to-query inventory in `account-service.ts` for every user-owned or user-participating row: profile/account; posts/comments/profile interactions; follows/requests/favorites/close friends; conversations/members/messages/reads; notifications; communities/events/broadcast channels and memberships; stories/views/reactions/polls/notes; products/saves/marketplace orders; articles/videos/comments/bookmarks/live streams; payment and subscription orders, entitlements, and ledger references; creator analytics/workspaces/projects/business profiles; reports/contact shields/invites; and topic/waitlist associations. Add a schema-coverage check so a new FK to `users.id` requires an explicit export decision. For many-to-many data, include only the requesting user's relationship rows and avoid serializing unrelated users' private fields. Explicitly document intentionally excluded credentials and system-only data in export version 2.

- [ ] **Step 3: Stream keyset pages inside a repeatable-read transaction**

Use deterministic `(created_at, id)` or primary-key keysets for each table. Yield JSON delimiters and page chunks as data arrives; honor consumer backpressure and release the transaction when the generator completes or the client disconnects.

- [ ] **Step 4: Change the controller from `res.json` to a stream**

Set `Content-Type: application/json; charset=utf-8` and the attachment filename before piping. Handle stream errors before headers with the normal JSON error; after headers, close the stream and log the failure.

- [ ] **Step 5: Run export tests and typecheck**

Run: `node --import tsx --test api-server/src/__tests__/account-service.test.ts`
Expected: streamed output parses as JSON, includes the declared categories, omits auth secrets, and stays page-bounded. Run API and social typechecks.
