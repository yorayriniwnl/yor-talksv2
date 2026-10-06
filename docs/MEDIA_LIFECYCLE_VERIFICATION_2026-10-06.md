# Verified media lifecycle continuation — 6 October 2026

## Source and delivery

- Audited remote baseline: `608746f2594b09bc2508fc1bfaefeb11954935a8`.
- Earlier continuation starting SHA: `d98871fea275143d7c9140074bc7a9d86806b6e3`. This resumed request started at `f3ca64d2afb0a895a46437a8a24b0697e4d40a45`.
- All ten newer local implementation/security commits, the unfinished documentation, and the existing TOTP regression change were retained and critically audited. The earlier named `v3` stash remains intact.
- Earlier scoped source commits: `4376d81` (production dependency patches), `d5c5656` (durable metadata and missing-upload classification), `f3ca64d` (browser upload and message delivery recovery). Resumed fixes are `bb17c01` (deterministic real TOTP test epoch), `763d020` (typed approved-avatar delivery), `3524a2e` (current finalize reservation, decoder timeout and deletion lease ownership), and `e6d210b` (acknowledged Highlight reuse after failed Story publication).
- Final SHA and direct CI run URL are recorded in the task handoff. A document cannot embed its own final commit hash without changing that hash.
- Delivery uses the isolated `codex/media-lifecycle-20261006` verification branch. Remote `main` remains at the audited baseline; no merge or public deployment is part of this verification.

## Changes and schema

The existing complete media lifecycle was independently audited and retained. The continuation adds durable `media_assets.provider`, constrained to the currently supported Cloudinary provider, and nullable `finalized_at` through additive migration `20261006-media-3`. Newly approved/permanently rejected assets record finalization once. Duplicate finalization and deletion preserve that timestamp; historical unknown timestamps remain NULL. Existing URL fields are preserved.

The full baseline-to-candidate change adds `media_assets` and `media_references`, structured nullable message attachment columns (`media_id`, `media_url`, `media_type`, `media_duration`, `media_legacy`), a nullable community cover, reference/entity/account/message cleanup triggers, approval/provider constraints and owner/cleanup/reference indexes. Migration markers v1/v2/v3 are idempotent. The historical message classifier runs once with the original deployment cutoff; it creates no approved assets and does not rewrite message bodies or legacy URLs.

The actual state names are `pending` (pending upload), `uploaded`/`verifying` (pending verification/moderation), `approved`, `rejected`, retryable non-publishable `failed`, and revoked `deleted` with separate `deletion_status=pending/deleted` and deletion lease/backoff metadata. Moderation decisions remain in `moderation_json` after revocation.

The resumed audit introduces no further schema changes. Finalization now uses the row returned by its successful lease claim, including any digest/provider identity committed after its first read. Deletion renews the currently owned token immediately before each provider call, skips stolen tokens and counts only committed results. Decoder timeouts remain retryable; invalid or excessive decoder output remains a permanent rejection. Typed follow/requester/call/Story-viewer DTOs now mint grants only for approved referenced avatars. Story retry retains its acknowledged Highlight destination, approved voice/cover IDs, original files and caption.

Direct upload retries first finalize the same owner reservation after a lost acknowledgement. Another provider write requires `media_upload_not_found` from an initial lookup 404 with no previously verified identity. Generic storage errors, vanished verified identities, moderation failures, rejected/malformed results and session changes cannot authorize a rewrite. Message delivery renews through an authenticated one-row history read, checks the exact tuple, and preserves captions, history, composer drafts and audio state. One CSS property keeps older messages within the reachable scroll area.

## API operations and content boundaries

The generated contract contains **231 operations on 195 paths** and remains synchronized. The continuation changes one existing machine error code; it adds no routes or response-envelope shape changes.

