# Yor Talks launch audit — 26 September 2026

**Decision: NO-GO for an open public launch or paid Premium launch on the audited state.** The product has substantial working implementation, but compilation and feature breadth do not resolve the privacy, media, billing, deployment and release failures below.

The owner clarified the product model as **an Instagram-style consumer platform: free use plus paid perks**. Organization tenancy is not a requirement of this audit. Creator memberships and tips are separate from paying Yor for platform perks.

## Scope and evidence limits

- Audited checkout: `codex/public-beta-readiness`, starting commit `15b7b8b53c1207ca6e8a97541c57163c84d92a55`, including three pre-existing modified files concerning profile pin reordering. Those changes were preserved, not authored or committed by this audit.
- Fresh remote fetch: `origin/main` was `3aad91ce46059bb47749a0d5598140cd8cb91099`. The checkout had 29 unique commits and main had 12 unique commits. This is not an audit of a merged release candidate.
- Also inspected the newer `origin/codex/media-moderation-lifecycle` branch at `21ebd703ceada736e4c399f1fb0d6826920143c6` for existing remediation. It has candidate webhook, timeout, worker and payment changes; they are not integrated into this checkout and were not verified as a complete release. Its media guard disables production uploads rather than providing the full media lifecycle.
- Repository metadata identifies `https://yor-talks.vercel.app` as its homepage. Read-only requests were made to that URL. The deployed commit and intended launch environment have not been established.
- Docker Engine was unavailable (`dockerDesktopLinuxEngine` pipe missing); no local PostgreSQL listener was present. The full database integration, migration, restore and production-container suite could not be verified. No production database, account or provider state was changed.
- No real email, Google authentication, payment, Cloudinary upload, TURN/LiveKit call or push delivery was exercised. Browser tests intercept API calls and disable realtime; they do not prove those integrations.
- This is a technical launch assessment, not a legal opinion or a declaration of regulatory compliance.

## Verification performed

| Check | Current result | Meaning |
| --- | --- | --- |
| Runtime | Node 24.14.0, pnpm 9.15.4 | Compatible with declared project requirements |
| API contract | PASS, 210 operations / 174 paths | Generated route inventory is synchronized; authorization is not thereby proven |
| Production configuration wiring | PASS, 44 schema keys | Wiring check only; no live credentials or provider acceptance implied |
| Root unit/browser-state tests | 35 passed / 35 | State reconciliation, session, migration-safety helpers and related checks |
| API typecheck | PASS | Current API source compiles |
| Frontend typecheck | PASS | Current frontend source compiles |
| Production package build | PASS | DB, API and frontend built; frontend emitted chunk-size warnings |
| Selected API tests | 40 passed, 2 failed, 42 total | Registration test requires absent PostgreSQL; public-user allowlist expectation is stale after adding `bioStyleId` |
| Chromium browser suite | 22 passed, 2 failed, 24 total | Settings fixtures omit the Premium catalog response and cause the route error boundary |
| Initial browser attempt | Preview startup exceeded 120 seconds | Reran after the separate successful build; the completed rerun is reported above |
| Audit service probes | Six defect observations reproduced | In-memory repository fixtures; no database/provider calls |
| Production dependency audit | 6 advisories: 3 high, 2 moderate, 1 low | Multer and qs; exposure details below |
| All dependency audit | 37 advisories: 11 critical, 18 high, 6 moderate, 2 low | Includes development/code-generation dependencies; not 37 demonstrated application exploits |
| GitHub CI for audited HEAD | Did not start | GitHub annotation says account locked due to a billing issue |
| Public homepage | HTTP 200 | Static HTML responds |
| Public `/api/livez`, `/api/readyz`, `/api/healthz` | HTTP 500 on all three | Vercel `FUNCTION_INVOCATION_FAILED` |

Reproduce the six non-destructive observations from `api-server`:

```powershell
$env:NODE_ENV = 'test'
node --import tsx ../docs/audits/2026-09-26/probes.mts
```

The probes intentionally assert the defective behavior observed during the audit. They are forensic evidence, not desired-behavior regression tests, and are not added to CI. After remediation, replace each with a regression that asserts the secure outcome.

## Prioritized findings

P1 means a launch blocker in the applicable product surface. P2 means a significant correctness, resilience or verification issue. The ordering also reflects practical remediation urgency. Code line references below refer to the audited checkout.

### F01 — P1: The repository-linked public API is unavailable

