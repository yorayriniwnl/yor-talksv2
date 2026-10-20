# YOR Talks Production Privacy, Accessibility and Legal-Risk Audit

**Review date:** 2026-09-11  
**Scope:** repository-level technical review of the web app, API, database schema, contracts, configuration, assets and existing tests. This is not legal advice and does not certify compliance.

## Remaining P0/P1 risks

1. **P0: Public launch must remain blocked until live identity, security and provider configuration is verified.** Production configuration rejects placeholder secrets and missing required providers, but this review did not run a deployed environment. Complete TLS, DNS, CORS, cookie, OAuth, email, upload, moderation, backup/restore, monitoring and incident-response tests.
2. **P1: Legal/operator details and reviewed notices are deployment inputs, not repository facts.** The public-beta gate requires operator name/address, effective date, governing law, privacy/support contacts and grievance officer details. Do not enable public beta until real values are supplied and the notices are reviewed by qualified Indian counsel.
3. **P1: India UGC obligations need operational confirmation.** The repository contains reporting, moderation and grievance flows, but retention schedules, complaint/takedown SLAs, appeals, evidence preservation, child-safety escalation and designated-contact operations need live owner, process and legal review.
4. **P1: External providers and media licensing are not verified by repository evidence.** Google Identity Services, Cloudinary, Resend, LiveKit, Razorpay, Web Push and optional AI providers may receive user or operational data. Confirm contracts, DPDP processor terms, regional handling, security settings and licence/terms acceptance before launch.
5. **P1: Upload and user-generated-content safety needs live abuse testing.** Server-side MIME sniffing and a 10 MB limit exist, but malware scanning, provider transformation policy, takedown propagation, EXIF stripping, copyright workflow and adversarial content testing require deployment verification.

## Fixed issues

- Optional telemetry is now **off by default**. It cannot be enqueued, loaded from browser storage, flushed, or sent until the user affirmatively enables it in Settings.
- Rejecting optional analytics removes the consent marker and any queued optional events from local storage.
- Settings now states what optional events are collected and links directly to the Privacy Notice.
- The signed-in shell supplies meaningful alternative text for the current user's profile photo.
- A global `prefers-reduced-motion: reduce` fallback suppresses CSS animation and transition duration and disables smooth scrolling. Framer Motion already receives `reducedMotion="user"`.

## Data collected and purpose

| Data or event | Observed purpose | Minimization assessment |
|---|---|---|
| Verified email and password hash | Authentication, verification, recovery and account communication | Necessary; do not log raw credentials or codes. |
| Username and full name | Account identity and social discovery | Core product fields; confirm whether full name can be optional before launch. |
| Terms version, acceptance time and age-confirmation time | Versioned consent and age gate | Necessary for the configured beta; preserve 18+ restriction unless a new child-safety design is approved. |
| Profile bio, avatar, website, location, country, language, time zone and creator fields | User profile, discovery and creator features | User-entered and feature-dependent; confirm optional fields are not required or used for unrelated profiling. |
| Posts, media URLs, comments, messages, reactions, follows, saves, notifications and social relationships | Core social functionality, delivery and moderation | Necessary for enabled features; define retention and deletion behavior for backups, reports and legal holds. |
| Reports, grievance name/email, reported URL and description | Safety, copyright/privacy complaints and grievance response | Necessary to process a complaint; minimize access and retention, and publish the operational process. |
| Device/session records, refresh cookie, login timestamps, 2FA/TOTP material and challenge IDs | Authentication, fraud prevention and account security | Security-necessary; keep secrets protected and publish retention periods. |
| Contact Shield normalized match digests | Prevent selected contacts finding a profile | Sensitive relationship-derived data; retain only keyed digests, document deletion/rotation and verify the secret-management process. |
| Purchases/payment and financial audit records when enabled | Payments, refunds, fraud and accounting | Feature-gated; do not enable until Razorpay, tax, retention and consumer-law workflows are reviewed. |
| Optional navigation/performance telemetry | Reliability and product improvement | Now affirmative opt-in, sampled by configuration, and sent only to the configured internal endpoint. No new provider was added. |

The schema also contains counters, content ratings, audience settings, moderation/status fields and feature-specific metadata. These support ranking, delivery, safety or enabled product features; the owner should periodically delete unused columns rather than expose them by default in API responses.

## Retention and deletion matrix

The application has feature-specific expiry and deletion paths, but the repository does not establish an approved comprehensive retention schedule. “No approved period” below is an unresolved owner/legal decision, not permission to retain data indefinitely.

