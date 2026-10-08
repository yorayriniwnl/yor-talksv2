# Global Age and Privacy Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement workstream 1 of the global compliance design: private complaint receipts, correct message visibility, verified eligibility, restricted identity sessions and consistent content/contact/feature limits.

**Architecture:** A private eligibility repository supplies a pure policy evaluator and a server service that reloads current authority at access boundaries. HTTP, sockets, discovery, media delivery and transactions consume that decision; clients display its safe summary. Verification and territory approval are explicit dependencies, with no permissive production fallback.

**Tech Stack:** Existing TypeScript, Express 5, Socket.IO, PostgreSQL/Drizzle, Redis, React/Vite, Zod, node:test and Playwright; Node 24 and pnpm 9.15.4. No new verification vendor or product dependency is selected by this plan.

**Spec:** [Global age, consent and privacy design](../specs/2026-10-07-global-age-consent-design.md).

**Status:** User-approved on 7 October 2026; inline implementation is in progress. The user approved the saved work and delegated the execution choice. Verified completion is recorded per task in the execution ledger and scoped commits; approval does not supply operator, provider or country-release evidence.

**Source checked:** `34a8852beb54432b711a12e579edc99fc87cc956`, 7 October 2026. Preserve the 233 pre-existing frontend changes. Current CI passing does not prove the behaviours proposed below already exist.

## Global Constraints

- EU-based operator, global users; three experiences: under 13, ages 13–17, and adults 18+.
- Represent the effective experience as `unknown`, `under_13`, `teen_13_17`, or `adult_18_plus`.
- Use current database records as authority. JWT claims, cached preferences and frontend state do not grant eligibility.
- No default entry claims worldwide permission. Unknown or unreviewed territories, unavailable proof, expired proof, revoked authorisation and contradictory assertions deny activation.
- Existing `ageConfirmedAt` values are historical attestations, not verified age; existing accounts start with eligibility `unknown`.
- `PUBLIC_BETA=false` must not bypass eligibility on a deployed service.
- Optional analytics and profiling stay disabled for every newly governed public account until workstream 2 supplies an applicable server-side purpose-consent decision.
- An author-selected `child_safe` rating is not evidence of suitability for children.
- Guardian approval cannot override a national prohibition, the mature-content ceiling or a safety block.
- Accepting the terms is not universal consent to analytics, profiling or marketing.
- Do not store birth dates, identity documents, facial images or verification tokens in profiles, general logs or JWTs. Private evidence references are excluded from owner/public serializers too.
- Do not invent the EU member state, registered entity, public contact details, business scale, provider acceptance or approved countries. Initially the production approved-territory registry is empty.
- No production migration, deployment, paid provider activation or public launch is authorised by reviewing this implementation plan alone. Use disposable synthetic test infrastructure for verification.
- Each completed code task ends with its own scoped commit and push. Stage exact paths or exact changed hunks; never include older frontend edits. Report commit/push failures immediately.

## Review Focus

1. A policy withdrawal during cached or shared in-flight media work must prevent bytes reaching that requester; test each return path in task 10.
2. An age assertion for the teen band does not establish a national 16+ threshold; test incomplete and conflicting threshold assertions in task 4.
3. A pending group invitation, old membership array or concurrent new adult member must never expose a minor's history or socket events; test transaction/delivery boundaries in task 12.
4. Changing the method, mount prefix, encoded path or trailing segment must not widen restricted-session access; test both API mounts in task 7.
5. An under-13 prescreen followed by password or Google signup must not collect an ordinary child profile before verified guardian authorisation; test both registration paths in task 6.

## File Responsibilities and Shared Interfaces

New files stay small and follow existing service/repository/validator conventions. Do not move unrelated existing code. The interfaces below are the shared contract between tasks, not client assertions that establish authority.

| Unit | Responsibility |
| --- | --- |
| `api-server/src/eligibility/types.ts` | Private facts, approved policy, safe decision and feature names |
| `api-server/src/eligibility/policy.ts` | Pure, deterministic intersection of current facts and applicable approved policies |
| `api-server/src/eligibility/territory-policy.ts` | Validated, versioned production registry; empty until actual approvals |
| `api-server/src/repositories/eligibility-repository.ts` | Transactional challenges, assertions, authorisations, enrollment and revision reads |
| `api-server/src/services/eligibility-service.ts` | Current authority, owner-safe status, capability checks and revocation |
| `api-server/src/eligibility/assurance-adapter.ts` | Approved provider boundary; unavailable implementation and isolated fixture adapter |
| `api-server/src/eligibility/restricted-routes.ts` | Exact method/normalised-path permissions for identity-only sessions |
| `api-server/src/repositories/contact-authorization-repository.ts` | Pair acceptance, guardian approvals and withdrawals |
| `api-server/src/services/contact-authorization-service.ts` | Current contact and group policy, separate from follows |
| `api-server/src/services/media-authorization-service.ts` | Viewer/session/entity authority for media issuance and every delivery |

```ts
type Experience = 'unknown' | 'under_13' | 'teen_13_17' | 'adult_18_plus';
type Capability = 'social' | 'publish' | 'messaging' | 'payments' |
  'seller' | 'memberships' | 'live' | 'rtc' | 'ai' | 'analytics' | 'profiling';
type AssuranceStatus = 'pending' | 'verified' | 'expired' | 'revoked' | 'rejected';
type Threshold = 13 | 14 | 15 | 16 | 17 | 18;
type ThresholdAssertion = { threshold: Threshold; atLeast: boolean };
type EligibilityDecision = {
  experience: Experience; activated: boolean;
  capabilities: Record<Capability, boolean>;
  maximumContentRating: 'child_safe' | 'regular' | 'mature';
  policyVersions: string[]; revision: string;
  reason: 'verification_required' | 'territory_unavailable' |
    'guardian_required' | 'reassessment_required' | 'account_restricted' | null;
};
```