Read-only HTTPS requests to the homepage succeeded, but `/api/livez`, `/api/readyz` and `/api/healthz` each returned HTTP 500 with Vercel's `FUNCTION_INVOCATION_FAILED`. Even the lightweight liveness endpoint could not execute. The root cause cannot be determined from that response: configuration validation, packaging/import failure and other startup problems need deployment logs.

**Impact:** the static frontend being online does not establish working registration, feed, messaging or billing. If this is the launch deployment, it is an immediate availability blocker.

**Required closure:** identify the intended production project and deployed SHA, inspect function logs, repair the concrete failure, and verify readiness plus real authenticated browser journeys. If the repository homepage is obsolete, update it and audit the actual target. Do not equate a Vercel successful build with API readiness.

### F02 — P1: Search bypasses per-post audience restrictions

`api-server/src/services/search-service.ts:22` filters results with `filterVisibleByAuthor`. That helper checks the author's account privacy and blocks, not the post's `audience`. Both branches of `PostRepository.search` (`api-server/src/repositories/post-repository.ts:403`) filter distribution and rating but do not enforce followers/Close Friends membership. `PostService.canViewPost` has the missing per-post checks, but search does not use them.

**Reproduced:** a public author has one `followers` post and one `close_friends` post; a viewer who is neither a follower nor a Close Friend receives both through the real SearchService with controlled repositories. Post bodies and media URLs are in the returned records. This is service-level reproduction backed by the SQL path, not a live-account exploit.

There is a second stale-authorization problem: `api-server/src/controllers/search-controller.ts:34` returns cached results directly for 30 seconds. Blocking someone, making a profile private, or deleting content does not reauthorize the cached result. Trending candidates similarly retain deleted/edited post records for 60 seconds (`post-service.ts:490-522`).

**Required closure:** one shared per-post visibility policy for search, feeds, detail and interactions; apply it on cache hits as well, and invalidate or re-fetch deleted/changed content. Add database-backed outsider, follower, Close Friend, block, privacy-change and deletion tests across both indexed and fallback search paths.

### F03 — P1: Media lacks a moderation, access-control and deletion lifecycle

`api-server/src/services/media-service.ts:33` uploads bytes and returns URLs. `storage-service.ts:94` uses ordinary Cloudinary uploads and retains only `secure_url`; there is no stored asset owner, moderation state or provider identifier in this path. `post-service.ts:125` moderates text only. `validators/post.ts:8` accepts arbitrary media URLs. No runtime Cloudinary destroy/delete operation was found in the audited API.

**Impact:** images/video/audio can be uploaded independently of text moderation. Post audience checks protect the API response, but do not enforce access to an already-known public media URL. Deleting a post/account does not remove the Cloudinary asset, and expiry of a Story is not proof of asset expiry. Actual Cloudinary account presets were not inspected, so external protections must not be assumed absent or present.

**Required closure:** owner-bound asset records; constrained uploads; verification of provider upload results; quarantine and moderation before publication; delivery controls for restricted media; retryable provider deletion and orphan cleanup. Test deletion, block and expiry against the actual delivery URL, not only against the post API. Include avatars, Stories, videos and message attachments in the scope.

### F04 — P1: Direct upload limits are client metadata, not an enforced quota

`api-server/src/services/storage-service.ts:46-58` signs only `{ folder, timestamp }`, then returns `resourceType` and a 10 MB `maxFileSize`. The browser checks size, but no signed preset, single-use reservation, user-bound asset identifier or completion verification enforces that application policy on direct provider requests. Rate limiting signature requests does not limit reuse of an already-issued grant.

