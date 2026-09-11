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

## Analytics and tracking inventory

- The repository contains a custom telemetry batcher used by React profiling and route navigation components.
- It stores a queue in `localStorage` only after consent, batches up to 20 events, and sends to `VITE_TELEMETRY_URL` using `sendBeacon` or `fetch` when configured.
- Sampling is controlled by `VITE_TELEMETRY_SAMPLING`; the default is 100% when consent has been granted. Review whether full sampling is necessary for production.
- No Google Analytics, Segment, Mixpanel, Amplitude, PostHog, Plausible, tracking pixel, fingerprinting library or session-replay provider was found in the repository scan.
- `localStorage` also stores non-analytics UI state such as sidebar collapse and the optional telemetry queue. Authentication uses an HttpOnly refresh cookie according to the server configuration.
- Google Identity Services is an authentication integration, not optional analytics. It must remain separately disclosed as a third-party sign-in service.
- **Manual verification:** inspect deployed browser network traffic with analytics consent rejected and granted; verify no optional endpoint, beacon or queue write occurs in the rejected state, including after reload and page hide.

## Third-party service inventory

| Service/resource | Repository evidence and likely data/resource flow | Action |
|---|---|---|
| Google Identity Services | External `accounts.google.com/gsi/client` script; sign-in credential is sent to the API for authentication. | Required only when Google sign-in is enabled; disclose and verify OAuth configuration, origin and Google terms. |
| Cloudinary | Server upload/storage integration when configured; receives uploaded media and related metadata. | Required for media hosting; verify account region, transformations, deletion and licence/terms. |
| Resend | Transactional email provider when configured; receives email address and message content needed for delivery. | Required for verification/recovery; verify sender domain, processor terms and retention. |
| LiveKit | RTC/live-room integration when enabled; receives room/session and media transport data. | Disabled unless fully configured; complete live-room privacy and recording review first. |
| Razorpay | Payment integration when enabled; receives payment/order data. | Keep disabled until payment, refund, consumer-law and webhook controls are live-tested. |
| Web Push/browser push services | Browser subscription and notification delivery when enabled. | Permission-gated and feature-gated; document browser/provider processing. |
| OpenAI or Gemini | Server content-safety provider when one is configured; may receive submitted content for moderation. | Verify processor terms, retention, regional transfer and sensitive-content handling. |
| Postgres and Redis | Required infrastructure for accounts/content/session/queues; receives service data. | Secure deployment, access control, backup encryption and retention need manual verification. |
| Browser Contact Picker | Optional browser API used by IRL Shield; selected contact names/emails are read locally and only normalized email match values are submitted. | Keep explicit in-product explanation; verify platform permission behavior and deletion. |

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
