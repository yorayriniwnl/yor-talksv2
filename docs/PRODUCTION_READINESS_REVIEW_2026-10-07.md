# Production readiness review — 7 October 2026

**Decision: not ready for the requested global launch.** Passing development checks do not close the confirmed defects or establish that the real operating service meets its release requirements.

**Scope:** EU-based operator; intended global availability; under-13, 13–17 and 18+ experiences. The actual EU member state and legal entity are unknown. This is a source and validation review, not certification of legal compliance or a deployed-service acceptance.

**Latest verified committed baseline:** `44ca8c44e51c30d36fbc9318c38823b2d275d866`, branch `codex/media-lifecycle-20261006`; product source is unchanged from the initial `c1c10e3` review. The checkout also contained 233 pre-existing modified frontend entries, including 36 files with content changes after Git normalization. Those changes were neither edited nor included in this review's commit. Local checks exercise the working copy; GitHub checks exercise the committed baseline.

## Verification completed

| Check | Observed result | What the result establishes |
| --- | --- | --- |
| Local root unit suite | 57 passed, 0 failed, 0 skipped | Existing browser-state/session-boundary tests passed |
| Local API and frontend type checks | Passed | Current working copy compiles under the configured TypeScript checks |
| Local API contract check | 231 operations over 195 paths passed | Generated contract matches the inspected routes |
| Local design token check | Passed | Existing token constraints passed |
| Local production configuration check | 64 schema keys passed | Configuration wiring is synchronized; actual production values were not accepted |
| Local production dependency audit | No reported vulnerabilities; 340 production dependencies | The package advisory check passed at review time |
| Local database/API/frontend build | Passed | Windows build completed; large frontend chunk warnings remain |
| Local Chromium browser suite, current working copy | 56 passed, 4 failed | Initial run used development React; camera control regression confirmed |
| Targeted Chromium rerun with `NODE_ENV=production` | 3 passed, 1 failed | Media renewal and both billing recovery cases passed; missing Studio stop control reproduced |
| Fresh PostgreSQL 16.4 production migration and account-deletion probe | Migration and probe completed; shared-history loss reproduced | Actual current schema and account/conversation services confirm the defect in a separate synthetic cluster |
| GitHub CI, push run 37522534217 | Completed successfully, attempt 1 | 57 unit, 262 API and 60 browser tests passed with no skips/failures; migrations, builds and container smoke steps passed on this commit |
| GitHub CI, pull-request run 37522541152 | Completed successfully, attempt 1 | The same test counts and release checks passed on this commit |

Sources: [push CI run](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37522534217), [pull-request CI run](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37522541152). Jobs `112471295987` and `112471317747` were inspected, including step outcomes and decoded logs. CI provider calls are isolated; its readiness assertion intentionally expects `details.media.ready=false`. It does not prove real media-provider acceptance.

Local evidence logs are outside the repository at `C:/Users/yoray/AppData/Local/Temp/yor-production-recheck-20261007/`. The working-copy browser run exited 1 after 5.8 minutes. Retained browser failure evidence is in the ignored `test-results/` directory; the committed CI result must not be substituted for this local failure result.

The initial run's billing traces contain development React's DevTools message and two immediate requests: first malformed fixture data, then valid fixture data. Development StrictMode replay disregarded the first effect's state update. The ignored root `.env` sets `NODE_ENV=development`, and the browser configuration did not override it. An unchanged-source, four-case rerun with explicit `NODE_ENV=production` passed both billing cases and media renewal and reproduced only the missing Studio control (exit 1, 1.4 minutes). This supports the build-mode diagnosis for those three initial failures; it does not establish a fully passing production-mode suite or fix the source regression. Its logs and separate failure artifacts are retained in `production-targeted.log` and `production-targeted-results/` under the same external evidence directory.

## Confirmed release blockers

### P1 — Email sign-in codes can survive credential revocation and be redeemed repeatedly

`api-server/src/services/auth-service.ts:278` stores OTP state without the account's `authVersion`. Verification reads the current account and creates a session using its new version (`:323`, `:343`). Logout-all revokes the database epoch but cleanup removes sessions and approval challenges, not this OTP (`:437`, `:444`). A code issued before revocation can therefore create a new session afterward.

The same flow uses separate reads, attempt updates and deletion (`:298`, `:317`, `:343`), allowing concurrent successful redemptions and lost attempt increments. An independent offline probe of the actual service with in-memory repositories observed 12 sessions from 12 concurrent correct submissions, attempts remaining at 1 after 12 incorrect submissions, and successful redemption after logout-all at the new account epoch. Database operations were configured to throw if called; these were service-logic probes, not real Redis, PostgreSQL or HTTP integration tests. Password-reset cleanup uses the same method, but that variant was source-inspected only.