**Reproduced:** at the same timestamp, image and video grants for the same folder have identical signatures. [Cloudinary documents](https://cloudinary.com/documentation/upload_images#authenticated_requests) that file/resource type are outside the signed parameters and signatures remain valid for one hour. Therefore the application-provided size and family restrictions cannot be treated as authoritative; provider account limits may still apply.

**Required closure:** enforce appropriate provider preset constraints, bind a reserved asset ID and owner to the publication lifecycle, verify actual bytes/type/duration from the provider, and apply per-account quotas plus cleanup. Prove that direct requests bypassing the UI cannot publish unauthorized assets or exceed the intended quota.

### F05 — P1: The paid-perks product has no billing-backed entitlement

`api-server/src/features/premium-features.ts:39` defaults the complete feature set to true. `feature-entitlement-service.ts:50-53` checks overrides and rollout flags only. It does not read a user's paid plan or subscription entitlement. Premium flag variables are also absent from the production Compose environment mapping and validated environment schema.

**Reproduced:** an account with no paid subscription and no override gets all 15 Premium features with default configuration. Disabling the rollout flag would lock everybody out; it would not automatically grant access to paying users.

`SubscriptionService` sells memberships to individual creators, with a 30-day term. Those memberships are not a Yor platform Premium plan. `social/src/pages/advanced.tsx` is a feature catalog, not a complete upgrade, billing-status, renewal and cancellation journey.

**Required closure:** define a platform plan and explicit perk matrix; resolve access from durable billing state on the server; retain rollout flags as availability controls. Complete purchase, restore/reconciliation, expiry, cancellation, failed-payment and refund transitions. Keep ordinary privacy, blocking, reporting and account deletion available free. Acceptance must include free, paid, expired, cancelled, refunded and manually overridden users.

### F06 — P1: Payment settlement depends on a surviving browser callback

The current branch exposes order creation and authenticated `/verify` calls (`routes/subscriptions.ts`, `routes/economy-routes.ts`), but no mounted Razorpay webhook or scheduled payment reconciliation. A webhook secret is required by configuration without a receiving handler. `subscription-service.ts:155` grants membership after client-triggered verification; expiry is a locally calculated 30-day date, not a recurring subscription engine.

**Failure scenario:** payment is captured, then the tab closes or the network fails before verification. The local order can remain `created` and access remains ungranted. Refund/dispute events have no automatic entitlement or ledger reversal. Cancellation immediately revokes access and is not one database transaction with the entitlement update. Concurrent membership creation is checked before insertion without a subscriber/creator uniqueness constraint, allowing duplicate pending checkouts.

Existing capture validation and signature verification are useful safeguards; the issue is the incomplete lifecycle. [Razorpay's integration guidance](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) describes server confirmation through webhooks and API verification.

**Required closure:** signed raw-body webhook handling, durable event deduplication, replay/order-independent settlement, periodic reconciliation, transactional entitlement changes and refund/dispute reversal. Test tab closure, duplicate and reordered events, provider timeouts, crash after capture, cancellation races and duplicate order creation. Inspect the newer hardening branch for reusable work without replacing this branch wholesale.

### F07 — P1: Account deletion removes the other party's ledger attribution

`api-server/src/services/account-service.ts:63-65` sets **both** `creditAccountId` and `debitAccountId` to null whenever **either** belongs to the deleting user. `economy-service.ts:6-23` computes wallet balance by those IDs.

**Concrete consequence:** A pays B. A deletes their account. B's credit reference also becomes null and that transaction no longer contributes to B's wallet. The reverse case also loses the surviving payer's attribution. These writes precede user deletion and are not wrapped in a database transaction, so a later failure can leave accounting changed while the account remains.

**Required closure:** anonymize only the deleted party, preserve the surviving counterparty and financial event identity, transact the database lifecycle, and perform external cleanup through retryable jobs. Verify both payer deletion and creator deletion with a real database and unchanged surviving-party balances. Financial retention/anonymization policy needs an explicit owner decision.

### F08 — P1: Dependency security gates fail

The freshly queried production graph has six advisories: **3 high, 2 moderate, 1 low**. The lockfile contains Multer **2.2.0** and qs **6.15.3**. Maintainer advisories identify multipart denial-of-service issues fixed in Multer **2.3.0**, including [crafted field names](https://github.com/expressjs/multer/security/advisories/GHSA-wc9g-mqfw-jrwm) and [oversized array indices](https://github.com/expressjs/multer/security/advisories/GHSA-535w-7cp7-47q4). Authenticated users can reach multipart upload middleware; memory storage avoids the specific disk-descriptor scenario but does not remove field-parsing exposure. The async-fileFilter advisory is not demonstrated by the synchronous filter here. The qs comma-parser scenario also requires options not shown in the audited configuration.

The complete graph has **37 advisories: 11 critical, 18 high, 6 moderate, 2 low**. The 11 critical entries concern **Orval 8.20.0**, a development/code-generation dependency under `lib/api-spec`, with malicious-spec generation/import scenarios. They are not evidence of unauthenticated remote execution in the deployed social app. See `dependency-audit-summary.json` for registry IDs, affected versions, paths and patched ranges.

**Required closure:** update the lockfile deliberately, prioritize reachable API parsers, update or remove unsafe generation tooling, rebuild generated outputs where applicable, and rerun all checks. Evaluate each advisory's reachability; do not relabel development-tool findings as live application exploits or ignore them entirely.

### F09 — P1: Report handling does not complete the takedown workflow

`api-server/src/routes/reports.ts:95` lets staff change report status. It does not remove content or suspend its author. The post delete service (`post-service.ts:139`) permits the author only, and no staff content-takedown/account-suspension route was found in the mounted API. Role-protected routes cover queues, ticket status and metrics.

**Reproduced:** the shared visibility service returns true for a suspended public author. The parallel post visibility implementation also lacks an author account-status check. If suspension is intended to withdraw harmful public content, changing account state alone does not accomplish that.

**Required closure:** auditable staff actions for content removal, restricted distribution, account action and appeal/reversal; enforce their effects in every read path and media delivery. Decide explicitly whether any historical content remains available after suspension. Prove that resolving an abuse report results in the intended user-visible action, with an actor and reason recorded.

### F10 — P2: Session rotation and revocation have gaps

`auth-service.ts:772` signs refresh JWTs with user/device/type and second-resolution timestamps but no random token identifier. **Reproduced:** a refresh in the issuance second returns the identical token; the supposedly rotated old token is accepted again. Redis compare-and-swap is present, but it can swap a value for itself.

`auth-service.ts:436` also removes sessions without invalidating pending/approved login challenges. The invalidation helper is called on password reset, not by the logout-all endpoint. An already-approved unconsumed challenge can remain eligible to create a fresh session after logout-all. Password reset consumption is a separate read/update/delete sequence, not atomic single-use consumption, so concurrent redemption needs coverage.

**Required closure:** unique refresh token identifiers, atomic rotation and documented replay response; invalidate outstanding login challenges on global revocation; make reset-token consumption atomic. Test rapid replay, two-tab refresh, approved challenge followed by logout-all, concurrent reset submission and dependency failures. These findings do not establish a credential-free login bypass.

### F11 — P2: Account export is incomplete

`account-service.ts:27-50` exports account, posts, comments, follow relationships, submitted reports and redacted Contact Shield entries. It omits major user-data surfaces including messages, Stories, Notes, memberships, payment/order history and creator workspace records.

**Required closure:** define the export/retention matrix for all persisted entities, export in a bounded asynchronous job, and validate representative accounts containing each supported data type. Align the product's deletion/export description with actual provider and backup behavior. This is a product-completeness finding, not a legal determination.

### F12 — P2: Visibility filtering amplifies database work

`content-safety-service.ts:42-46` does author and viewer lookups for every candidate, even when all candidates share an author. **Reproduced:** filtering 50 same-author candidates triggers 101 user lookups. `post-service.ts:578` implements a similar per-post pattern, and feed methods may scan ten candidate pages. The Premium snapshot also makes a query for each of 15 flags.

**Required closure:** batch unique author and relationship lookups, load the viewer once, consolidate entitlement queries, and move safe visibility predicates into paginated SQL where possible. Measure actual database query counts and p95/p99 latency on representative dense/private/blocked feeds. This audit did not establish a concurrent-user capacity or a load-tested latency target.

### F13 — P2: Global IP limiting penalizes legitimate fallback polling

`middlewares/rate-limit.ts:104` permits 300 API requests per IP per 15 minutes. `social/src/lib/store.ts:969-974` makes three requests every 15 seconds when realtime is disconnected: notifications, follow requests and conversations. That is about 180 requests per foreground client per 15 minutes before user actions. Two clients sharing an IP can exceed the entire budget while idle on fallback transport; mobile carriers/campus networks can share much larger populations.

**Required closure:** separate authenticated user budgets from anonymous/IP abuse ceilings, use backoff/batching for fallback polling, and retain strict credential/upload limits. Test shared-NAT users, multiple tabs and realtime outages without disabling abuse controls.

### F14 — P2: Readiness omits workers and external operations lack bounded timeouts

`routes/health.ts:14-36` checks `SELECT 1` and Redis compatibility; it does not verify the required schema version or worker heartbeat. `index.ts:16-20` catches worker startup failures and continues serving. A deployment can pass readiness while background work is unavailable. Razorpay and Resend fetches have no explicit application timeout (`razorpay-service.ts:75,93`; `email-service.ts:97`). Trending's independently constructed Redis client also lacks the bounded configuration used by the dedicated rate-limit repository.

**Required closure:** migration/schema readiness, worker heartbeat and queue-lag alarms, explicit provider timeouts with retry/idempotency rules, and bounded cache behavior. Verify an intentional worker failure, provider stall, incompatible schema and Redis outage. Confirm backup restore and incident recovery on the actual release environment; an old local rehearsal is not current production proof.

### F15 — P1: There is no single verified release candidate

The active branch and main are divergent. The newer hardening branch contains fixes missing here, while this branch contains Premium work absent there. A wholesale branch replacement would discard features. GitHub lists no open PRs, and the [CI run for the audited HEAD](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/35132745716) has no executed steps: its annotation states the account is locked due to billing.

**Required closure:** select the release base, integrate intentionally in an isolated checkout, resolve the actual conflicts, preserve unfinished pin work, and run one complete matrix on the resulting SHA. Restore functioning CI or an equivalent reproducible release gate, identify the deployed SHA, and demonstrate rollback. No assertion is made that main already contains the newer fixes.

### F16 — P2: Existing green claims do not cover the current feature contracts

The current browser suite has two failures. `e2e/core-social.spec.ts:59-85` returns successful empty arrays for unknown API endpoints, including `/users/me/premium-profile`. `social/src/pages/settings.tsx:261` trusts the catalog structure and later dereferences its options, causing the whole settings route to enter the error boundary. Thus the privacy-save and settings-accessibility assertions are not reached. The snapshots prove a crash under that fixture; they do not prove the real API returns that malformed payload.

The public-user unit test (`api-server/src/__tests__/user-view.test.ts:16`) expects the old field list and fails on intentional `bioStyleId`. The selected registration test could not succeed without PostgreSQL. Browser fixtures do not cover real email, payment, media or realtime acceptance.

**Required closure:** make unhandled fixture routes fail explicitly, add correct Premium response fixtures, contain malformed optional-panel data so core privacy settings remain accessible, and update the allowlist test without weakening secret-exclusion coverage. Then run the entire API suite against isolated Postgres/Redis plus real staging journeys. Keep deterministic and provider-backed results separate.

## Product scope and release sequence

| Stage | Required outcome | Exit evidence |
| --- | --- | --- |
| 1. Establish a release | Preserve dirty pin work; integrate chosen main/hardening/Premium changes; repair deployment startup | One immutable SHA, functioning CI, healthy intended staging environment |
| 2. Make free social use safe | Fix search/audience/cache enforcement, media publication/deletion, staff actions, session gaps and parser dependencies | Adversarial API tests and two-account privacy/media tests against staging |
| 3. Make money reliable | Create Yor Premium billing and server entitlements; complete settlement/reconciliation/refunds; fix ledger deletion | Provider test-mode lifecycle evidence, duplicate/reordered event tests, correct surviving-account balances |
| 4. Prove operations | Complete test matrix, worker/schema readiness, load/quotas, monitoring, restore and rollback | Measured limits and recovery results for the release SHA |
| 5. Controlled launch | Invite-only cohort using the verified core; enable paid plan after its own acceptance | Successful real registration, verify/reset, posting, private sharing, messaging, reporting, export/delete and billing journeys |

For the first release, the core should be identity/profile, posts/Stories, following, messaging, blocking/reporting and a small verified Premium perk set. Marketplace, creator payouts, live rooms and other optional surfaces should stay disabled until independently accepted. Product pricing, expected traffic and media usage were not provided, so no profitable unit economics, infrastructure bill or launch date is asserted.

The legal operator, published terms/refund commitments, support ownership, moderation staffing, incident contact and jurisdiction/age policy still need current owner verification. Repository templates and legal environment gates do not establish operational readiness.

## What is already useful

The audit found real implementation rather than only UI shells: database-backed domain services, capture/signature checks, server-side premium checks at feature call sites, refresh-cookie isolation, origin checks for refresh, socket membership/session validation, consent gates, production secret validation, frontend error boundaries, typed contracts and deterministic tests. The required work is to repair the cross-cutting boundaries and finish billing/operations around those foundations.

## Artifact and publication boundary

This audit adds this report, an advisory summary and reproducible in-memory probes only. It does not change application behavior, integrate branches, enable payments, alter production configuration or repair the live deployment. Existing source modifications remain separate. Test logs and browser traces remain in the local temporary/test-results directories; they are not committed as production proof.
