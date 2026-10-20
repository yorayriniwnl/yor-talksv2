# Compliance remediation — requirements 1–12

This record covers only requirements 1–12 from the current remediation batch.
Repository implementation is not legal approval, provider acceptance, or
production verification. This report did not exist before this batch, so no
earlier Batch 2 content was overwritten.

| # | Requirement | Status in this batch | Evidence / remaining approval |
|---|---|---|---|
| 1 | Privacy policy | Updated public notice for observed data categories, purposes, controls, deletion limits, consent withdrawal, providers, moderation and contacts. | Copy reflects repository behavior; operator identity, retention periods, grievance process and counsel review remain outstanding. |
| 2 | Terms of service | Expanded public terms for accounts, content permissions, prohibited behavior, reports/copyright, moderation, suspension/deletion, Premium and availability limits. | Not represented as counsel-approved. Configure the real operator, effective date and governing law; obtain jurisdiction-specific review. |
| 3 | Refund policy | Added a public policy route that reads the exact server Premium catalog; linked it beside plan pricing and checkout. Missing catalog terms display as unavailable. | Checkout remains controlled by existing Premium/payment flags and requires configured price, terms version and refund text. Owner approval and payment-provider acceptance remain prerequisites. |
| 4 | Cookie/storage notice | Added a public notice and routes covering the refresh cookie, browser storage, opt-in telemetry, Google sign-in and gated checkout/push integrations. | Verify deployed cookies and network/storage behavior on staging. |
| 5 | Cookie/analytics consent | Preserved the eligibility-gated, default-off telemetry control and reversible Settings switch; corrected the unsupported “anonymous” description. | Focused browser regression checks that no optional request/queue exists before opt-in and withdrawal clears local state. Deployed network verification remains outstanding. |
| 6 | Form consent | Required terms acceptance remains unchecked and server records the configured terms version and acceptance timestamp. Age/eligibility is separate; no marketing consent is bundled with required terms. | Existing server validation rejects missing acceptance and does not treat the legacy age checkbox as age proof. Legal review of consent basis and verification method remains outstanding. |
| 7 | Data minimization/retention | Added a category/purpose/period/deletion/approval matrix, including known product expiry and the analytics pruning path. | No comprehensive approved schedule exists. Owners/counsel must approve periods for account, safety, media, financial, log and backup records; no statutory periods were invented. |
| 8 | Third-party inventory | Updated the inventory with provider purpose, data flow, feature gate/disclosure and verification status. | No contracts, certifications, data residency or provider acceptance are claimed. Verify each enabled provider and its terms before launch. |
| 9 | Dark patterns | Kept analytics rejection discoverable and reversible, made refund terms directly accessible before Premium checkout, and retained visible paid-term cancellation. No fake countdown/scarcity or blocked rejection was found in the cited product audit. | Verify all configured pricing, taxes/fees and cancellation journeys in staging; no live payment behavior was tested. |
| 10 | Hidden fees | Premium continues to use the server catalog as canonical for price, currency, duration, renewal and refund wording; the policy link is displayed at the purchase decision. | Do not enable purchases until owner-approved terms include every applicable charge/tax and checkout matches them. No additional charge is asserted by this repository review. |
| 11 | Fake reviews | No fabricated public testimonial, rating or user-count claim was identified in the authoritative product-source review; no replacement social proof was added. | Keep development seed data clearly non-production and do not present it as genuine activity. |
| 12 | Unsupported claims | Replaced broad privacy/security/retention assertions with narrower descriptions and explicit verification limits. | No claim of certification, complete deletion, legal approval, provider acceptance, perfect safety or verified global age assurance is made. Review any deployment-specific public copy before launch. |

## Files changed

- `social/src/pages/legal.tsx`
- `social/src/pages/consent.tsx`
- `social/src/pages/settings.tsx`
- `social/src/pages/premium.tsx`
- `social/src/App.tsx`
- `social/src/lib/api-client.ts`
- `social/src/lib/premium-billing-contract.ts`
- `e2e/core-social.spec.ts`
- `api-server/src/__tests__/auth-service.test.ts`
- `docs/PRODUCTION_PRIVACY_ACCESSIBILITY_AUDIT.md`
- `docs/COMPLIANCE_REMEDIATION.md`

## Verification

PASS, exit 0:

- `git diff --check`
- `pnpm production-config:check` — 69 API environment keys and Compose requirements verified.
- `pnpm contract:check` — 252 operations over 214 paths.
- `pnpm test:unit` — 63 passed, 0 failed.
- `pnpm --filter @workspace/social build` — successful; existing duplicate JSX/package-key and chunk-size warnings remain.
- `pnpm test:e2e e2e/core-social.spec.ts --grep 'public beta legal pages|public beta requires consent|optional analytics stays off|Premium checkout accepts'` — 4 passed, 0 failed. Covers public notices, canonical refund terms, missing-policy state, unchecked consent, analytics opt-in/withdrawal and Premium link.
- `pnpm --dir api-server exec tsx --test --test-name-pattern='current terms acknowledgement' src/__tests__/restricted-session.integration.test.ts` — 1 passed.
- `pnpm --dir api-server exec tsx --test --test-name-pattern='current terms acceptance' src/__tests__/auth-service.test.ts` — 1 passed.

BLOCKED, nonzero:

- `pnpm --filter @workspace/social typecheck` — exit 2 due to duplicate JSX attributes in unchanged `social/src/components/studio/StudioCameraModal.tsx` at lines 399 and 519.
- `pnpm --filter @workspace/api-server typecheck` — exit 2 due to existing parse errors in unchanged `api-server/src/__tests__/disappearing-message.test.ts` and `api-server/src/__tests__/message-preview.test.ts`.
- `pnpm test:e2e -- e2e/core-social.spec.ts --grep 'public beta legal pages|public beta requires consent|optional analytics stays off|Premium checkout accepts'` — the extra `--` caused the full spec to run: 64 passed, 1 failed, exit 1. The unrelated existing Studio camera manual-stop test could not find “Start recording”; that unchanged file has duplicate JSX attributes. The affected focused rerun above passed.

The root manifest has `test:unit` and `test:e2e`, not a root `test` script.
No full API integration suite was run because application API routes were not
changed; targeted consent-service and policy tests ran without external
services. No live checkout, external-provider processing, legal approval,
alert delivery, or production deployment was tested.

## Release approvals still required

- Supply the actual legal operator identity, contacts, effective date and
  governing law; obtain qualified counsel review of public notices and terms.
- Approve retention periods and deletion/hold procedures by data category,
  including backups, complaint evidence, provider copies and accounting records.
- Confirm applicable tax/fee and consumer-refund terms, then keep payment
  features disabled until the owner approves the exact disclosure and accepts
  the provider lifecycle in its test environment.
- Verify contracts, processing regions, configuration and deletion behavior for
  every provider that will be enabled.
- Run staging checks for HTTPS/cookies, analytics rejected/granted network
  behavior, deletion/export propagation, complaints and accessibility.

## Batch 2 — requirements 13–20

This batch preserves the Batch 1 record above. “Implemented” describes only
repository behavior; it does not establish legal approval, accessibility
conformance, provider acceptance, or production verification.

| # | Requirement | Status | Implementation and evidence | Remaining approval / manual verification |
|---|---|---|---|---|
| 13 | Image alt text and accessible names | Partially implemented | `social/src/components/ui/avatar.tsx` now defaults avatar images to decorative empty alt while preserving explicit alt; `social/src/components/feed/StoryViewer.tsx` identifies the story image context and author. | Review all product media with content context and icon-only actions with screen readers; meaningful descriptions of user-uploaded image content are not available from filenames or current metadata. |
| 14 | WCAG contrast and visual states | Partially implemented | `social/src/index.css` and `social/src/premium.css` restore solid, 3px token-based focus outlines where previous styles suppressed or weakened them. | Automated contrast and manual light/dark, hover, disabled, and high-contrast checks remain required. No full WCAG 2.2 AA claim. |
| 15 | Keyboard navigation | Partially implemented | Existing skip link is covered by a new Playwright check for keyboard reachability, visible outline, and focus transfer to `main#main-content`; existing Radix primitives are unchanged. | Manually exercise all dialogs, menus, tabs, forms, upload controls, media controls, billing, and settings with keyboard and assistive technology. |
| 16 | Business/operator details | Implemented as a fail-closed gate, not as operator verification | Existing `api-server/src/config/env.ts`, `scripts/check-production-config.mjs`, and `social/src/lib/public-beta-config.ts` require legal operator fields for production public beta; `social/src/pages/legal.tsx` labels missing details and suppresses the configured notice footer. No identity or address was added. | Operator must provide and verify real legal name, address, contacts, effective date, governing law, and grievance contact; production configuration validation and legal review remain prerequisites. |
| 17 | Age consent and assurance | Partially implemented; launch blocked | `social/src/pages/consent.tsx` now states that the terms checkbox is not age verification and assurance depends on a configured approved territory process. Existing 18+ safeguards remain unchanged. | Do not open public beta until an approved age-assurance process and child-safety operations are configured, tested, and approved. |
| 18 | Email unsubscribe | Blocked / no current marketing mail path identified | `api-server/src/services/email-service.ts` currently supports transactional authentication emails only; no marketing subscription, sender, or preference path exists in the inspected implementation. No disconnected token endpoint was added. | Keep marketing email disabled. Before adding it, approve a marketing-purpose/preference model and implement scoped expiring unsubscribe tokens, rate limits, send-time opt-out enforcement, and one-click unsubscribe headers. |
| 19 | Font/image/media provenance | Partially implemented; commercial clearance unverified | Added `docs/ASSET_PROVENANCE.md` for repository SVGs, still-life images, Google Fonts, Lucide icons, E2E audio/video fixtures, and user uploads. Unknown ownership and licences are explicitly `UNVERIFIED`. | Record source, licence, attribution, commercial-use rights, modifications, and evidence; do not publish unresolved assets as commercially cleared. |
| 20 | Account data deletion | Partially implemented; completion propagation blocked | Existing `api-server/src/services/account-service.ts` commits database deletion, retains/anonymizes financial references, queues account cleanup and creates media-cleanup holds. `social/src/pages/settings.tsx` no longer claims all associated data is immediately deleted. | `media_cleanup_holds` has no confirmed consumer in the inspected lifecycle path. Implement and test a safe idempotent media-hold consumer, verify provider deletion and retries, and document backup/legal-hold behavior before promising completion. |