The HTTP auth limiter permits 40 requests per 15 minutes; it does not make OTP redemption or per-code attempt accounting atomic. Required acceptance: one successful redemption under concurrency, exact failed-attempt accounting, and rejection of codes issued before logout-all/password reset, while preserving MFA and approval-challenge requirements.

### P1 — Retained expired message text can escape through preview and account export

Normal message listing filters expiry. Account export selects raw sent/received rows without equivalent deletion/expiry predicates (`api-server/src/services/account-service.ts:58`). Preview checks deletion, membership, unread state and premium entitlement, but not expiry (`services/message-service.ts:204`); repository lookup and post-preview lookup return the raw row (`repositories/message-repository.ts:76`, `:82`). The authenticated preview controller returns this result directly, and the response media transformer preserves text.

An independent in-memory service probe returned text from a message whose expiry was in 2000. Preconditions: the row is retained, not marked deleted, the recipient remains a member, the message is unread and preview entitlement is enabled. No live datastore was queried.

Required acceptance: no deleted/expired text or attachment grant from lists, direct reads, previews or exports; race checks at the preview write/return boundary; preserved legitimate unread-preview behavior. The age/privacy draft now explicitly includes this repair.

### P1 — Public grievance responses expose private and internal fields

The status route excludes only email and description before spreading the remainder (`api-server/src/routes/reports.ts:38`). The remainder includes reporter name, reported URL and internal officer notes. Submission also returns the service row. Possession of a tracking ticket should grant only the approved public receipt/status projection.

Required acceptance: submission and tracking responses allowlist `ticketId`, `status`, `createdAt` and an accurately described operational deadline; reporter identity and moderator notes remain available only to authorised staff. The existing India-labelled statutory-deadline presentation is unsuitable for the requested EU scope.

### P1 — Deleting an account can remove other group members' conversation history

Group creation stores its creator in both legacy participant columns (`api-server/src/repositories/message-repository.ts:140`). Both foreign keys cascade on user deletion (`lib/db/src/schema/index.ts:182`), then conversation deletion cascades to messages. Group messages also use an arbitrary other member as a cascading legacy recipient (`services/message-service.ts:156`, schema `:199`). Account deletion deletes the user row (`services/account-service.ts:160`).

This is now reproduced against the current production migration in a fresh PostgreSQL 16.4 cluster on `127.0.0.1:55437`, database `yor_global_readiness_20261007`. The probe uses the actual `AccountService`, `UserRepository` and `ConversationRepository`, stubbed Redis, and synthetic raw message fixtures. Deleting the creator left both other users present but removed the conversation and both of their messages. Separately, deleting a noncreator legacy recipient preserved the group but removed its surviving owner's message; another member's contribution remained. Actual foreign-key inspection confirmed all three legacy participant/recipient references use `ON DELETE CASCADE`. The probe exited 0 because it successfully reproduced the defect; no repair is claimed.

The database's address, port, name and empty public schema were checked before the production migration, which exited 0. An initial identity guard compared an `inet` string without normalising its host representation and refused to proceed; the corrected `host(inet_server_addr())` check passed before migration. No application/production database or provider was accessed. The temporary cluster was stopped and its port verified closed after the probe; fixture data and `cascade-probe.mjs`, `cascade-result.json`, `cascade-probe.log` and `cascade-migration.log` are retained under the external evidence directory.

Required acceptance after repair: create a three-member group, delete its creator and separately delete the legacy recipient, and verify the approved handling of surviving members' conversation and contributions. Define shared-history retention and anonymisation before changing the schema; preservation is subject to the applicable rights/retention model.

### P1 — Monitoring configuration is incompatible with the pinned Alertmanager

`docker-compose.production.yml:226` pins `prom/alertmanager:v0.28.1` and `:229` passes `--config.expand-env`. That flag is absent from the pinned release's [official command-line registrations](https://github.com/prometheus/alertmanager/blob/v0.28.1/cmd/alertmanager/main.go#L137-L174). The mounted webhook file also contains literal environment placeholders (`ops/prometheus/alertmanager.yml:14`); its [configuration loader](https://github.com/prometheus/alertmanager/blob/v0.28.1/config/config.go#L190-L224) reads and parses the file without environment expansion.

This establishes a source incompatibility; container startup failure was not observed locally. Required acceptance: supported configuration rendering without disclosing credentials, successful pinned-container startup, and delivery/resolution of a test alert to the actual authorised receiver.

### P1 — Readiness does not detect failure of the required lifecycle worker