The threshold union includes national consent ages 13–16 and the separate assertions needed for access/guardian rules at 17 or 18; a band alone proves none of them. Extend `Threshold` only when an approved territory requires another threshold; reject an unrecognised assertion until that extension is reviewed. `EligibilityFacts` in task 3 includes the current account status, trusted band, threshold assertions, assessment status/issuer/expiry, applicable territory evidence, terms version/acceptance and current guardian authorisations. `ApprovedTerritoryPolicy` includes country/operator applicability, version, approved status, effective/review dates, minimum access threshold, independent-consent threshold and required purposes, guardian/contact requirements, capability release flags and primary-source references. The evaluator intersects **all** applicable entries and denies unresolved conflicts; an entry cannot discard EU establishment obligations.

The service interface is `decisionFor(userId: string): Promise<EligibilityDecision>`, `publicDecision(territoryContext: TerritoryContext): Promise<EligibilityDecision>` and `requireCapability(userId: string, capability: Capability): Promise<EligibilityDecision>`. `TerritoryContext` contains only minimised declared/approved residency evidence and resolved operator applicability; precise location is unnecessary. Proof payloads, parents and vendor references never appear in `EligibilityDecision`.

`EligibilityAccessError` carries an owner-safe reason and returns HTTP 403 for denied capability, HTTP 428 for an incomplete owner journey, or HTTP 503 for unavailable authority. Content existence remains masked with the existing 404 semantics. A database/provider failure never becomes adult, anonymous-regular or checkbox approval.

## Verification and Execution Conventions

Run focused API tests from the repository root with `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/<file>.test.ts`. Integration tests require explicit URLs for a new disposable PostgreSQL database and Redis namespace, with identity verified before migration. Never inherit a live `DATABASE_URL` from the workspace. Migration is `pnpm --filter @workspace/db migrate:production`; close pools/connections and stop only the disposable services created for this run.

Every task uses the five checkbox steps below. Red tests must fail for the intended behaviour, not missing infrastructure. Green means every listed assertion passed with no skipped required integration check. After green, review `git diff --check`, stage only that task, commit its stated message and push `origin HEAD`. Overlapping dirty frontend files require an index built from the recorded HEAD plus this task's patch; inspect `git diff --cached` before commit and preserve all older working-copy edits.

### Task 1: Keep public grievance receipts private

**Files:** Create `api-server/src/utils/grievance-view.ts`; modify `api-server/src/routes/reports.ts`, `scripts/generate-api-contract.mjs`, `social/src/pages/grievance.tsx`; test `api-server/src/__tests__/report-authorization.integration.test.ts`, `e2e/core-social.spec.ts`. Run the contract-generation commands defined in task 14 within this task before publishing its contract-changing commit.

**Interfaces:** `toPublicGrievance(ticket: GrievanceTicket): PublicGrievanceReceipt`; the receipt has exactly `ticketId`, `status`, `createdAt`, and optional `slaDeadline`. Consume `GrievanceTicket` from `services/moderation-service.ts`; retain the service's full authenticated moderator record.

- [ ] Write failing HTTP assertions for both submission and lookup: `assert.deepEqual(Object.keys(receipt).sort(), ['createdAt', 'slaDeadline', 'status', 'ticketId'])`; seed identity, URL, description, officer note and internal ID and assert none appears. Assert unauthorised moderator reads fail and approved moderator reads retain necessary information.
- [ ] Run `report-authorization.integration.test.ts`; confirm the public extra-field assertion fails against current code.
- [ ] Apply the same allowlist projector to POST and GET. Remove the frontend's officer-note dependency, India-specific statutory framing and unimplemented email-acknowledgment promise. Label the existing date “Operational review target”; do not invent a replacement EU deadline.
- [ ] Rerun that integration test and the grievance Playwright cases with `NODE_ENV=production`; confirm tracking/submission remain usable without internal fields.
- [ ] Commit and push `fix(privacy): limit public grievance receipts` with the regenerated contract and only scoped frontend hunks.

### Task 2: Use one message visibility boundary for export and preview

**Files:** Create `api-server/src/utils/message-visibility.ts`; modify `api-server/src/repositories/message-repository.ts`, `api-server/src/services/message-service.ts`, `api-server/src/services/account-service.ts`; test `api-server/src/__tests__/message-preview.test.ts`, `api-server/src/__tests__/account-service.test.ts`, `api-server/src/__tests__/disappearing-message.test.ts`.

**Interfaces:** `isMessageVisible(message: Pick<MessageRecord, 'deletedAt' | 'expiresAt'>, now: Date): boolean`; `visibleMessagePredicate(now: Date): SQL`; add `MessageRepository.recordVisiblePreview(messageId: string, userId: string, now: Date): Promise<MessageRecord | undefined>` using a transaction that rechecks row visibility/read receipt before writing the preview event. Return only a still-visible row; record no preview on a denied row.