| Category | Purpose | Period evidenced in implementation | Deletion mechanism | Unresolved approval / verification |
|---|---|---|---|---|
| Account identity, credentials and eligibility/consent records | Sign-in, account recovery, eligibility and versioned terms | While account is active; access tokens are short-lived and the refresh cookie has a seven-day maximum age. No post-deletion period is approved. | Account deletion removes the user record and queues cleanup; active Redis sessions are invalidated. | Approve any retained authentication, consent and abuse-prevention evidence periods. |
| Profile, posts, comments and relationships | User-directed social service and moderation | Until user deletion or account cleanup; no comprehensive period is configured. | In-product controls and account deletion workflow. | Verify all dependent copies, feed caches, recipient copies and backups; define any safety hold. |
| Messages and media | Deliver conversations and user media | Messages may have an explicit expiry; Stories expire according to product terms (24 hours standard, up to 72 hours when the entitlement allows it). Other media has no single repository-wide lifetime. | User deletion and account/media cleanup jobs; expired media references release owned assets. | Verify provider cleanup, recipient copies, backups and failed-job handling; approve any moderation hold. |
| Reports, grievances and moderation evidence | Review safety, privacy and copyright complaints and support appeals | No approved automatic deletion period is documented. | Restricted operational handling and case-by-case resolution; no self-service report erasure is promised. | Name the case owner; approve complaint, appeal, evidence-preservation and copyright retention periods and legal holds. |
| Optional browser telemetry | Reliability and product improvement | Browser queue is removed on opt-out; the analytics rollup script invokes server pruning with a 90-day retention period. | User opt-out clears the local consent marker and queue; the rollup/prune script deletes old server events when it is run. | Confirm production schedule and whether 90 days is necessary; test opt-out and deployed network behavior. |
| Contact Shield match digests | Match user-selected contacts without retaining a raw address book | Until removed or account cleanup; no independent maximum is approved. | User removes entries or account cleanup runs. | Approve digest-key rotation, deletion propagation and any backup period. |
| Orders, payment, ledger and dispute records (when enabled) | Fulfilment, fraud, refunds, disputes and accounting | No approved statutory/accounting period is recorded in this repository. Account deletion anonymizes/retains some financial references rather than deleting them. | Payment/account services retain necessary transaction records; user data is minimized where supported. | Obtain jurisdiction-specific accounting/consumer-law advice and owner-approved period; confirm provider-side deletion/retention. |
| Backups, application/security logs and queued cleanup jobs | Recovery, service security and retryable deletion | Operational schedules/TTL vary; no single approved user-data period is documented here. | Scheduled backup rotation and durable cleanup workers where configured. | Verify off-host backup lifecycle, log rotation, job completion, restore isolation and deletion propagation. |

## Analytics and tracking inventory

- The repository contains a custom telemetry batcher used by React profiling and route navigation components.
- It stores a queue in `localStorage` only after consent, batches up to 20 events, and sends to `VITE_TELEMETRY_URL` using `sendBeacon` or `fetch` when configured.
- Sampling is controlled by `VITE_TELEMETRY_SAMPLING`; the default is 100% when consent has been granted. Review whether full sampling is necessary for production.
- No Google Analytics, Segment, Mixpanel, Amplitude, PostHog, Plausible, tracking pixel, fingerprinting library or session-replay provider was found in the repository scan.
- `localStorage` also stores non-analytics UI state such as sidebar collapse and the optional telemetry queue. Authentication uses an HttpOnly refresh cookie according to the server configuration.
- Google Identity Services is an authentication integration, not optional analytics. It must remain separately disclosed as a third-party sign-in service.
- **Manual verification:** inspect deployed browser network traffic with analytics consent rejected and granted; verify no optional endpoint, beacon or queue write occurs in the rejected state, including after reload and page hide.

## Third-party service inventory