Readiness checks only the notification heartbeat (`api-server/src/routes/health.ts:43`); diagnostics has the same limitation. Lifecycle work includes media cleanup, account-session cleanup and payment handlers (`workers/lifecycle-worker.ts:37`). The returned lifecycle health state is not consumed (`:79`). Existing notification/feed metrics and manual failed-payment views do not supply lifecycle heartbeat, cleanup backlog or dead-letter alerts.

Required acceptance: stopped/stalled lifecycle work is visible through readiness or a deliberately separate operational health signal, overdue/dead cleanup jobs trigger actionable alerts, and recovery is demonstrated without losing durable jobs. CI's API-readiness smoke currently misses this failure mode.

### P1 — Three age experiences and global legal operations are not implemented

Current age authority is a confirmation timestamp/checkbox; existing registrations default to public profiles and unrestricted contact. Mature-content preference has no verified-age ceiling. Follow/block rules do not establish approved minor contacts or guardian authorisation. Payment eligibility does not implement the proposed age/territory restrictions. Browser telemetry consent does not establish a server purpose-consent decision.

The [age and privacy design](superpowers/specs/2026-10-07-global-age-consent-design.md) is a draft awaiting human review. It specifies territory-aware assessment, parental authorisation, private defaults, contact acceptance, restricted identity sessions and enforcement across HTTP/sockets/media. No product implementation is claimed.

The later workstreams remain outstanding: full data-rights coverage and deadlines; retention/backup deletion and justified holds; enforced moderation decisions, reasons and applicable reviews/appeals; accurate operator/processor/transfer notices; child-readable terms; applicable commerce/AI/accessibility obligations; and country-specific acceptance. The existing fixed grievance deadlines, row-only status updates and newest-200 staff queues do not establish these operations.

The [initial jurisdiction intake](GLOBAL_REGULATORY_INTAKE_2026-10-07.md) records primary-source research for EU, US, UK, Australia, Canada/Quebec, Brazil and India. It distinguishes active and phased rules and highlights ages that do not match the three product bands. It does not approve availability in those territories or exhaust every jurisdiction.

## Additional confirmed defects

| Priority | Finding and reference | Required acceptance |
| --- | --- | --- |
| P2 | Same-origin Caddy → Nginx → API has two proxy hops but Express trusts one (`ops/Caddyfile.example:5`, `social/nginx.conf:23`, `api-server/src/app.ts:19`). An isolated address-resolution calculation returned the proxy address. | Distinct clients retain distinct IP limits through the selected real topology; forwarded headers cannot spoof identity. The runbook's separate API hostname avoids this specific issue. |
| P2 | Notification jobs retain completed payloads indefinitely (`workers/notification-worker.ts:25`, `services/queue-service.ts:72`); no completed-job pruning path was found. | Bounded Redis retention while preserving durable recovery, deduplication and account-deletion behavior. |
| P2 | Concurrent reactions read and replace the entire JSON column (`services/message-service.ts:323`, `repositories/message-repository.ts:102`). An in-memory two-member probe lost one reaction. | Concurrent distinct reactions both survive; repeated same-user reactions remain idempotent. |
| P2 | A pre-existing working-copy edit removed the Studio manual stop button. The remaining “Record video” shutter is disabled during recording (`social/src/components/studio/StudioCameraModal.tsx:499`), while only the timer invokes `handleStopRecording`. | Restore an accessible manual stop action, prevent a second recording start, and pass the existing camera capture/recording browser case. No source change was made by this review. |

## Release evidence still required

The following are unknown, not accepted:

- Actual operating entity, EU member state, business-size/applicability assessment, responsible contacts and approved country/feature registry.
- Approved age and parental-responsibility assurance methods, provider agreements, minimisation and reassessment procedures.
- Processing inventory, legal bases, purpose consent, processor/transfer assessments, applicable risk assessments and documented retention/rights operations.
- Real media classification/storage acceptance with `details.media.ready=true`; the synthetic CI gate deliberately cannot establish it.
- Public deployment DNS/TLS, cookie/session behavior, realtime delivery, reverse-proxy identity, provider callbacks and disabled-feature enforcement.
- Encrypted off-host backup retrieval and isolated restore, measured against agreed recovery objectives; backup image execution is absent from current CI smoke.
- Monitoring health, alert delivery, incident ownership, moderation staffing and urgent safety escalation drills.

Payments, live rooms, push and RTC retain their existing disabled release gates until separately accepted. HLS remains an explicit unsupported route (501), and phone OTP returns 410; do not advertise either as implemented.

## Review boundary

This artifact and the updated draft specification record findings. They do not repair product code, approve a country policy, enable a feature, deploy the app or certify it as production ready. The architectural workflow is awaiting approval of the saved specification before implementation planning. Subsequent implementation must use scoped commits and pushes and preserve unrelated changes.