### Batch 2 files changed

- `social/src/index.css`
- `social/src/premium.css`
- `social/src/components/ui/avatar.tsx`
- `social/src/components/feed/StoryViewer.tsx`
- `social/src/pages/consent.tsx`
- `social/src/pages/settings.tsx`
- `e2e/core-social.spec.ts`
- `docs/ASSET_PROVENANCE.md`
- `docs/COMPLIANCE_REMEDIATION.md`

### Batch 2 verification

PASS, exit 0:

- `git diff --check`
- `pnpm production-config:check` — existing production environment/Compose
  requirements validated.
- `pnpm --filter @workspace/social build` — production bundle generated;
  pre-existing duplicate manifest-key, duplicate JSX-attribute, and chunk-size
  warnings remain.
- `pnpm test:e2e e2e/core-social.spec.ts --grep 'skip navigation|public beta requires consent'`
  — 2 passed, 0 failed. Covers consent copy, empty alt on a rendered avatar,
  keyboard access to the skip link, visible focus outline, and focus transfer
  to the main content.

BLOCKED, exit 2:

- `pnpm --filter @workspace/social typecheck` — pre-existing duplicate JSX
  attributes in unchanged `social/src/components/studio/StudioCameraModal.tsx`
  lines 399 and 519. No type errors were reported in the changed files before
  the compiler stopped.

The first run of the focused E2E selector exited 1 because its test assertion
matched two avatar images while requiring a single locator. The assertion was
corrected to verify that at least one rendered avatar has empty decorative
alt text; the focused rerun above passed. The prior Batch 1 test results and
unrelated blockers remain as recorded above. No live provider, production
deployment, deletion propagation, or manual WCAG verification was performed.

### Consolidated requirements 1–20 status

| Requirements | Status | Relevant files | Remaining release gate |
|---|---|---|---|
| 1–2 | Partially implemented | `social/src/pages/legal.tsx`, `social/src/App.tsx` | Real operator data and counsel approval |
| 3, 10 | Partially implemented | `social/src/pages/legal.tsx`, `social/src/pages/premium.tsx`, `social/src/lib/premium-billing-contract.ts`, `api-server/src/routes/premium.ts` | Approve purchase/refund terms and verify provider checkout before enablement |
| 4–5 | Partially implemented | `social/src/pages/legal.tsx`, `social/src/pages/settings.tsx`, `social/src/App.tsx` | Staging verification of cookie and pre/post-consent network behavior |
| 6 | Partially implemented | `social/src/pages/consent.tsx`, `api-server/src/utils/consent.ts`, `api-server/src/__tests__/auth-service.test.ts` | Counsel review; age assurance remains a separate public-beta gate |
| 7–8 | Partially implemented | `docs/PRODUCTION_PRIVACY_ACCESSIBILITY_AUDIT.md`, `social/src/pages/legal.tsx` | Approve retention periods and verify provider contracts/regions/acceptance |
| 9, 11–12 | Partially implemented | `social/src/pages/legal.tsx`, `social/src/pages/premium.tsx`, `social/src/pages/settings.tsx`, `e2e/core-social.spec.ts` | Validate final configured purchase, cancellation, public-copy and staging flows |
| 13–15 | Partially implemented | `social/src/components/ui/avatar.tsx`, `social/src/components/feed/StoryViewer.tsx`, `social/src/index.css`, `social/src/premium.css`, `social/src/components/layout/AppShell.tsx`, `e2e/core-social.spec.ts` | Full assistive-technology, keyboard, and contrast verification |
| 16 | Implemented as a fail-closed gate; operator details unverified | `api-server/src/config/env.ts`, `scripts/check-production-config.mjs`, `social/src/lib/public-beta-config.ts`, `social/src/pages/legal.tsx` | Supply and legally approve real operator details |
| 17 | Partially implemented; public beta blocked | `social/src/pages/consent.tsx`, existing server eligibility/assurance routes | Approve and operate territory-appropriate age assurance and child-safety procedures |
| 18 | Blocked; no marketing mail path | `api-server/src/services/email-service.ts` | Keep marketing mail disabled; approve and implement scoped opt-out before sending any marketing mail |
| 19 | Partially implemented; assets unverified | `docs/ASSET_PROVENANCE.md`, `social/index.html`, repository asset files | Establish commercial rights and evidence for every shipped asset |
| 20 | Partially implemented; deletion propagation unverified | `api-server/src/services/account-service.ts`, `api-server/src/workers/lifecycle-worker.ts`, `social/src/pages/settings.tsx` | Consume media holds safely; test provider cleanup, retries, retention and backups |