| Provider/service | Purpose and data shared | Feature gate / disclosure | Verification status |
|---|---|---|---|
| Google Identity Services | Optional sign-in; receives browser sign-in interaction and returns a credential sent to Yor for authentication. | Google sign-in client configuration; Privacy Notice and Cookie/Storage Notice. | Code path identified; production OAuth origin, terms and provider acceptance not verified. |
| Cloudinary | Uploaded images/video and associated media metadata/storage operations. | Configured media provider; Privacy Notice and upload disclosures. | Code path/configuration identified; account region, processor terms, license and deletion acceptance unverified. |
| Resend | Verification, recovery and transactional email address/content. | Configured email provider; Privacy Notice. | Code path/configuration identified; sender domain, processor terms and retention unverified. |
| LiveKit | Live-room/RTC session and media transport data. | Live/RTC feature flags; Privacy Notice and feature disclosures. | Feature-gated; live provider acceptance and recording behavior unverified. |
| Razorpay | Payment/order details needed for checkout, reconciliation, refunds and disputes. | Payment/Premium enable flags; public Premium terms and refund policy. | Feature-gated and disabled by checked-in defaults; test-merchant lifecycle and provider acceptance unverified. |
| Browser push services | Push subscription endpoint/keys and notification delivery data. | Web Push feature flag plus browser permission. | Permission/feature-gated; provider processing and delivery acceptance unverified. |
| Configured text/media moderation provider (for example OpenAI or Gemini) | Content submitted for the configured moderation operation. | Provider key/configuration and moderation feature; moderation disclosure. | Provider/configuration path identified; terms, retention, transfer and provider acceptance unverified. |
| PostgreSQL and Redis infrastructure | Account, content, session, queue and operational data required by the service. | Required runtime infrastructure; Privacy Notice and deployment controls. | Repository wiring exists; production access, backups, operator controls and retention not certified here. |
| Browser Contact Picker | User-selected identifiers read locally; normalized match values may be sent for Contact Shield matching. | User-initiated optional feature; in-product explanation and Privacy Notice. | API use identified; browser-specific behavior and deletion propagation need runtime verification. |
| Yor telemetry endpoint (internal service) | Opt-in navigation/performance event batches; localStorage queue. | Eligibility plus explicit Settings opt-in; default off; Cookie/Storage Notice. | Repository gate and 90-day pruning path identified; deployed network behavior and retention schedule require runtime/owner verification. |

No iframe, YouTube, Instagram, Giphy, Facebook embed or remote font was identified in the reviewed source scan. Local/project media still requires provenance review below.

## Accessibility checks

Verified by source review:

- Public legal routes exist for Privacy, Terms and Community Guidelines; grievance is routed in the app and linked by the legal page.
- Many forms use associated `<label>` elements, `aria-invalid`, `aria-describedby`, `role="alert"`, and focus on the first invalid field. Auth, consent, settings, grievance and upload-related controls were sampled.
- Navigation controls are native buttons/links with accessible names and `aria-current`/`aria-expanded` where applicable. The shell has a skip link and a focusable main target.
- Meaningful profile avatar alternative text and reduced-motion fallback were added in this review.
- Radix-based dialogs, switches, selects, tabs and buttons are used in several reusable controls, which supplies keyboard behavior where correctly composed.

Not verified as WCAG 2.2 AA:

- Automated axe scan and keyboard walkthrough across every route were not run in this review.
- Full contrast audit for both themes, zoom/reflow at 200%, mobile viewport behavior, screen-reader announcements, focus return for every dialog and all heading hierarchies remain to be tested.
- Dynamic icon-only controls, media players, charts, canvas/Three.js surfaces, custom menus and all lazy-loaded pages need route-by-route testing.
- Accessibility should not be described as WCAG-compliant until those tests pass and defects are triaged.

## Forms and consent

- Registration requires username, email, password, full name, Terms/Privacy acceptance and age confirmation. Password and one-time-code fields are necessary for authentication; full name is a product identity field and should remain optional only if product behavior permits.
- Consent checkboxes are not pre-checked and validation makes missing acceptance/age confirmation explicit.
- Grievance fields have labels, maximum lengths, field-level errors and first-error focus. Reporter name/email are necessary for response, but should not be retained longer than the complaint process requires.
- Settings provides account export and deletion controls. Confirm deletion across object storage, queues, caches, backups, reports and provider copies in a live drill.

## Fake reviews, claims and unsupported content

The repository scan found no clear fabricated testimonial, rating, “trusted by thousands”, “rank #1” or similar user-count claim in the reviewed product source. Seed scripts contain synthetic content for development; never expose that seed data as real user activity in production. The existing readiness document contains an evidence score for backend readiness; it must not be presented as a consumer trust or compliance score.

## Business, legal and operator details

Legal configuration is intentionally blank by default and is fail-closed for `PUBLIC_BETA`. Do not replace placeholders with invented identity details. Before launch, configure and counsel-review:

- legal operator name and address;
- privacy, support and grievance contacts;
- grievance officer identity and operating process;
- effective date, terms version and governing law;
- privacy notice, terms, community guidelines, cookie/storage notice and refund/payment terms where applicable;
- copyright notice/takedown channel and retention schedule.