- [ ] Add tests for sender/recipient export, deleted text/media, expiry equal to `now`, future expiry and non-expiring rows: `assert.equal(isMessageVisible({ expiresAt: now.toISOString() }, now), false)`. Add a controlled concurrent deletion/expiry before preview write and before the service returns; assert no content/grant or preview event escapes.
- [ ] Run all three files; verify current expired preview/export cases fail.
- [ ] Reuse the visibility predicate in normal read, last-message, export and preview paths. Capture the export boundary once, recheck preview at its write/return boundary, preserve membership/premium/unread checks, and preserve read-triggered expiry. Do not export raw deleted/expired attachments as a different field.
- [ ] Rerun those files against disposable PostgreSQL, including read-triggered expiry and a real transaction race. Verify retained ordinary rows still export.
- [ ] Commit and push `fix(privacy): exclude expired messages from previews and exports`.

### Task 3: Add private eligibility authority without inventing legacy age

**Files:** Create `lib/db/src/schema/eligibility.ts`, `lib/db/scripts/migrate-eligibility.mjs`, `api-server/src/eligibility/types.ts`, `api-server/src/repositories/eligibility-repository.ts`, `api-server/src/__tests__/eligibility-fixtures.ts`, `api-server/src/__tests__/eligibility-repository.integration.test.ts`; modify `lib/db/src/schema/index.ts`, `lib/db/scripts/migrate-release.mjs`, `api-server/src/types/index.ts`; test `tests/migration-safety.test.mjs`, `api-server/src/__tests__/user-view.test.ts`.

**Interfaces:** Private tables `eligibility_assessments`, `eligibility_challenges`, `eligibility_enrollments`, `guardian_authorizations`, and per-account `eligibility_revisions`. Assessment fields implement the spec's statuses, issuer/method, trusted band/threshold assertions, policy versions, verification/expiry and minimised evidence reference. Challenges bind issuer/audience, random nonce hash, owner or enrollment subject, purpose, expiry and unique consumed event. Authorisations bind verified responsibility, child/enrollment, purposes/notices/policy versions and grant/withdrawal time. `migrateEligibility(client: pg.Client): Promise<void>` participates in the existing release migration rather than constructing a different connection. `readFacts(userId: string): Promise<EligibilityFacts | undefined>` and `advanceRevision(userId: string, tx): Promise<string>` operate in the repository; revision is monotonic, private and not a substitute for reading current facts.

- [ ] Add idempotent fresh/populated migration tests and fixture helper `createEligibilityFixture(userId: string, overrides?: Partial<EligibilityFacts>): Promise<void>`. Assert `legacy.ageConfirmedAt !== null` while its effective assessment is absent/unknown; `assert.equal(publicPayload.evidenceReference, undefined)`. Test purpose ownership, concurrent challenge consumption, orphan prevention and provider-event uniqueness.
- [ ] Run the repository/migration tests; verify the private tables/authority do not exist yet.
- [ ] Add additive schema and migration, constraints/indexes and transactional repository operations. Preserve attestations and existing user/content data; do not backfill adult status. Never join proof fields into `UserRecord`, owner/public view or generic exports. Minimise pre-account enrollment to an opaque subject and verified guardian references; no child's ordinary identifiers.
- [ ] Apply the migration twice to a new database and once to a synthetic populated baseline. Rerun repository, migration-safety and user-view tests, then `pnpm --filter @workspace/db build`.
- [ ] Commit and push `feat(eligibility): store private assessments and authorizations`.

### Task 4: Evaluate current territory and threshold policy centrally

**Files:** Create `api-server/src/eligibility/policy.ts`, `api-server/src/eligibility/territory-policy.ts`, `api-server/src/services/eligibility-service.ts`, `api-server/src/__tests__/eligibility-policy.test.ts`; modify `api-server/src/config/env.ts`, `api-server/.env.example`, `ops/.env.production.example`, `ops/ci-production.env`; test `api-server/src/__tests__/env-config.test.ts`.

**Interfaces:** `evaluateEligibility(facts: EligibilityFacts | undefined, policies: ApprovedTerritoryPolicy[], now: Date): EligibilityDecision`; `EligibilityService` supplies the shared methods above. `loadApprovedTerritoryPolicies(): ApprovedTerritoryPolicy[]` validates versions, approvals and dates and initially returns no production entries. Feature release flags are independent of age eligibility and all default false for payments/seller/memberships/live/rtc/ai; analytics/profiling remain false unconditionally in this workstream.

- [ ] Define fixtures for all three bands and unknown; missing/expired/revoked/rejected evidence; contradictory band/thresholds; withdrawn purpose; expired/unapproved policy; country conflict; terms change; suspended/deactivated account; age transition. Test a synthetic 16+ policy: `assert.equal(evaluateEligibility(teenWithout16Assertion, [testPolicy16], now).activated, false)`. A guardian must not override prohibited access.
- [ ] Run `eligibility-policy.test.ts` and `env-config.test.ts`; verify new decision behaviour is absent.
- [ ] Implement the deterministic intersection and current DB service. Require current terms independently of historical age confirmation. Derive mature access only for verified adults within their stricter preference; unknown/public receive the approved-child-safe ceiling. Avoid wildcard territory rules and production fixture flags; `PUBLIC_BETA` changes no decision.
- [ ] Rerun both files, including production configuration rejecting a fixture registry/adapter and operator-policy conflicts. Run `pnpm production-config:check` after documenting new configuration keys.
- [ ] Commit and push `feat(eligibility): centralize territory and feature decisions`.

### Task 5: Bind assurance results and guardian authority to challenges

