# Release gate status

**17 October 2026 — BLOCKED / NO-GO.** PR [#25](https://github.com/yorayriniwnl/yor-talksv2/pull/25) remains restricted. Technical repairs and synthetic verification do not authorize a public release. The current task authorizes preparation and a reviewable GitHub change, not deployment, production-data changes, or paid provider settings.

This is the current gate index. The [programme audit](PROGRAMME_COMPLETION_AUDIT_2026-10-16.md), [readiness review](PRODUCTION_READINESS_REVIEW_2026-10-07.md) and [launch runbook](PRODUCTION_LAUNCH.md) retain their detailed evidence and procedures. The new compliance/security/test evidence documents must be read alongside these gates; a code test cannot supply an operator's legal identity or approve a provider.

| Gate | State | Evidence needed to close it |
| --- | --- | --- |
| Exact release revision and hosted CI | In progress | Reviewable current commit/PR, reconciled latest default branch and PR #25, passing hosted checks for that exact revision; classify current failures by actual logs. GitHub is authenticated for the authorized repository work. Historical/local results are not current hosted acceptance. |
| Operator and EU territory | External blocker | Selected Member State, legal entity/size, genuine approved operator address, privacy/support/grievance contacts, governing law, applicable duties and accountable reviewers. Do not invent these facts. |
| Public policies and legal review | External blocker | Approved exact Privacy/Terms/Community/storage/refund and copyright/rights wording, version/effective date and actual retention/processor practices. Keep legal review false in the production example until approval. |
| Age/guardian assurance and territory registry | Implementation and external blocker | Actual approved provider method, threshold/guardian purposes and operator/recipient policies with recorded authority. Empty production registry and unavailable adapter must continue to deny activation. No minor-facing rollout is authorized. |
| Moderation actions and private decision/review workflow | Implementation blocker | Persisted/enforced staff actions and reversals, private decision notices and linked review; staffed triage/escalation and safety drills. Resolving a case alone is not a removal decision. See programme audit. |
| Rights/retention and backup erasure recovery | Implementation and external blocker | Approved retention/holds, broader rights handling and verified recovery/erasure replay so restoring an older backup does not reintroduce erased records. Existing owner export/deletion/media cleanup does not complete the broader programme. |
| Hosting/backend/workers | External blocker | Approved persistent API/Socket.IO/worker host and region, isolated DB/Redis, operational identities/secrets, migrations, rollback and resource acceptance. Vercel web/function output does not establish durable background workers or realtime. |
| Domains, TLS and sessions | External blocker | Actual DNS/TLS, public web/API/realtime origins, secure cookie/CORS/proxy behavior and reconnect/revocation acceptance. Local loopback smoke is synthetic evidence only. |
| Google and transactional email | External blocker | Real authorized OAuth origins/client, verified Resend sender/domain DNS, deliverability and recovery/verification behavior, provider terms/retention and privacy acceptance. No marketing service is enabled. |
| Managed media and text safety | External blocker | Real storage/preset/byte-limit/decoder/moderation acceptance with clean/reject/uncertain/outage cases, cleanup retries and CDN invalidation. HLS remains unavailable until a separate packager exists. |
| Optional paid/live/push/RTC/AI features | Held disabled | Separate product/provider/safety acceptance, accurate prices/fees/tax/terms/refund conditions, provider transaction/replay/refund/settlement tests and browser permission controls. Credentials alone cannot enable acceptance. |
| Monitoring and incident response | External blocker | Actual authenticated scrapes and received/routed alerts, named response owner, lifecycle/queue/DB outage drills and log/access/retention rules. Local config rendering is not alert-delivery proof. |
| Off-host backup and key custody | External blocker | Encrypted remote-object durability/version/retention proof, restored isolated production-compatible database, measured recovery time, offline identity custody and lost-key/erasure drill. A local rclone alias cannot prove off-host durability. |
| Accessibility | Verification gate | Current route/viewport/theme/keyboard/contrast/reduced-motion automation plus representative screen-reader/manual acceptance. Record limits in the accessibility audit; do not claim general WCAG conformance. |
| Third parties and asset licenses | External and verification gate | Provider purpose/basis/permissions/retention/transfer records, unresolved package licenses and release notice bundle; exact font/image/icon/sound provenance, attribution and permission. See [SDK audit](THIRD_PARTY_SDK_AUDIT.md) and [asset register](ASSET_PROVENANCE_REGISTER.md). |
| Vercel integration | External authorization gate | Actual project/root settings, backend routing, integration access/permissions and accepted preview/security headers. No integration authorization or publication was fabricated. |

A read-only public probe on 17 October observed the current `https://yor-talks.vercel.app` shell and `/privacy` returning HTML with the existing static security headers but no CSP header. `/api/healthz` returned HTTP 500, and the Socket.IO polling URL returned the SPA HTML shell rather than a transport response. These observations are release blockers for the visible deployment, not evidence that local repairs are deployed. No account, private record or production setting was modified. Vercel account/integration inspection is currently unavailable; a prior authorization error is not being presented as a fresh check.

GitHub access is available for repository/PR/Actions review. The historical PR #25 head's successful workflow does not supersede its draft/conflict/block status or prove acceptance of the current worktree. Record the exact new commit and its new hosted workflow before closing the CI gate.

## Technical corrections verified during preparation

Production Compose passes API schema keys, restricts PostgreSQL/Redis to its internal network and binds web/API to loopback behind the public TLS proxy. The API/migration process is unprivileged with a read-only root filesystem and dropped capabilities. Metrics/password consumers receive only the dedicated secret-reader group; the one-shot Alertmanager renderer has no network or secrets. Secret permission checks use synthetic Linux volumes, never actual credentials.

The web image now declares the public VAPID key that Compose supplies; the wiring check requires every Compose frontend argument to reach Docker's build environment. Both Vercel configurations include static response protections and no-store service-worker headers. Built HTML receives the same exact API/realtime/LiveKit origin CSP as Nginx, with frame-ancestor protection supplied by the HTTP header. Signed direct Cloudinary uploads have their exact allowed connection origin.

Backup verification/restore now remove temporary decrypted data on error, interruption and success, and restore refuses existing relations in any non-system schema. Deterministic failure regressions and the synthetic encrypted round-trip exercise these guards. Current isolated image/runtime results must still be recorded for the final revision before treating the container gate as passed.

CI now audits all dependency scopes because shipped browser packages are also declared as development dependencies. The 17 October all-scope advisory result reports no known vulnerabilities; this does not replace hosted CI, container scanning or provider acceptance. Tests interrupted by local memory exhaustion must be rerun and must not be counted as passing.

## Production environment inventory (names only)

This inventory is derived from the API schema, production Compose interpolation, frontend Docker arguments/browser source, DB/migration code and backup tools. It records names and consumers only. **Every `VITE_*` value is public build output; never place a credential there.** `CSP_LIVEKIT_URL` is a public origin used to construct the policy, not an API secret. File variables identify externally protected secret files, not their contents. The production example intentionally remains incomplete and legal/provider gates remain fail closed.

`DB_CONNECT_TIMEOUT_MS` and `DB_MAINTENANCE_WORK_MEM` are direct DB/migration controls outside the API's Zod schema. `VITE_TELEMETRY_URL` and `VITE_TELEMETRY_SAMPLING` are additional browser source inputs outside production Compose; leave optional collection disabled and do not introduce an unapproved collector. The `YOR_FEATURE_*` overrides supplement the advanced-feature default. Platform/internal runtime names are included for completeness and are not instructions to populate every name manually.

| Variable name | Source / consumer |
| --- | --- |
| `AI_COMPANION_ENABLED` | API schema; Production Compose input |
| `ALERTMANAGER_WEBHOOK_PASSWORD_FILE` | Production Compose input |
| `ALERTMANAGER_WEBHOOK_URL` | Production Compose input |
| `ALERTMANAGER_WEBHOOK_USER` | Production Compose input |
| `ALLOWED_EMAIL_DOMAINS` | API schema; Production Compose input; API/DB runtime outside schema |
| `API_HOST_PORT` | Production Compose input |
| `API_PORT` | API/DB runtime outside schema |
| `AUTH_COOKIE_SAME_SITE` | API schema; Production Compose input; API/DB runtime outside schema |
| `BACKUP_AGE_IDENTITY` | Backup runtime |
| `BACKUP_AGE_RECIPIENT` | Production Compose input |
| `BACKUP_DIR` | Backup runtime |
| `BACKUP_LOCAL_RETENTION_DAYS` | Production Compose input |
| `BACKUP_METRICS_FILE` | Backup runtime |
| `BACKUP_REMOTE` | Production Compose input |
| `CLIENT_ORIGIN` | API schema; Production Compose input; API/DB runtime outside schema |
| `CLOUDINARY_API_KEY` | API schema; Production Compose input; API/DB runtime outside schema |
| `CLOUDINARY_API_SECRET` | API schema; Production Compose input; API/DB runtime outside schema |
| `CLOUDINARY_CLOUD_NAME` | API schema; Production Compose input; API/DB runtime outside schema |
| `CLOUDINARY_MEDIA_AUDIO_PRESET` | API schema; Production Compose input |
| `CLOUDINARY_MEDIA_IMAGE_PRESET` | API schema; Production Compose input |
| `CLOUDINARY_MEDIA_VIDEO_PRESET` | API schema; Production Compose input |
| `CONTACT_SHIELD_SECRET` | API schema; Production Compose input; API/DB runtime outside schema; lib/db/scripts/migrate-beta.mjs; lib/db/scripts/migrate-production.mjs |
| `CORS_ORIGINS` | API schema; Production Compose input; API/DB runtime outside schema |
| `CSP_LIVEKIT_URL` | Web build |
| `DATABASE_URL` | API schema; Production Compose input; API/DB runtime outside schema; lib/db/scripts/migrate-beta.mjs; lib/db/scripts/migrate-production.mjs |
| `DB_CONNECT_TIMEOUT_MS` | API/DB runtime outside schema; DB runtime/migrations |
| `DB_MAINTENANCE_WORK_MEM` | lib/db/scripts/migrate-beta.mjs; DB runtime/migrations |
| `DB_SSL` | Production Compose input; API/DB runtime outside schema; lib/db/scripts/migrate-beta.mjs; lib/db/scripts/migrate-production.mjs; DB runtime/migrations |
| `DB_SSL_REJECT_UNAUTHORIZED` | Production Compose input; API/DB runtime outside schema; lib/db/scripts/migrate-beta.mjs; lib/db/scripts/migrate-production.mjs; DB runtime/migrations |
| `ELIGIBILITY_ASSURANCE_ADAPTER` | API schema; Production Compose input |
| `ELIGIBILITY_POLICY_SOURCE` | API schema; Production Compose input |
| `EMAIL_FROM` | API schema; Production Compose input; API/DB runtime outside schema |
| `GEMINI_API_KEY` | API schema; Production Compose input; API/DB runtime outside schema |
| `GOOGLE_CLIENT_ID` | API schema; Production Compose input; API/DB runtime outside schema |
| `GRIEVANCE_CONTACT_EMAIL` | API schema; Production Compose input; API/DB runtime outside schema |
| `GRIEVANCE_OFFICER_NAME` | API schema; Production Compose input; API/DB runtime outside schema |
| `JWT_REFRESH_SECRET` | API schema; Production Compose input; API/DB runtime outside schema |
| `JWT_SECRET` | API schema; Production Compose input; API/DB runtime outside schema |
| `LEGAL_CONTENT_REVIEWED` | API schema; Production Compose input |
| `LEGAL_EFFECTIVE_DATE` | API schema; Production Compose input; API/DB runtime outside schema |
| `LEGAL_GOVERNING_LAW` | API schema; Production Compose input; API/DB runtime outside schema |
| `LEGAL_OPERATOR_ADDRESS` | API schema; Production Compose input; API/DB runtime outside schema |
| `LEGAL_OPERATOR_NAME` | API schema; Production Compose input; API/DB runtime outside schema |
| `LIVE_ROOMS_ENABLED` | API schema; Production Compose input |
| `LIVEKIT_API_KEY` | API schema; Production Compose input; API/DB runtime outside schema |
| `LIVEKIT_API_SECRET` | API schema; Production Compose input; API/DB runtime outside schema |
| `LIVEKIT_URL` | API schema; Production Compose input; API/DB runtime outside schema |
| `LOG_LEVEL` | Production Compose input; API/DB runtime outside schema |
| `MEDIA_DECODE_CONCURRENCY` | API schema; Production Compose input |
| `MEDIA_DECODE_TIMEOUT_MS` | API schema; Production Compose input |
| `MEDIA_DELIVERY_ORIGIN` | API schema; Production Compose input |
| `MEDIA_FFMPEG_PATH` | API schema; Production Compose input |
| `MEDIA_FFPROBE_PATH` | API schema; Production Compose input |
| `MEDIA_GEMINI_MODEL` | API schema; Production Compose input |
| `MEDIA_MODERATION_TIMEOUT_MS` | API schema; Production Compose input |
| `MEDIA_PROVIDER_TIMEOUT_MS` | API schema; Production Compose input |
| `MEDIA_SIGNED_URL_TTL_SECONDS` | API schema; Production Compose input |
| `MEMBERSHIPS_ENABLED` | API schema; Production Compose input |
| `METRICS_BEARER_TOKEN_FILE` | API schema; Production Compose input; API/DB runtime outside schema |
| `NODE_ENV` | API schema; API/DB runtime outside schema |
| `OPENAI_API_KEY` | API schema; Production Compose input; API/DB runtime outside schema |
| `PAYMENT_EVENT_ENCRYPTION_KEY` | API schema; Production Compose input |
| `PAYMENTS_ENABLED` | API schema; Production Compose input |
| `PORT` | API schema; API/DB runtime outside schema |
| `POSTGRES_DB` | Production Compose input |
| `POSTGRES_PASSWORD` | Production Compose input |
| `POSTGRES_USER` | Production Compose input |
| `PRIVACY_CONTACT_EMAIL` | API schema; Production Compose input; API/DB runtime outside schema |
| `PUBLIC_BETA` | API schema; Production Compose input |
| `RAZORPAY_ACCOUNT_ID` | API schema; Production Compose input |
| `RAZORPAY_KEY_ID` | API schema; Production Compose input; API/DB runtime outside schema |
| `RAZORPAY_KEY_SECRET` | API schema; Production Compose input; API/DB runtime outside schema |
| `RAZORPAY_WEBHOOK_SECRET` | API schema; Production Compose input; API/DB runtime outside schema |
| `RCLONE_CACHE_DIR` | Backup runtime |
| `RCLONE_CONFIG` | Backup runtime |
| `RCLONE_CONFIG_FILE` | Production Compose input |
| `REDIS_PASSWORD` | Production Compose input |
| `REDIS_URL` | API schema; API/DB runtime outside schema |
| `RESEND_API_KEY` | API schema; Production Compose input; API/DB runtime outside schema |
| `RTC_CALLS_ENABLED` | API schema; Production Compose input |
| `SECRET_READER_GID` | Production Compose input |
| `SELLER_ENABLED` | API schema; Production Compose input |
| `SUPPORT_EMAIL` | API schema; Production Compose input; API/DB runtime outside schema |
| `TERMS_VERSION` | API schema; Production Compose input; API/DB runtime outside schema |
| `TMPDIR` | Backup runtime |
| `TOTP_ENCRYPTION_KEY` | API schema; Production Compose input; API/DB runtime outside schema |
| `VERCEL` | API/DB runtime outside schema |
| `VITE_API_BASE_URL` | Production Compose input; Web build; Browser source |
| `VITE_GOOGLE_CLIENT_ID` | Production Compose input; Web build; Browser source |
| `VITE_GRIEVANCE_CONTACT_EMAIL` | Web build; Browser source |
| `VITE_GRIEVANCE_OFFICER_NAME` | Web build; Browser source |
| `VITE_LEGAL_CONTENT_REVIEWED` | Web build; Browser source |
| `VITE_LEGAL_EFFECTIVE_DATE` | Web build; Browser source |
| `VITE_LEGAL_GOVERNING_LAW` | Web build; Browser source |
| `VITE_LEGAL_OPERATOR_ADDRESS` | Web build; Browser source |
| `VITE_LEGAL_OPERATOR_NAME` | Web build; Browser source |
| `VITE_LIVE_ROOMS_ENABLED` | Web build; Browser source |
| `VITE_PAYMENTS_ENABLED` | Web build; Browser source |
| `VITE_PRIVACY_CONTACT_EMAIL` | Web build; Browser source |
| `VITE_PUBLIC_BETA` | Web build; Browser source |
| `VITE_PUBLIC_ORIGIN` | Production Compose input; Web build |
| `VITE_REALTIME_ENABLED` | Production Compose input; Web build; Browser source |
| `VITE_REALTIME_URL` | Production Compose input; Web build; Browser source |
| `VITE_RTC_CALLS_ENABLED` | Web build; Browser source |
| `VITE_RTC_ICE_SERVERS` | Production Compose input; Web build; Browser source |
| `VITE_SUPPORT_EMAIL` | Web build; Browser source |
| `VITE_TELEMETRY_SAMPLING` | Browser source |
| `VITE_TELEMETRY_URL` | Browser source |
| `VITE_TERMS_VERSION` | Web build; Browser source |
| `VITE_WEB_PUSH_ENABLED` | Web build; Browser source |
| `VITE_WEB_PUSH_VAPID_PUBLIC_KEY` | Web build |
| `WEB_PORT` | Production Compose input |
| `WEB_PUSH_ENABLED` | API schema; Production Compose input |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | API schema; Production Compose input; API/DB runtime outside schema |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | API schema; Production Compose input; API/DB runtime outside schema |
| `WEB_PUSH_VAPID_SUBJECT` | API schema; Production Compose input; API/DB runtime outside schema |
| `YOR_ADVANCED_DEFAULT_ENABLED` | Production Compose input |
| `YOR_FEATURE_CUSTOM_APP_ICON` | Production Compose input |
| `YOR_FEATURE_CUSTOM_BIO_FONT` | Production Compose input |
| `YOR_FEATURE_CUSTOM_STORY_AUDIENCE` | Production Compose input |
| `YOR_FEATURE_DIRECT_HIGHLIGHT` | Production Compose input |
| `YOR_FEATURE_EXTENDED_STORY` | Production Compose input |
| `YOR_FEATURE_MESSAGE_FONT` | Production Compose input |
| `YOR_FEATURE_MESSAGE_UNREAD_PREVIEW` | Production Compose input |
| `YOR_FEATURE_PROFILE_ONLY_POST` | Production Compose input |
| `YOR_FEATURE_SIX_PINNED_POSTS` | Production Compose input |
| `YOR_FEATURE_STORY_FONT` | Production Compose input |
| `YOR_FEATURE_STORY_PRIORITY` | Production Compose input |
| `YOR_FEATURE_STORY_PRIVATE_VIEW` | Production Compose input |
| `YOR_FEATURE_STORY_REWATCH_ANALYTICS` | Production Compose input |
| `YOR_FEATURE_STORY_VIEW_TIMESTAMPS` | Production Compose input |
| `YOR_FEATURE_SUPER_HEART` | Production Compose input |
| `YOR_PREMIUM_DURATION_DAYS` | API schema; Production Compose input |
| `YOR_PREMIUM_ENABLED` | API schema; Production Compose input |
| `YOR_PREMIUM_PRICE_MINOR` | API schema; Production Compose input |
| `YOR_PREMIUM_REFUND_POLICY` | API schema; Production Compose input |
| `YOR_PREMIUM_TERMS_VERSION` | API schema; Production Compose input |