| Operation | Contract |
| --- | --- |
| `POST /media/presign` | Authenticated preparation; server ID, purpose, declared MIME/size and exact signed provider identity; bounded server transport when direct restrictions cannot be proven |
| `POST /media/:id/upload` | Bounded owner-bound multipart transport for a prepared reservation; exact bytes/hash acknowledge safely on retry |
| `POST /media/:id/finalize` | Authenticated empty-body, owner-bound, leased verification/moderation; idempotent approved/rejected result; 202 for active verification; `media_upload_not_found` is a retryable 502 |
| `DELETE /media/:id` | Revoke an unused owned asset and retain retryable provider cleanup state |
| `GET /media/:id/content` | Expiring API delivery grant; current approval/deletion/hash validation, bounded audio/video ranges and verified video poster |
| `POST /media/upload`, `POST /posts/upload-image`, `POST /users/me/avatar` | Compatibility transports through the same lifecycle and explicit approval |
| `GET /media/:id/hls` | Still 501: HLS packaging/transcoding is outside this implementation |

New uploaded media uses approved IDs at posts/comments, Stories/highlights, avatars/profile covers/showcases, direct/group image/voice messages, videos/video comments, products, articles, events, stream/channel covers, businesses and communities. Content and media references commit atomically. The intentionally separate external video mode validates HTTPS and an explicit host policy and still requires an approved thumbnail. Legacy URL-only content remains readable without becoming approved or reusable as new uploaded media.

## Security invariants and test coverage

1. Server-chosen ID, owner, purpose, public ID, resource family and authenticated storage identity; strict request bodies cannot forge them.
2. Purpose-specific declared limits and actual provider identity, byte size, MIME/container, SHA256, decoded tracks/dimensions/duration; identity is checked again after moderation.
3. Dedicated multimodal Gemini moderation has strict structured parsing/timeouts. Missing configuration, errors, blocked/malformed/uncertain/contradictory results fail closed. Only explicit approval publishes.
4. Transactional publication locks and checks ownership, approval, purpose and type. Pending/rejected/foreign/wrong-purpose assets and arbitrary uploaded URLs cannot be attached.
5. API delivery rechecks approval, revocation and original digest; provider URLs are internal. Browser success requires server approval, and drafts/files survive retries.
6. Rejection, stale pending assets, expiry/vanish, content/account deletion and last-reference removal revoke first. Durable cleanup leases, retry metadata, tombstones and separate reference checks protect failed deletion/replay/concurrent publication.
7. Existing auth/session/payment/Premium behavior and original security assertions remain. No unconditional skip or weakened assertion was introduced.

The original `media-security.test.ts` failure-closed assertion is preserved and expanded to six cases, including normal image/audio/video persistence, immutable finalization, unavailable/contradictory moderation, permanent rejection, missing provider configuration and retryable absent upload. Existing adversarial suites cover forged identities, MIME/size, wrong owner/purpose, pending/rejected publication, timeouts/malformed decisions, duplicate/concurrent finalization, delivery revocation, provider deletion retry, stale cleanup, content/account deletion, expiry, legacy migration and reference races. Additional provider regressions distinguish first lookup absence from outages and verified-object loss. Thirteen media-client cases include both upload transports, ambiguous responses, generic failures, exact message cursor bounds, denied/malformed grants and session races. Browser cases retain real seeking/draft/history/approval assertions.

## Validation commands and results

Local runtime: Node **24.19.0**, pnpm **9.15.9**, Windows PowerShell. CI uses the pinned repository pnpm **9.15.4**. Both frozen installs retain the synchronized lockfile. All local fixtures use new synthetic PostgreSQL **16.4**, UTC databases at `127.0.0.1:55436` and a dedicated synthetic Redis **5.0.14.1** instance at `127.0.0.1:56386/14`; CI verifies Redis **7** separately. Actual hash-verified FFmpeg/FFprobe are required by `MEDIA_REQUIRE_DECODER_TESTS=true`. API child environments remove provider credentials; browser Chromium blocks external DNS and fulfills API/provider fixtures. No live provider or production database operation occurred.

Earlier logs remain at `C:/Users/yoray/AppData/Local/Temp/yor-media-validation-20261006`. Resumed full-suite/migration/build evidence is at `C:/Users/yoray/AppData/Local/Temp/yor-media-recheck-20261006`; independent static evidence is in the adjacent `yor-media-recheck-20261006-static` directory. `api-tests-full-command.json` records the exact executable and all 69 enumerated test paths; TAP/results and per-command logs are retained. Fresh/repeated production and beta migrations and the full API run use the new synthetic `yor_media_recheck_20261006_2` database. PowerShell sets the listed environment variables before the commands.