**Files:** Create `api-server/src/eligibility/assurance-adapter.ts`, `api-server/src/services/assurance-service.ts`, `api-server/src/controllers/eligibility-controller.ts`, `api-server/src/validators/eligibility.ts`, `api-server/src/routes/eligibility.ts`, `api-server/src/__tests__/assurance-service.test.ts`, `api-server/src/__tests__/eligibility-http.integration.test.ts`; modify `api-server/src/routes/index.ts`, `api-server/src/middlewares/rate-limit.ts`.

**Interfaces:** `AssuranceAdapter.start(challenge: PrivateAssuranceChallenge): Promise<{ redirectUrl: string }>` and `verifyCallback(rawBody: Buffer, headers: Record<string, unknown>): Promise<VerifiedAssuranceEvent>`; events carry issuer/audience, unique event ID, challenge/subject binding, purpose, trusted assertions, verification/expiry and responsibility evidence reference. The unavailable adapter throws a safe provider-unavailable error. The fixture implementation is importable only from test setup and cannot be selected by production configuration. A real provider adapter needs a separate approved provider protocol; no generic signature invented here authorises live activation.

- [ ] Add tests for forged/client `verified`/`guardianApproved` properties, wrong account/subject/issuer/audience/purpose, reused nonce, expired callback, duplicate event, stale policy version, revoked parent authority, provider timeout and concurrent duplicate consumption: `assert.equal(successfulConsumptions, 1)`.
- [ ] Run `assurance-service.test.ts`; confirm challenge verification and atomic consumption are absent.
- [ ] Implement owner-bound GET status, POST challenge and challenge-status routes specified in the design, private transactional application of verified events, and purpose-specific guardian list/grant/withdraw endpoints. Only verified adapter output establishes responsibility/thresholds. Apply withdrawal and revision changes atomically; expose no raw event, evidence or parent identity in safe owner status. Mount signed callbacks only for an explicitly approved real adapter; unavailable production adapter cannot accept callbacks.
- [ ] Run assurance and eligibility HTTP tests with injected fixture adapters, including concurrent callback/withdrawal and 503 responses. Assert raw callback material never reaches logger/profile/JWT/error payloads.
- [ ] Commit and push `feat(eligibility): bind assurance and guardian authorization` with updated contracts.

### Task 6: Prescreen before child collection and gate all registration paths

**Files:** Create `api-server/src/services/eligibility-enrollment-service.ts`, `api-server/src/__tests__/eligibility-enrollment.integration.test.ts`; modify `api-server/src/services/auth-service.ts`, `api-server/src/controllers/auth-controller.ts`, `api-server/src/validators/auth.ts`, `api-server/src/routes/eligibility.ts`, `api-server/src/routes/auth.ts`; test `api-server/src/__tests__/auth-service.test.ts`, `api-server/src/__tests__/auth-controller.test.ts`.

**Interfaces:** `prescreen(input: { requestedExperience: Exclude<Experience, 'unknown'>; territory: string }): Promise<SafeEnrollmentStatus>` accepts coarse declarations only and returns available next steps without creating a child/user profile. `consumeAuthorizedEnrollment(enrollmentId: string, registrationNonce: string, tx): Promise<EnrollmentAuthorization>` validates verified guardian-led collection authorisation and atomically binds the trusted assessment/authorisation to the new account. Registration receives only opaque enrollment credentials, never client proof fields.

- [ ] Add password and Google tests showing no `users` row, profile, email analytics or provider profile import before allowed collection: `assert.equal(childRowsBeforeGuardianApproval, 0)`. Include unknown/unreviewed territory, direct signup bypass, forged band, reused/expired enrollment, approval withdrawal and two concurrent registration attempts.
- [ ] Run enrollment/auth tests; verify current paths collect profile data without the new authority boundary.
- [ ] Add prescreen and guardian-led opaque enrollment. Guard password signup and Google auto-provision before ordinary profile collection; do not automatically import Google child's identifiers. Where collection lacks an approved journey return an unavailable next-step response. Older eligible journeys collect only approved minimal identity data and issue restricted sessions until current activation evidence exists.
- [ ] Rerun enrollment/auth HTTP/database tests. Verify permitted ordinary enrollment succeeds once and no denied request queues welcome/analytics/profile events.
- [ ] Commit and push `feat(eligibility): require approved enrollment before registration`.

### Task 7: Separate verified identity sessions from social activation

**Files:** Create `api-server/src/eligibility/restricted-routes.ts`, `api-server/src/__tests__/restricted-session.integration.test.ts`; modify `api-server/src/services/auth-service.ts`, `api-server/src/middlewares/auth.ts`, `api-server/src/utils/consent.ts`, `api-server/src/utils/user-view.ts`, `api-server/src/controllers/user-controller.ts`; test `api-server/src/__tests__/auth-lifecycle.test.ts`, `api-server/src/__tests__/user-view.test.ts`.

**Interfaces:** `isRestrictedRouteAllowed(method: string, originalUrl: string): boolean` recognises exact routes and validated UUID parameters from the spec for both `/api` and `/api/v1`. Authentication populates server-owned `req.eligibility` after checking identity/session/auth epoch; restricted tokens are never an activation authority. Owner `GET /users/me` returns only account/security/eligibility summary while restricted, plus normal owner view only when activated.

