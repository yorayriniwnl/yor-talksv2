# Yor Talks V2 database hardening design

Date: 2026-09-23

## Goal and constraints

Address the database, Redis, and data-lifecycle defects identified in the read-only audit. Preserve existing user data and business history. Do not run migrations against production or use production data. Schema changes must be additive and safe to apply to both empty and existing installations; any backfill or uniqueness constraint must first detect and resolve duplicates without silently deleting records.

The current checkout has no Git metadata. The spec and later implementation will be written in the provided folder; commits and pushes cannot be produced from this copy unless a Git checkout is supplied.

## Design overview

Deliver the fixes as three independently reviewable workstreams, with schema and application changes kept together where correctness depends on both:

1. **Correctness and atomicity** — move concurrency-sensitive invariants into atomic database or Redis operations; make multi-row lifecycle updates transactional.
2. **Data lifecycle and export** — bound and make exports consistent, physically purge content after its configured lifetime, and minimize retained notification and account state.
3. **Migration, query, and cache hardening** — reconcile existing schemas through versioned migrations, bound high-cardinality queries and cleanup work, add supporting indexes, and invalidate stale feed cache entries.

## 1. Correctness and atomicity

- Replace OTP and approval-attempt Redis read/modify/write sequences with an atomic operation that checks the limit, increments failures, applies expiry, and consumes a successful challenge without a race. Keep challenge state and its per-user index bounded by TTL.
- Make subscription creation idempotent under concurrent requests. Define the database invariant for one open subscription per creator/subscriber pair, handle expired rows explicitly, and ensure provider-order creation cannot leave duplicate open memberships. Use transaction/advisory locking or a provider idempotency key as needed by the existing provider flow.
- Update subscription and entitlement status in one database transaction for cancellation and expiration.
- Execute account-owned relational updates and user deletion in one database transaction. Revoke Redis sessions/challenges after commit with observable errors and bounded residual state; database authorization must reject sessions for deleted users.
- Replace whole-document reaction read/replace operations with atomic JSONB mutations or normalized reaction rows with a uniqueness constraint. Add a database-level composite relationship for poll vote option ownership so a vote cannot pair an option with a different poll.
- Replace user block/mute whole-array read/modify/write operations with atomic edge operations. Review the affected ownership and deletion edges so FKs, composite constraints, and `CASCADE`/`SET NULL` behavior match the intended lifecycle and do not erase financial or audit records unexpectedly.

## 2. Data lifecycle and export

- Keep existing message/story/note expiry semantics but physically purge expired content in bounded batches. Ensure soft-deleted messages are purged according to a documented period and that media cleanup is coordinated separately from row deletion.
- Configure BullMQ completed/failed job retention by age/count. Queue only the minimum payload needed for processing; prefer durable notification IDs over full notification text and metadata.
- Define an explicit account-export inventory covering all user-associated data in the schema. Generate a bounded, paginated or streamed export from a consistent snapshot, and minimize fields to those required by the export contract. Exclude credentials, MFA secrets, provider tokens, and other fields that have no user-export purpose.
- Add configurable retention settings for grievance reporter PII and marketplace shipping PII. The worker must only purge/redact after the configured policy window; unknown or unset policy values must be surfaced as configuration errors rather than silently selecting a legal retention period. Preserve transaction/accounting records required by the product while removing address/contact fields when their purpose ends.

## 3. Migration, query, and cache hardening

- Introduce versioned, idempotent migrations for existing databases and use the same schema target from empty bootstrap. Existing-database migration must account for every Drizzle table/constraint/index rather than only checking a core subset.
- Before adding uniqueness or composite constraints, run duplicate/orphan preflight queries and fail with actionable diagnostics. Do not silently delete or merge user/business records.
- Add an index supporting marketplace expired-reservation selection and process cleanup in limited batches. Add cursor pagination/limits to follower, follow-request, profile-interaction, and other high-cardinality reads; do not hydrate complete relationship lists into routine session responses.
- Invalidate or revalidate trending-feed cache entries after post deletion so a deleted post is not returned from cache.
- Keep any legacy manual migration that drops columns out of the normal migration path; replace it with an explicit versioned migration only after confirming backfill and compatibility requirements.

## Failure handling and compatibility

- Database mutations that express one business transition must commit or roll back together.
- Redis and queue failures must be observable. TTLs or bounded cleanup must prevent failed cleanup from creating unbounded state.
- Migrations must be restartable after interruption and must not use destructive `push --force` against a nonempty database. Constraint creation should be staged when existing data may violate the invariant.
- API pagination should preserve existing response shape where practical; large collections should return continuation information and stable ordering.
- Export schema/version should be explicit so future table additions do not silently disappear from exports.

## Verification plan

After implementation, perform static/type checks and run focused tests only if authorized. Use disposable local PostgreSQL and Redis instances for migration-from-empty, migration-from-representative-existing-schema, constraint/backfill diagnostics, transaction rollback, Redis atomic-attempt behavior, pagination bounds, and retention cleanup. Do not connect to production or run destructive migrations. Compare the final Drizzle model and migration catalog on disposable databases, and inspect query plans for the marketplace cleanup and new pagination paths.

## Out of scope

- Choosing legal retention periods for grievance or order PII without an approved product policy.
- Deleting production records or applying migrations to production.
- Broad schema redesign unrelated to the audit findings.