| Gate | Exact command | Result |
| --- | --- | --- |
| Dependencies | `pnpm install --frozen-lockfile` | PASS after scoped remediation; lockfile synchronized |
| API generation | `pnpm contract:generate` | PASS; identical generated contents |
| API contract | `pnpm contract:check` | PASS; 231 operations / 195 paths |
| Design | `pnpm design:check` | PASS |
| Unit | `pnpm test:unit` | PASS: 57/57, zero skips |
| Database package | `pnpm --filter @workspace/db build` | PASS |
| Migration | `pnpm --filter @workspace/db migrate:production` | PASS fresh and repeated, new isolated synthetic databases; media v1/v2/v3 markers |
| Beta migration | `pnpm --filter @workspace/db migrate:beta` | PASS on the same isolated database after the production migration |
| API tests | `node --import tsx --test --test-reporter=tap --test-concurrency=1 <all 69 src/__tests__/*.test.ts paths>` from `api-server`, via retained `run-api-tests.mjs` | PASS: 262/262 test results across 257 top-level cases, zero skips/failures; 126.27 seconds |
| API types | `pnpm --filter @workspace/api-server typecheck` | PASS |
| Frontend types | `pnpm --filter @workspace/social typecheck` | PASS |
| Browser | `NODE_ENV=production CI=true PLAYWRIGHT_PORT=4178 pnpm test:e2e` | PASS: 60/60, zero retries/skips; 3.4 minutes |
| API production build | `NODE_ENV=production pnpm --filter @workspace/api-server build` | PASS |
| Frontend production build | `NODE_ENV=production pnpm --filter @workspace/social build` | PASS; existing bundle-size warnings |
| Production wiring | `pnpm production-config:check` | PASS; 64 schema keys |
| Compose | `docker compose --env-file ops/ci-production.env -f docker-compose.production.yml config --quiet` | PASS with standalone Compose 5.6.0 executable; isolation overlay also parses |
| Production audit | `pnpm audit --prod`; `pnpm audit --prod --json` | PASS; zero vulnerabilities at all severities, 340 production dependencies |
| Diff | `git diff --check` | PASS |