- [ ] Add a method/path matrix for every allowed endpoint, both mounts, wrong methods, extra segments, encoded separators, misleading prefixes and malformed IDs: `assert.equal(isRestrictedRouteAllowed('POST', '/api/v1/users/me/export'), false)`. Verify unknown/expired/suspended/deactivated users can prove identity for permitted security/rights actions but cannot publish; deleted accounts cannot get sessions.
- [ ] Run restricted-session/auth-lifecycle/user-view tests; confirm current status/consent checks either block rights or permit unverified social access.
- [ ] Apply current decisions after password/Google/OTP/MFA/refresh identity checks. Preserve password, MFA, fresh-auth, device and authVersion requirements. Keep moderation status restrictive regardless of assurance. Replace beta age-checkbox activation. Optional authentication has the same safe public ceiling for absent, invalid, expired and restricted credentials; dependency failure returns 503.
- [ ] Rerun the matrix against real HTTP routes and Redis sessions; test age/policy/guardian revocation without relogin, plus existing logout/MFA regressions.
- [ ] Commit and push `feat(auth): restrict sessions until current eligibility permits access`.

### Task 8: Apply default-deny capabilities to HTTP and sockets

**Files:** Create `api-server/src/middlewares/eligibility.ts`, `api-server/src/eligibility/route-capabilities.ts`, `api-server/src/__tests__/eligibility-boundaries.integration.test.ts`; modify `api-server/src/routes/index.ts`, `api-server/src/socket/index.ts`, `api-server/src/socket/policy.ts`; test `api-server/src/__tests__/socket-security.test.ts`.

**Interfaces:** `requireCapability(capability: Capability): RequestHandler`; a reviewed route/method map assigns every authenticated operation, with unmapped operations denied. Safety/public routes and restricted owner routes use their exact separate authorities. `authorizeSocketAction(userId: string, event: string, context): Promise<void>` reloads current account and feature authority for connection/action/delivery; no social-room join for restricted sessions.

- [ ] Enumerate generated route catalog and socket events; assert every protected operation has a capability or exact restricted classification. Assert `unmappedRoute.allowed === false`. Connect a valid user, revoke proof/guardian/policy, then attempt typing/send/join/call and receive a queued event; assert zero forbidden events and room removal.
- [ ] Run boundary/socket-security tests; verify current long-lived action/delivery checks lack the new authority.
- [ ] Implement default-deny classification at both API mounts and socket boundaries without trusting payload/JWT features. Recheck recipients before delivery and async emit; use a shared current-authority notification/socket dispatch helper rather than unchecked room broadcasts for governed payloads. Preserve trusted-origin, validation and rate limits. Staff moderation requires existing role permission plus current approved staff/account authority, never a blanket age exemption.
- [ ] Rerun HTTP/socket integration including database outage, user/role forgery, both mounts and post-revocation delivery; verify permitted safety/security routes remain functional.
- [ ] Commit and push `feat(eligibility): enforce capabilities across HTTP and sockets`.

### Task 9: Enforce the same ceiling in classification, discovery and direct reads

**Files:** Create `api-server/src/eligibility/content-policy.ts`, `api-server/src/__tests__/eligibility-content.integration.test.ts`; modify `api-server/src/services/content-safety-service.ts`, `api-server/src/repositories/discovery-scope.ts`, `api-server/src/services/media-moderation-service.ts`, `api-server/src/services/media-publication.ts`, `api-server/src/services/user-service.ts`, `api-server/src/utils/user-view.ts`, `lib/db/src/schema/eligibility.ts`, `lib/db/scripts/migrate-eligibility.mjs`; test `api-server/src/__tests__/content-safety.test.ts`, `api-server/src/__tests__/audience-regression.test.ts`, `api-server/src/__tests__/discovery-batching.test.ts`.

**Interfaces:** Private `content_safety_classifications` binds exact entity type/ID and content revision/hash to approved classification, issuer, status and policy version. `allowsRatedContent(context: CurrentContentContext): boolean` combines approved classification, current decision, preference, author privacy, audience, blocks and moderation. Existing `discoveryScope` accepts the current ceiling/context and performs SQL reduction before LIMIT; final service authority remains required.

- [ ] Create feed/search/direct-ID/profile cases for under13/teen/adult/unknown/anonymous/invalid token; mature preference cannot elevate a minor and creator `child_safe` without approved classification remains hidden. Assert `anonymousIds` deep-equals `restrictedIds` for the same public URL and territory. Change approved content after classification and assert old approval does not apply.
- [ ] Run content/discovery/audience tests; verify current anonymous regular ceiling and self-rated child safety fail new assertions.
- [ ] Add classification persistence and approved authority consumption. Keep unclassified/conflicting/removed content outside child-safe browsing; do not auto-classify legacy rows. Apply the same ceiling and private minor profile rules before SQL pagination and after direct lookup across posts, stories/highlights, videos, notes, articles, communities/products/events and other content surfaces in the route inventory. Preserve stricter preferences and ordinary audience/block checks.
- [ ] Rerun those files plus real DB/HTTP pagination with forbidden rows ahead of allowed rows. Verify no leak through counts, suggestions, direct comments, avatars or public profile lookup; no empty-page workaround that simply filters after LIMIT.
- [ ] Commit and push `feat(safety): enforce eligibility ceilings in content discovery`.

### Task 10: Bind media grants to the requesting viewer and exact resource