The UI exposes `/privacy`, `/terms`, `/community-guidelines` and `/grievance`; check the production navigation and unauthenticated access in a browser. The current legal text is product copy, not a lawyer-approved notice.

## External asset and copyright inventory

Repository media includes local PNG/JPEG/WebP-style product imagery, app icons/splash assets, `assets/hero.svg`, `assets/architecture.svg` and generated QR codes. Source provenance, model/property releases, copyright ownership and licences are not established by the repository scan. No external replacement asset was downloaded.

**Manual licence verification required:** record creator/source, licence or ownership evidence, permitted commercial use, attribution requirements, modifications, model/property releases and removal process for every image, icon, font, sound, video and seeded media item before public launch. Confirm that user uploads are covered by the Terms permission and that complaints can trigger timely takedown.

## Applicable-law and risk considerations

This is a technical risk checklist, not legal advice. Qualified Indian counsel should confirm applicability and current rules, including the Digital Personal Data Protection Act, 2023 and applicable rules, Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and amendments, Consumer Protection Act/e-commerce requirements for enabled commercial features, Copyright Act processes for user-generated content, and accessibility obligations.

Technical questions requiring an accountable owner and legal answer:

- notice, purpose limitation, consent/withdrawal, access/correction, deletion and grievance handling for personal data;
- processor contracts, cross-border transfers, security safeguards, breach response and retention/deletion schedules;
- UGC moderation, notice-and-action, appeals, evidence preservation, complaint handling and designated contact coverage;
- child safety, age assurance and escalation. The current product is configured for 18+ in public-beta defaults; allowing under-18 users requires a separate safeguards design and legal review;
- copyright complaints, repeat-infringer handling, counter-notices and media takedown propagation;
- payment disclosure, refunds, taxes, consumer support and Razorpay responsibilities if commercial features are enabled.

## P0/P1/P2 risk list

- **P0:** no live deployment/security/provider/backup/monitoring verification; public launch must remain blocked until the launch gates pass.
- **P1:** real legal identity and counsel-reviewed notices are not repository-proven; UGC/grievance/child-safety/copyright operations need named owners and live drills; external provider and asset licences need verification; upload abuse and deletion propagation need testing.
- **P2:** complete route-by-route WCAG 2.2 AA testing; review optional telemetry sampling and event payloads; publish precise retention periods; maintain an asset provenance register; remove unused schema/profile fields after feature-owner confirmation.

## Manual actions before public launch

1. Supply real legal/operator and contact configuration; have notices reviewed by qualified counsel.
2. Keep `PUBLIC_BETA` disabled until production secrets, domains, TLS, OAuth, email, storage, moderation and required infrastructure are verified.
3. Run an authenticated data inventory and deletion/export drill, including provider copies, caches, queues, backups and reports.
4. Run rejected/granted telemetry network tests, then review production telemetry payloads for identifiers, message content and unnecessary fields.
5. Complete keyboard, screen-reader, contrast, zoom/reflow and axe checks across every public and authenticated route.
6. Verify every local and seeded media/font/icon asset licence and user-upload notice/takedown workflow.
7. Run abuse, malware, oversized-file, EXIF, copyright, child-safety and moderation escalation tests with disposable accounts.
8. Test backups/restores, rate limits, auth/session revocation, CORS, cookies, WebSockets, monitoring and incident response in the real deployment.

## Checks actually run

- `pnpm install --frozen-lockfile` — **PASS**.
- `pnpm --filter @workspace/social typecheck` — **PASS** after dependency installation.
- Before dependency installation, the same typecheck was **NOT VERIFIED** because `tsc` was unavailable; this was resolved by the locked install.
- `pnpm --filter @workspace/db build` — **PASS** (required workspace declaration build).
- `pnpm --filter @workspace/api-server typecheck` — **PASS** after the database workspace build.
- `pnpm --filter @workspace/social build` — **PASS**; Vite reports existing large-chunk warnings.
- `pnpm build` — **PASS**; all workspaces compiled, with the same existing frontend large-chunk warnings.
- `pnpm test:unit` — **PASS**, 26 tests.
- `pnpm production-config:check` — **PASS**.
- `pnpm contract:check` — **PASS**, 202 operations across 169 paths.
- Static repository searches and source review — **COMPLETED**, not a substitute for runtime or legal verification.
- `pnpm test:e2e` — **NOT VERIFIED**; Playwright started its web server but could not launch tests because the Chromium executable is not installed in this environment. Install the pinned browser and rerun.
- Accessibility/axe, Docker runtime and live smoke checks — **NOT VERIFIED in this audit** and required before launch.