## Final blocker revalidation

The following status snapshot supersedes older verification statements above
where a newer run is listed. It preserves the earlier Batch 1 and Batch 2
history; it does not convert unresolved external evidence into completion.

| # | Requirement | Status | Current evidence and remaining blocker |
|---|---|---|---|
| 1 | Privacy policy | BLOCKED BY OWNER / COUNSEL | Public notice exists in `social/src/pages/legal.tsx`; operator details, retention approvals and counsel review remain missing. |
| 2 | Terms of service | BLOCKED BY OWNER / COUNSEL | Terms are published in `social/src/pages/legal.tsx`; real operator/governing-law details and counsel review remain required. |
| 3 | Refund policy | PARTIALLY COMPLETE | Public policy uses Premium catalog data; refund terms and provider behavior still require owner approval and staging verification. |
| 4 | Cookie/storage notice | PARTIALLY COMPLETE | Public notice and routes exist; deployed cookie/storage behavior has not been manually verified. |
| 5 | Cookie/analytics consent | PARTIALLY COMPLETE | Default-off opt-in and withdrawal E2E passed; live network behavior remains unverified. |
| 6 | Form consent | PARTIALLY COMPLETE | `api-server/src/services/auth-service.ts` records required Terms acceptance without treating it as age proof; focused terms test passed. Counsel and approved age assurance remain outstanding. |
| 7 | Data minimization/retention | BLOCKED BY OWNER / COUNSEL | The audit matrix documents known mechanisms but retention periods and legal holds have not been approved. |
| 8 | Third-party inventory | BLOCKED BY PROVIDER / ENVIRONMENT | Inventory records observed integrations; contracts, provider acceptance, regional handling and production configuration are unverified. |
| 9 | Dark patterns | PARTIALLY COMPLETE | Rejection/withdrawal and purchase disclosures have focused coverage; all cancellation and billing journeys need manual verification. |
| 10 | Hidden fees | PARTIALLY COMPLETE | Catalog-based terms and purchase gating exist; configured tax/fee disclosures and live checkout have not been verified. |
| 11 | Fake reviews | PARTIALLY COMPLETE | No replacement social proof was added; product/deployment copy and seeded data still require owner review. |
| 12 | Unsupported claims | PARTIALLY COMPLETE | Specific unsupported camera claims were removed; a full public-copy review and production verification remain open. |
| 13 | Image alt text | PARTIALLY COMPLETE | Avatar/story semantics and Studio camera accessible names have focused browser coverage; all informative media still requires review. |
| 14 | WCAG contrast | PARTIALLY COMPLETE | Focus styles were strengthened; no route-complete contrast or assistive-technology verification has been performed. |
| 15 | Keyboard navigation | PARTIALLY COMPLETE | Skip navigation and Studio camera controls passed focused browser checks; all dialogs, menus, upload, billing and media flows remain unverified. |
| 16 | Business/operator details | BLOCKED BY OWNER / COUNSEL | Production gates require these values, but no verified legal identity, address, dates or contact details were supplied. |
| 17 | Age assurance | BLOCKED BY PROVIDER / ENVIRONMENT | Eligibility-aware registration remains in place and no Terms checkbox is age proof; the assurance adapter/provider and child-safety operations are not approved or available. |
| 18 | Email unsubscribe | VERIFIED COMPLETE | The current behavior has no marketing sender or preference path: `api-server/src/services/email-service.ts` contains transactional authentication mail only, and `MARKETING_EMAIL_ENABLED=true` is rejected at configuration load. Add secure unsubscribe and send-time preference checks before introducing marketing mail. |
| 19 | Font/image/media licensing | BLOCKED BY OWNER / COUNSEL | `docs/ASSET_PROVENANCE.md` marks unsupported rights `UNVERIFIED`; commercial rights evidence is missing. |
| 20 | Account data deletion | BLOCKED BY PROVIDER / ENVIRONMENT | Database deletion queues cleanup and financial retention; media cleanup holds lack a verified consumer, and the deletion tests require unavailable PostgreSQL/Redis services. |