**Files:** Create `api-server/src/services/media-authorization-service.ts`, `api-server/src/__tests__/eligibility-media.integration.test.ts`, `social/src/lib/protected-media.ts`; modify `api-server/src/services/media-delivery.ts`, `api-server/src/services/media-response.ts`, `api-server/src/routes/media.ts`, `social/src/lib/message-delivery.ts`, `social/src/lib/video-delivery.ts`, `social/src/components/feed/Post.tsx`, `social/src/components/feed/StoryViewer.tsx`, `social/src/components/video/ReelVideoPlayer.tsx`, `social/src/components/feed/AudioWaveformPlayer.tsx`, `social/src/pages/messages.tsx`; test `api-server/src/__tests__/media-http.integration.test.ts`, `api-server/src/__tests__/media-security.test.ts`, `tests/media-client.test.mjs`, `e2e/core-social.spec.ts`.

**Interfaces:** Replace the current asset-only grant with versioned `MediaGrantContext`: exact asset, entity type/ID/reference, variant, owner-preview flag, viewer ID/device session or approved anonymous audience, issued policy revision and expiry. `MediaAuthorizationService.authorize(context: MediaGrantContext): Promise<void>` checks current session/eligibility, entity visibility, membership/contact where applicable, reference existence and asset approval. `MediaDeliveryService.read(id, token, requesterContext)` reauthorises the individual requester before every return, including cache hit, shared pending promise and provider/decoder completion. Owner previews require the current owner and publication capability; token possession alone is insufficient. `fetchProtectedMedia(sourceUrl: string, signal?: AbortSignal): Promise<{ objectUrl: string; dispose(): void }>` fetches through the API's current identity credentials and creates a short-lived browser object URL; dispose on replacement/unmount/logout and clear on revoked/expired delivery. Keep blobs and credentials out of persistent storage.

- [ ] Write valid-grant copied-to-another-user/anonymous cases and revoke eligibility/contact/reference while cached, awaiting shared load, or awaiting provider verification. Assert `deliveredBytesAfterRevocation === 0` for each requester. Assert using a public reference cannot expose a private reference for the same asset, and legacy v1 grants are denied.
- [ ] Run eligibility-media/media-http tests; confirm asset-only grants/cache paths fail the new resource/viewer checks.
- [ ] Mint only after exact entity authorisation; hydrate references with entity type as well as ID, never free text or untrusted JSON. Use the application delivery proxy exclusively for governed media; remove any injected provider-URL bypass from production response paths. Use the authenticated-fetch/object-URL helper for protected image/video/audio consumers, including avatar/cover/highlight surfaces found by the media-client inventory; never put long-lived bearer tokens in URLs. Anonymous fetches are permitted only for an approved anonymous grant. Use private/no-store delivery responses for protected media and current authority even when bytes are internally cached.
- [ ] Rerun media integration with HTTP fetches, range/poster/original delivery, copied grants, private avatars/message attachments, old grants, concurrent callers and provider-byte integrity. Verify renewal after revocation fails and permitted playback remains usable in Playwright.
- [ ] Commit and push `fix(media): reauthorize viewer and resource on every delivery`.

### Task 11: Make contact permission explicit and revocable

**Files:** Create `api-server/src/repositories/contact-authorization-repository.ts`, `api-server/src/services/contact-authorization-service.ts`, `api-server/src/routes/contacts.ts`, `api-server/src/validators/contact-authorization.ts`, `api-server/src/__tests__/contact-eligibility.integration.test.ts`; modify `lib/db/src/schema/eligibility.ts`, `lib/db/scripts/migrate-eligibility.mjs`, `api-server/src/routes/index.ts`, `api-server/src/services/message-service.ts`, `api-server/src/services/user-service.ts`.

**Interfaces:** `requestContact(initiatorId, recipientId): Promise<SafeContactRequest>`, `acceptContact(requestId, actorId): Promise<SafeContactRequest>`, `approveChildContact(requestId, verifiedGuardianId): Promise<SafeContactRequest>`, `withdrawContact(requestId, actorId): Promise<void>`, `requireContact(aId, bId, action: 'read' | 'send' | 'deliver'): Promise<void>`. Store normalised pair IDs, initiator, both acceptances, required verified guardian approvals, policy version, state and timestamps; a follow is never an acceptance.

- [ ] Add adult-initiated minor rejection, teen mutual acceptance, teen-initiated adult required guardian case, each under13 guardian plus recipient acceptance, two-under13 both guardians, unknown actor, withdrawn approval and safety block tests: `assert.equal(await permittedContactAfterFollowingOnly(), false)`.
- [ ] Run contact/message/profile tests; verify current follow/stranger/legacy conversation permissions fail explicit authorisation cases.
- [ ] Implement atomic approval/withdrawal with current pair policy and verified responsibility checks, secure owner/guardian DTOs and routes. Gate existing/new DM reads/sends/attachments/typing/delivery, previews, edits/reactions/pins by current contact and membership. Blocking always stops contact; guardian approval cannot undo it. Do not delete historical evidence or grant guardians child message-history access.
- [ ] Rerun actual DB/HTTP/socket tests including revoke-during-send and an unapproved existing conversation; only mutually permitted messages/events succeed.
- [ ] Commit and push `feat(safety): require explicit contact authorization for minors`.

### Task 12: Require group acceptance and pairwise policy

**Files:** Create `api-server/src/__tests__/group-eligibility.integration.test.ts`; modify `api-server/src/repositories/message-repository.ts`, `api-server/src/services/message-service.ts`, `api-server/src/controllers/message-controller.ts`, `api-server/src/routes/messages.ts`, `api-server/src/socket/index.ts`, `lib/db/src/schema/eligibility.ts`, `lib/db/scripts/migrate-eligibility.mjs`.