## Continuation: final blocker revalidation

This addendum is the latest repository-level validation snapshot and
supersedes older test outcomes above where the same command was rerun. It is
not evidence of provider acceptance, legal approval, deployment health, or
complete WCAG conformance.

### Confirmed technical repairs

- Terms acceptance records only the configured Terms version and server
  timestamp; it does not set the legacy age-confirmation field. Eligibility
  enrollment remains the separate age/eligibility authority.
- Restored the live-message authorization-aware update/read-receipt persistence
  path and filtered unauthorized conversation results before building the
  inbox response.
- Removed duplicate source imports and unreachable duplicate message-handler
  code that prevented API typecheck.
- Readiness failures now return a generic response rather than dependency
  hosts, runtime details or per-service state; public grievance receipts omit
  category and other non-approved fields.
- Kept the Release migration's media and eligibility migration paths intact;
  the migration safety unit test passed.
- Updated the Studio camera E2E stub to provide the `MediaRecorder` capability
  queried by the component and asserted the control's accessible name.

### Current validation outcomes

PASS:

- `pnpm test:unit` — 63 passed, 0 failed.
- `pnpm --filter @workspace/db build` — passed.
- `pnpm --filter @workspace/api-server typecheck` — passed after the DB
  workspace build.
- `pnpm --filter @workspace/api-server build` — passed.
- `pnpm --filter @workspace/social typecheck` — passed.
- `pnpm --filter @workspace/social build` — passed, with existing Vite
  large-chunk warnings.
- `pnpm production-config:check` — passed; 69 API environment keys and
  production Compose requirements were verified.
- `pnpm contract:check` — passed; 252 operations across 214 paths.
- Current Terms acceptance test — 1 passed.
- AI provider response tests — 4 passed.
- Focused Studio manual-stop/accessibility E2E — 1 passed after correcting the
  test stub.
- Readiness-disclosure regression — 1 passed.
- Public grievance projection assertion — 1 passed, though the containing
  integration test exited nonzero because its PostgreSQL cleanup hook could
  not connect.

BLOCKED BY LOCAL SERVICES:

- `pnpm --filter @workspace/api-server test` — 387 tests: 158 passed, 226
  failed, 3 skipped. PostgreSQL (`localhost:5432`) and Redis
  (`localhost:6379`) refused connections; database-backed deletion, messaging,
  eligibility and cache/session tests therefore do not provide usable
  verification. The run also reported failures for an auth-registration
  expectation while eligibility is unavailable, push unsubscribe, isolated
  migration variables, worker readiness, and shared metrics. The full suite
  was not rerun after two targeted readiness/grievance fixes.
- One initial combined browser run had 4 passes and 1 Studio camera test
  failure. The isolated rerun passed after adding `MediaRecorder.isTypeSupported`
  to the test double; the combined run itself remains a failed invocation.

### Remaining release blockers

- **Age assurance / child safety:** the repository has eligibility-aware
  enrollment, but the configured assurance adapter is unavailable. Keep the
  public beta gate closed until an approved assurance process and child-safety
  operation are available and tested. Terms acceptance is not age verification.
- **Account deletion:** the account service removes the account and queues
  cleanup, and preserves/anonymizes financial references. The media-cleanup
  hold consumer, provider propagation, retry behavior, and backup/legal-hold
  outcomes have not been verified with PostgreSQL, Redis, or live providers.
- **Email marketing:** the inspected email service sends authentication
  messages only; no marketing sender or persistent marketing preference path
  is present. `MARKETING_EMAIL_ENABLED` defaults to false and configuration
  rejects true. Do not add marketing sends until scoped unsubscribe tokens,
  persistent preferences, send-time opt-out checks and required headers are
  implemented and tested.
- **Accessibility:** selected avatar/story alternatives, Studio control names,
  skip navigation, keyboard focus and analytics withdrawal have focused
  coverage. Full screen-reader, route-complete contrast, zoom/reflow, manual
  keyboard, and axe verification remain open.
- **Owner, counsel and provider evidence:** operator identity/contact details,
  reviewed legal terms, retention periods, provider acceptance/regions and
  commercial asset rights remain unverified. Unknown asset rights remain
  `UNVERIFIED`.
- **Production operations:** live deletion/export drills, provider cleanup,
  backups/restores, monitoring/alert delivery, incident response and public
  deployment configuration remain unverified. The public beta must remain
  blocked.