### Final revalidation files changed

- `api-server/src/services/auth-service.ts`
- `api-server/src/config/env.ts`
- `api-server/src/__tests__/env-config.test.ts`
- `docker-compose.production.yml`
- `.env.example`
- `api-server/.env.example`
- `ops/.env.production.example`
- `api-server/src/__tests__/auth-service.test.ts`
- `api-server/src/__tests__/auth-email-otp.integration.test.ts`
- `api-server/src/__tests__/ai-response.test.ts`
- `api-server/src/repositories/message-repository.ts`
- `api-server/src/services/message-service.ts`
- `api-server/src/controllers/message-controller.ts`
- `api-server/src/routes/reports.ts`
- `api-server/src/routes/health.ts`
- `api-server/src/utils/grievance-view.ts`
- `api-server/src/services/account-service.ts`
- `e2e/core-social.spec.ts`
- `docs/COMPLIANCE_REMEDIATION.md`
- `docs/PRODUCTION_PRIVACY_ACCESSIBILITY_AUDIT.md`

### Final revalidation tests

PASS:

- `pnpm test:unit` — 63 passed, 0 failed, including the release migration
  safety assertion.
- `pnpm --filter @workspace/db build` — passed.
- `pnpm --filter @workspace/api-server typecheck` — passed after the database
  workspace build.
- `pnpm --filter @workspace/api-server build` — passed.
- `pnpm --filter @workspace/api-server test` — not green: 387 tests, 158
  passed, 226 failed, 3 skipped. Failures included unavailable PostgreSQL and
  Redis, isolated migration tests without their required test environment, and
  readiness/grievance assertions. The readiness error response and public
  grievance receipt were corrected afterward; their targeted checks were
  rerun below.
- `pnpm --filter @workspace/social typecheck` and
  `pnpm --filter @workspace/social build` — passed; Vite reports its existing
  large-chunk warning.
- `pnpm production-config:check` — passed; 69 API environment keys and Compose
  requirements were verified.
- `pnpm contract:check` — passed; 252 operations across 214 paths.
- Focused current-Terms acceptance test — 1 passed.
- `api-server/src/__tests__/ai-response.test.ts` — 4 passed.
- `env-config.test.ts` — 5 passed, including the default-off, fail-closed
  marketing email guard.
- Focused readiness-disclosure assertion — 1 passed.
- Public grievance projection assertion — 1 assertion passed, but the
  integration test file exited nonzero because its PostgreSQL cleanup hook
  could not connect.
- Focused Studio camera accessibility E2E — 1 passed after correcting the
  browser MediaRecorder stub and matching the accessible “Record video” name.
- Final focused camera/consent/keyboard/analytics E2E batch — 5 passed.

BLOCKED BY ENVIRONMENT / NONZERO:

- `pnpm --filter @workspace/api-server test` — 387 tests: 158 passed, 226
  failed, 3 skipped. PostgreSQL on localhost:5432 and Redis on localhost:6379
  are unavailable. Other observed failures included an auth-registration
  expectation while eligibility remains fail-closed, a push-unsubscribe
  response assertion, migration tests lacking their isolated environment,
  notification-worker readiness, and shared metrics. The full API suite was
  not rerun after the two focused readiness/grievance fixes; run it with its
  isolated services and environment before release.
- The combined focused Studio/accessibility E2E run had 4 passes and 1 failure
  because its mocked `MediaRecorder` omitted `isTypeSupported`; the corrected
  single Studio test rerun passed. The browser emitted expected proxy errors
  for unavailable API readiness/auth endpoints.
- `git diff --check` and final worktree inspection remain to be run after this
  documentation update.

Legal approval, operator verification, provider acceptance, commercial asset
rights, production deletion drills, manual WCAG verification and public-beta
activation remain blocked. Do not enable public beta based on repository tests.