**Interfaces:** Private `conversation_invitations` stores inviter/invitee, pending/accepted/rejected/revoked state, policy version and acceptance/guardian approvals. `inviteToGroup(conversationId, inviterId, inviteeIds): Promise<SafeGroupInvite[]>`; `acceptGroupInvitation(invitationId, recipientId): Promise<void>` serialises membership change using the conversation row lock, checks current policy against **every** member and inserts membership only after required approvals. Existing `getMembers`/`listForUser` read accepted membership authority, not `participantIds` alone.

- [ ] Assert `pendingInviteeHistory.length === 0`, zero joins/events and zero message/media grants. Test concurrent accept/adult-add, newly revoked pair contact, legacy JSON membership, one minor introducing an unapproved adult and guardian withdrawal after acceptance.
- [ ] Run group/message/socket tests; verify current immediate group insertion grants access prematurely.
- [ ] Turn group creation/addition into pending invitations; creator membership is current-policy checked. Add explicit recipient accept/reject routes and guardian approval integration. Require pairwise eligibility on reads/sends/membership change and per-recipient delivery. Preserve existing history, but unreviewed legacy minor contact does not retain social access through old arrays.
- [ ] Rerun real transaction/HTTP/socket tests, including contention on one group and delivery after withdrawal; no unapproved member receives payloads.
- [ ] Commit and push `feat(safety): require accepted policy-checked group invitations`.

### Task 13: Enforce feature restrictions and safe defaults at the source

**Files:** Create `api-server/src/__tests__/eligibility-features.integration.test.ts`; modify `api-server/src/services/auth-service.ts`, `api-server/src/services/user-service.ts`, `api-server/src/services/payment-service.ts`, `api-server/src/services/economy-service.ts`, `api-server/src/services/platform-premium-service.ts`, `api-server/src/services/live-stream-service.ts`, `api-server/src/services/livekit-service.ts`, `api-server/src/services/ai-service.ts`, `api-server/src/services/product-analytics-service.ts`, `api-server/src/services/notification-service.ts`, `api-server/src/routes/notifications.ts`, `api-server/src/types/index.ts`.

**Interfaces:** Consume `requireCapability` inside service/provider entry points, not just route middleware. Effective minor settings require private profile, no public precise location, strangers blocked and autoplay/read receipts/push/streaks off by default; restricted/unknown users remain undiscoverable. Stored preferences cannot raise content/contact capability. Existing refund/reconciliation/provider-webhook settlement must still process already-created obligations without new user purchases.

- [ ] Parameterise minor/unknown direct HTTP, socket and service calls to every commerce, seller, membership, live/RTC and AI creation entry point: `assert.equal(providerCallsForDeniedActor, 0)`. Assert adults with release flags off are also denied, optional analytics/profile events are not stored/enqueued, and guardian approval cannot turn these minor features on.
- [ ] Run eligibility-features and existing payment/AI/live/analytics tests; distinguish intended capability failures from provider stubs.
- [ ] Apply current decisions before external calls, queueing and DB side effects and recheck before result/credential issuance. Clamp client settings changes server-side. Suppress optional browser/server analytics, engagement profiling and minor push/read-receipt/streak collection by default; keep essential security auditing minimised and separate. Gate token minting and refresh for live/RTC; issued third-party room tokens remain a real-provider revocation/TTL acceptance gate, not an application test claim.
- [ ] Rerun feature/HTTP/provider-isolated tests with withdrawal during an awaited call. Verify safety reporting and required payment settlement continue under their distinct verified authority; no new minor financial obligations are created.
- [ ] Commit and push `feat(safety): enforce feature limits and private minor defaults`.

### Task 14: Deliver the owner journeys and regenerate real contracts

**Files:** Create `social/src/pages/eligibility.tsx`, `social/src/components/auth/EligibilitySummary.tsx`, `social/src/lib/eligibility-contract.ts`; modify `social/src/App.tsx`, `social/src/lib/api-client.ts`, `social/src/lib/store.ts`, `social/src/pages/auth.tsx`, `social/src/pages/consent.tsx`, `social/src/pages/onboarding.tsx`, `social/src/pages/settings.tsx`, `social/src/pages/messages.tsx`, `social/src/lib/telemetry.ts`, `social/src/lib/telemetryBatcher.ts`, `social/src/components/perf/RouteTelemetry.tsx`, `social/src/components/messages/IncomingCallManager.tsx`, `scripts/generate-api-contract.mjs`, `api-server/src/docs/openapi.ts`; test `e2e/core-social.spec.ts`, `tests/client-session.test.mjs`.

**Interfaces:** Strict owner-safe eligibility/receipt/contact/invitation DTO parsers reject malformed authority and display server-provided next steps. The client never derives trusted age or activation from a DOB/checkbox/local-storage/JWT field. Generate `lib/api-spec/openapi.yaml` and `api-server/src/docs/routes.generated.ts` with `pnpm contract:generate`, then regenerate typed Zod/React clients using `pnpm --filter @workspace/api-spec codegen`. Run this contract update with every earlier task that publishes a route/schema change too.