Initial audit failed with three critical and one high finding. Scoped patches are `proxy-addr` 2.0.8, `compression` 1.8.2 and Capacitor Android/iOS 8.5.2. See the primary [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [Capacitor advisory](https://github.com/advisories/GHSA-rvm3-566m-v7fv), and [compression advisory](https://github.com/advisories/GHSA-vc2v-76pw-4v95). No advisory exclusions were introduced.

The earlier initial API run passed 250/250, but its final rerun passed 249/250: the existing logout-all regression generated/checks a real TOTP code across a 30-second boundary and failed with `Invalid two-factor code`. Its unfinished fixture fix was preserved: only TOTP uses a fixed test epoch; JWT/challenge/Redis clocks and every security assertion remain real. Focused authentication tests passed 6/6, and the resumed full fresh-database run passed 262/262 after the additional media regressions. The earlier full browser run passed 57 and failed two: the new history geometry assertion exposed the fixed CSS bug, while an overlapping targeted rebuild replaced the first run's local JS/CSS and caused eight recorded 404s in the settings trace. Those logs/artifacts remain separate. Earlier final browser evidence passed 59/59. The resumed final full browser suite passed 60/60 with one build and zero retries. No failure was converted to a skip or hidden.

Resumed focused regressions demonstrated failing-to-passing behavior: five backend cases for the finalize race, delayed/stolen deletion leases, stale completion counts and decoder timeout classification; typed avatar DTO/grant cases; and Story retry duplication. Both affected backend files passed 36/36 with required actual decoders, the complete publication file passed 19/19, and the Story browser regression passed 1/1. Its initial selector-only failure was corrected before reproducing the actual two-Highlight defect. The separate final-review agent stopped at an account usage limit; its partial feedback is not counted as a completed independent review. Backend/publication audits completed, and the primary agent reviewed the complete final diff.

Two initial static PowerShell argument wrappers failed before the intended database-build/audit commands; corrected invocations passed and both failure logs are retained. A post-suite marker query initially found the temporary PostgreSQL service stopped after the long pause. Restarting only its isolated loopback cluster recovered it, and `psql -h 127.0.0.1 -p 55436 -U postgres -d yor_media_recheck_20261006_2 -c 'SELECT version FROM release_schema_versions ORDER BY version'` confirmed media v1/v2/v3. This was a diagnostic follow-up; fresh/repeated migrations and the complete API run had already exited successfully.

Focused commands also passed: `pnpm --filter @workspace/api-server exec tsx --test --test-concurrency=1 src/__tests__/media-security.test.ts src/__tests__/media-legacy-migration.integration.test.ts` (8/8 at that source), `node --test tests/media-client.test.mjs` (13/13), and production `pnpm test:e2e --grep 'older structured message image|message attachment renewal denies'` (2/2).

## Container gates and final CI acceptance

This Windows host has no Docker Engine/named pipe. The local production image build was attempted with the standalone Compose executable and failed with `open //./pipe/docker_engine: The system cannot find the file specified`. Local container startup and smoke are unavailable for that exact reason; Compose parsing and native builds passed. These container gates must execute in GitHub Actions against the final branch revision, not be waived.

| CI gate | Exact command / check |
| --- | --- |
| Isolated CI schema | `pnpm --filter @workspace/db migrate:beta` |
| Images | `docker compose --project-name yor-talks-ci-release --env-file ops/ci-production.env -f docker-compose.production.yml build migrate api web` |
| Container rehearsal | `WEB_PORT=127.0.0.1:18080 docker compose --project-name yor-talks-ci-release --env-file ops/ci-production.env -f docker-compose.production.yml -f ops/ci-provider-isolation.compose.yml up -d --no-build` |
| Readiness / smoke | `BASE_URL=http://127.0.0.1:18080 pnpm smoke`, healthy `/api/healthz` and `/api/readyz`, `details.media.decoder=true`, synthetic unavailable `details.media.ready=false` |
| Runtime assertions | Migrator exit 0; API user `node`; external provider DNS blocked; Cloudinary resolves to loopback; Redis rate-limit keys exist; no rate-limit initialization errors |

The production smoke uses unchanged production images with a test-only provider DNS isolation overlay. It tests startup/migrations/readiness/non-root execution/Redis limits without real Cloudinary, Gemini, OpenAI, payment or email requests. All repository-controlled gates, including the full audit, remain required. The historical successful [4 October CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37219328605) built and booted the production containers at `735c8b8`. The resumed [backend verification CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37447618522) passed every gate, including images and full container smoke, at `3524a2ec2a8e96078c67f66b1f8e27cdf409bca9`. Neither run certifies a later source change. The final handoff records the ending SHA, direct final run URL and checked conclusion; require its source-matching result and the [verification branch CI](https://github.com/yorayriniwnl/yor-talksv2/actions/workflows/ci.yml?query=branch%3Acodex%2Fmedia-lifecycle-20261006) for final acceptance.

## Remaining external release gates

- Review/apply the additive migration in the intended deployment under its operational change process; no production migration was run here.
- Configure/accept real Cloudinary signed authenticated presets/account ceilings, Gemini model/key safety decisions and fail-closed readiness. No real provider upload, moderation or cleanup was tested. Evaluate video sampling (5 FPS) against short unsafe scenes and audio.
- Accept the public runtime/domain/TLS, monitoring, durable cleanup operation and off-host backup/restore rehearsal. Synthetic containers do not establish a live deployment.
- Rebuild/redistribute patched native applications separately; native toolchain/platform acceptance was outside the requested browser/API gates.
- HLS remains unimplemented and explicitly returns 501. Legacy URL backfill/approval is not claimed.
- Legacy URL-only provider objects predate server-owned asset identities. Account deletion retains the existing `media_cleanup_holds`, but automatic cleanup of those arbitrary historical URLs has no consumer; deletion requires ownership/provider review. New staged assets use durable identity cleanup independently and never restore deleted content after provider errors.
- Optional payments/live/push/RTC remain subject to their existing external acceptance gates; their architecture was not rewritten.

No secrets or production credentials were introduced; examples and tests use synthetic values. The diff was reviewed for scope, unfinished TODO/FIXME and security assertion removal. Generated contracts remain synchronized. Repository validation and external production acceptance are reported separately; no production-readiness claim is made by this report.

## Complete changed-file manifest

Every file changed from audited baseline 608746f through this candidate is listed below, including the ten preserved implementation commits.

134 files:

- `.env.example`
- `.github/workflows/ci.yml`
- `api-server/.env.example`
- `api-server/Dockerfile`
- `api-server/package.json`
- `api-server/src/__tests__/auth-lifecycle.test.ts`
- `api-server/src/__tests__/beta-feature-gates.test.ts`
- `api-server/src/__tests__/disappearing-message.test.ts`
- `api-server/src/__tests__/event-service.test.ts`
- `api-server/src/__tests__/media-cleanup-loop.integration.test.ts`
- `api-server/src/__tests__/media-fixtures.ts`
- `api-server/src/__tests__/media-http.integration.test.ts`
- `api-server/src/__tests__/media-legacy-migration.integration.test.ts`
- `api-server/src/__tests__/media-lifecycle.integration.test.ts`
- `api-server/src/__tests__/media-provider-security.test.ts`
- `api-server/src/__tests__/media-publication.integration.test.ts`
- `api-server/src/__tests__/media-security.test.ts`
- `api-server/src/__tests__/payment-hardening.test.ts`
- `api-server/src/__tests__/product-analytics.integration.test.ts`
- `api-server/src/__tests__/product-service.test.ts`
- `api-server/src/__tests__/story-service.test.ts`
- `api-server/src/__tests__/story-text-style-domain.test.ts`
- `api-server/src/app.ts`
- `api-server/src/config/env.ts`
- `api-server/src/controllers/article-controller.ts`
- `api-server/src/controllers/broadcast-channel-controller.ts`
- `api-server/src/controllers/community-controller.ts`
- `api-server/src/controllers/event-controller.ts`
- `api-server/src/controllers/live-stream-controller.ts`
- `api-server/src/controllers/message-controller.ts`
- `api-server/src/controllers/post-controller.ts`
- `api-server/src/controllers/product-controller.ts`
- `api-server/src/controllers/story-controller.ts`
- `api-server/src/controllers/user-controller.ts`
- `api-server/src/controllers/video-controller.ts`
- `api-server/src/docs/routes.generated.ts`
- `api-server/src/middlewares/error-handler.ts`
- `api-server/src/repositories/message-repository.ts`
- `api-server/src/repositories/story-repository.ts`
- `api-server/src/routes/business.ts`
- `api-server/src/routes/health.ts`
- `api-server/src/routes/media.ts`
- `api-server/src/routes/profile-interactions.ts`
- `api-server/src/services/article-service.ts`
- `api-server/src/services/broadcast-channel-service.ts`
- `api-server/src/services/community-service.ts`
- `api-server/src/services/event-service.ts`
- `api-server/src/services/live-stream-service.ts`
- `api-server/src/services/media-byte-verification.ts`
- `api-server/src/services/media-delivery.ts`
- `api-server/src/services/media-moderation-service.ts`
- `api-server/src/services/media-provider.ts`
- `api-server/src/services/media-publication.ts`
- `api-server/src/services/media-readiness.ts`
- `api-server/src/services/media-response.ts`
- `api-server/src/services/media-service.ts`
- `api-server/src/services/message-service.ts`
- `api-server/src/services/post-service.ts`
- `api-server/src/services/product-service.ts`
- `api-server/src/services/profile-interaction-service.ts`
- `api-server/src/services/storage-service.ts`
- `api-server/src/services/story-service.ts`
- `api-server/src/services/user-service.ts`
- `api-server/src/services/video-service.ts`
- `api-server/src/socket/index.ts`
- `api-server/src/socket/policy.ts`
- `api-server/src/types/index.ts`
- `api-server/src/validators/article.ts`
- `api-server/src/validators/broadcast-channel.ts`
- `api-server/src/validators/business.ts`
- `api-server/src/validators/community.ts`
- `api-server/src/validators/event.ts`
- `api-server/src/validators/live-stream.ts`
- `api-server/src/validators/message.ts`
- `api-server/src/validators/post.ts`
- `api-server/src/validators/product.ts`
- `api-server/src/validators/profile.ts`
- `api-server/src/validators/story.ts`
- `api-server/src/validators/user.ts`
- `api-server/src/validators/video.ts`
- `api-server/src/workers/lifecycle-worker.ts`
- `docker-compose.production.yml`
- `docs/MEDIA_LIFECYCLE_IMPLEMENTATION.md`
- `docs/MEDIA_LIFECYCLE_VERIFICATION_2026-10-06.md`
- `docs/PRODUCTION_LAUNCH.md`
- `docs/PRODUCTION_READINESS.md`
- `e2e/core-social.spec.ts`
- `e2e/fixtures/delivery.wav`
- `e2e/fixtures/delivery.webm`
- `e2e/fixtures/README.md`
- `lib/api-spec/openapi.yaml`
- `lib/db/scripts/migrate-media.mjs`
- `lib/db/scripts/migrate-release.mjs`
- `lib/db/src/index.ts`
- `lib/db/src/schema/index.ts`
- `lib/db/src/schema/media.ts`
- `ops/.env.production.example`
- `ops/ci-provider-isolation.compose.yml`
- `package.json`
- `playwright.config.ts`
- `pnpm-lock.yaml`
- `README.md`
- `scripts/generate-api-contract.mjs`
- `social/package.json`
- `social/src/components/comments/RichCommentComposer.tsx`
- `social/src/components/feed/Post.tsx`
- `social/src/components/feed/StoryBuilderModal.tsx`
- `social/src/components/media/MediaImageField.tsx`
- `social/src/components/messages/MessageAttachment.tsx`
- `social/src/components/messages/VoiceNoteRecorder.tsx`
- `social/src/components/studio/StudioCameraModal.tsx`
- `social/src/components/video/ReelsSwiper.tsx`
- `social/src/components/video/ReelVideoPlayer.tsx`
- `social/src/lib/api-client.ts`
- `social/src/lib/media-upload.ts`
- `social/src/lib/message-delivery.ts`
- `social/src/lib/store.ts`
- `social/src/lib/uploader.ts`
- `social/src/lib/video-delivery.ts`
- `social/src/pages/articles.tsx`
- `social/src/pages/broadcast-channels.tsx`
- `social/src/pages/business-dashboard.tsx`
- `social/src/pages/clip-studio.tsx`
- `social/src/pages/events.tsx`
- `social/src/pages/live.tsx`
- `social/src/pages/marketplace.tsx`
- `social/src/pages/messages.tsx`
- `social/src/pages/post-detail.tsx`
- `social/src/pages/profile.tsx`
- `social/src/pages/settings.tsx`
- `social/src/pages/videos.tsx`
- `social/src/pages/worlds.tsx`
- `social/src/styles/operator-communications.css`
- `tests/media-client.test.mjs`

Files changed during this resumed request from f3ca64d:

- `api-server/src/__tests__/auth-lifecycle.test.ts`
- `api-server/src/__tests__/media-lifecycle.integration.test.ts`
- `api-server/src/__tests__/media-provider-security.test.ts`
- `api-server/src/__tests__/media-publication.integration.test.ts`
- `api-server/src/services/media-byte-verification.ts`
- `api-server/src/services/media-response.ts`
- `api-server/src/services/media-service.ts`
- `docs/MEDIA_LIFECYCLE_IMPLEMENTATION.md`
- `docs/MEDIA_LIFECYCLE_VERIFICATION_2026-10-06.md`
- `docs/PRODUCTION_LAUNCH.md`
- `e2e/core-social.spec.ts`
- `README.md`
- `social/src/components/feed/StoryBuilderModal.tsx`