- [ ] Add UI cases for existing unknown account, expired proof, blocked country, guardian pending/withdrawn, valid teen/adult and provider outage: `expect(socialComposer).not.toBeVisible()` for every restricted case. Assert owner can reach verification/export/delete/logout and safety pages, malformed DTO never activates, under13 normal profile form stays unavailable until allowed collection, and pending invite has no history.
- [ ] Run client-session and focused Playwright cases with explicit `NODE_ENV=production`; confirm missing journeys/restrictions fail.
- [ ] Implement a child-readable three-experience journey and guardian progress using safe server decisions. Display country/provider unavailability truthfully, preserve data-rights/security access and show transition instructions to old accounts. Apply permitted settings/content/contact affordances and disable optional telemetry by default. Reuse the protected-media helper from task 10 and handle expired/revoked playback without embedding credentials in URLs.
- [ ] Run root unit tests, frontend typecheck/build, generated-client checks, `pnpm contract:check`, `pnpm design:check` and focused browser journeys. Inspect the staged diff against the recorded dirty baseline; preserve older styling/Studio changes.
- [ ] Commit and push `feat(ui): add verified eligibility and guardian journeys` with only new/scoped files and generated artifacts.

### Task 15: Verify the foundation and preserve the remaining production gates

**Files:** Create `api-server/src/__tests__/eligibility-acceptance.integration.test.ts`; modify `.github/workflows/ci.yml`, `ops/smoke-test.mjs`, `docs/PRODUCTION_READINESS_REVIEW_2026-10-07.md`, `docs/PRODUCTION_LAUNCH.md`.

**Interfaces:** Test-only fixture initialization grants explicit synthetic policy/assurance to fixtures that require social activation; ordinary new fixtures remain unknown unless a test asks for trusted authority. Never change production defaults to preserve old test behaviour. Acceptance evidence records exact SHA, test environment, observed checks and outstanding provider/operator/territory gates.

- [ ] Write a table of the spec's ten numbered acceptance requirements and exercise each through its authoritative path: public receipt, real DB export/preview, login/restricted/optional/socket, callback replay, guardian withdrawal, content/media, contacts/groups/features, payload/log privacy, legacy migration/production config, and actual client/integration checks. Assert production startup with fixtures is rejected and an empty approved registry activates nobody.
- [ ] Run the acceptance file and demonstrate relevant failures before integrating the changes. Existing suites that omit eligibility fixtures must fail closed rather than silently treating users as adult.
- [ ] Add isolated eligibility fixtures to the appropriate tests, fixture-only CI configuration and smoke checks for protected capabilities and restricted rights. Preserve real source assertions; no weakening expected ceilings or silently skipping unavailable required tests.
- [ ] Run `pnpm test:unit`, `pnpm --filter @workspace/api-server test`, API/frontend typechecks, `pnpm contract:check`, `pnpm design:check`, `pnpm production-config:check`, `pnpm build:pnpm`, and the complete `pnpm test:e2e` with explicit production frontend mode. Observe hosted CI and applicable Compose/container smoke for the exact pushed SHA. Compare full working-copy browser behaviour with clean committed source if older edits still differ. Any failure stays an open blocker.
- [ ] Commit and push `test(eligibility): verify global age and privacy boundaries`; record actual green checks and unresolved launch evidence without claiming worldwide compliance or production readiness.

## Coverage and Remaining Programme

| Spec acceptance | Owning tasks |
| --- | --- |
| 1. Private public receipts, functional moderation | 1, 8, 15 |
| 2. Deleted/expired export and preview boundaries | 2, 10, 15 |
| 3. Restricted identity, exact paths, optional auth and sockets | 6–8, 15 |
| 4. Trusted three experiences, callback binding and outage | 3–5, 15 |
| 5. Verified purpose-specific guardian authority and prohibitions | 4–6, 11–12, 15 |
| 6. No mature/minor content bypass, including media/anonymous | 7–10, 13–15 |
| 7. Explicit contact/group/feature limits and revocation races | 8, 10–13, 15 |
| 8. Private evidence/parent identity and safe owner status | 3, 5, 7, 11, 14–15 |
| 9. Legacy unknown, no production fixtures, child precollection | 3–7, 9, 14–15 |
| 10. Actual local/integration/client/hosted checks | Every task, 15 |

This is the first workstream, not a smaller definition of “production ready.” Workstreams 2–6 still require implementation and operational evidence: complete data rights/retention/deletion, lawful notice/action and appeals, accurate operator notices and governance, approved commerce/AI, and each territory's release acceptance. The readiness review also retains independent OTP/revocation, group account-deletion cascade, alerting/worker, proxy/rate-limit and local Studio blockers. They remain part of the production objective and need their own verified scoped repairs; this plan does not mark them resolved.

Real provider integration cannot be certified with fixture callbacks. Actual operator identity and member state, approved country policies, provider/processor agreements, age/parental-responsibility protocol and live safety/rights/deletion drills are required before activation or launch. Passing this foundation's tests proves only the tested implementation revision and boundaries.

## Execution Handoff

Review this saved plan before product edits. Recommended method: implement in this session, task by task, with an independent review of the completed branch when reviewer capacity is available. Tasks share many eligibility/contact/media interfaces; a single implementer reduces inconsistent assumptions while focused tests and scoped commits keep each change reviewable. The current parallel reviewers reached an account usage limit; their incomplete mapping is not review approval.

The writing-plans skill requires review of the written plan and selection of its execution method before implementation. Once reviewed, preserve the selected method and continue without requesting task-by-task authorisation for the planned reversible repairs. Update the plan when current source reveals a material design conflict; do not fabricate provider/operator approvals.
