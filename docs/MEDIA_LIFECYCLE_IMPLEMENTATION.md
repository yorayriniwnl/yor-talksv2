# Production media lifecycle implementation

Current source-specific repairs and release gates are recorded in the
[8 October production hardening report](PRODUCTION_HARDENING_2026-10-08.md),
with frontend/browser evidence in the [focused report](hardening/frontend-grievance.md).
The implementation checkpoints and test counts below retain their original
dates; they do not establish real-provider or public-deployment acceptance.

Work is based on GitHub `main` revision `608746f2594b09bc2508fc1bfaefeb11954935a8`. Earlier `v3` audit work was preserved in the named stash `Preserve v3 audit remediation before main media lifecycle 2026-10-04`; it is not part of this change.

## Gaps established before implementation

Compared with [the intended design](superpowers/specs/2026-09-23-yor-talks-v2-media-moderation-design.md), the starting revision has unconditional production 503 responses; no pending assets, owner-bound completion, provider identity ledger or media-use references; incomplete provider signing/client parameters; MIME-family checks without purpose limits or decoded metadata; text-only moderation; arbitrary URL publication; voice/image messages encoded into text; base64 storage/fake video posters; and no owned, retryable provider cleanup.

## Security invariants

1. The server chooses asset IDs, provider paths, resource families and purposes. Clients cannot supply provider IDs, storage URLs, owners or approval state.
2. Provider objects remain authenticated. Credentials alone never allow publication.
3. Actual decoded content must satisfy purpose/MIME/size/dimension/duration policies. Client MIME, provider headers and widget checks are not security boundaries.
4. Finalization is owner-bound and idempotent, uses a durable lease and rechecks provider identity after moderation.
5. Only explicit, structurally valid moderation approval can produce `approved`; timeout/error/blocked/malformed/uncertain decisions fail closed.
6. Publication validates and locks approved owned assets and commits content plus references together. Slot replacement/removal releases references atomically.
7. Legacy URLs remain readable without being approved or reusable as new media. Arbitrary free text cannot be hydrated into a signed delivery URL.
8. Cleanup persists identity after account deletion and retries rejected/abandoned/unreferenced objects, wrong-resource-type replays and late direct uploads.
9. Other production security gates and disabled payment/live/push/RTC flags remain intact.

## Revalidation on 5 October 2026

`git pull --ff-only origin main` succeeded. GitHub main was still `608746f2594b09bc2508fc1bfaefeb11954935a8`; local main contained the two previously validated implementation commits through `735c8b8`. The current routes, storage/moderation adapters, publication consumers, migration, workers and client behavior were reviewed again against the design and plan. The existing implementation was retained rather than rebuilding it from the plan's stale unchecked tasks.

The focused review confirmed four remaining gaps:

- The original legacy classifier missed the actual historical `[Voice Note] URL (duration)` producer and image attachments following a newline/caption. The one-time `20261005-media-2` repair recognizes these without creating assets or approval. Already migrated databases use the original deployment cutoff for both creation and edit timestamps; later imitation text cannot acquire legacy attachment status.
- Uploaded videos opened after their expiring delivery grants had elapsed could fail until a page reload. Playback and posters now request a fresh view through the existing authorized video-read endpoint, preserve the same entity/owner/asset, and bound automatic retries. Denial, unchanged URLs, session changes and unmounts cannot introduce a provider URL fallback. The file chooser and copy now match MP4/WebM and actual resolution limits.
- Mounted message images and voice notes also retained expired grants. Structured attachments renew through the authorized conversation read with an adjacent UUID cursor and a one-row limit, including messages beyond the latest history page. Renewal requires the same conversation, message, sender, media ID and type and a changed API grant; deleted, expired or legacy rows cannot renew. Local delivery state preserves captions, drafts and audio position/playback settings, ignores stale session/selection responses and allows one automatic attempt plus explicit retry.
- `pnpm audit --prod` found one high and five moderate advisories. Scoped patch versions are Multer 2.4.0, Engine.IO 6.6.10 and `ip-address` 10.7.1; parent packages were retained. The frozen lockfile audit reports zero advisories and CI now requires the full production audit without advisory exclusions.

Automated media tests inject provider responses. Chromium blocks external DNS, and the production smoke uses the test-only `ops/ci-provider-isolation.compose.yml` overlay to resolve provider hosts to loopback and block external DNS. The production image and startup/security gates are unchanged: smoke requires the decoder to be ready and synthetic unavailable providers to leave media readiness false. The overlay is not a production deployment configuration. No live provider or production database was used.

## Continuation audit on 6 October 2026

The continuation began at local `d98871fea275143d7c9140074bc7a9d86806b6e3`, with seven media commits ahead of remote `main` at `608746f2594b09bc2508fc1bfaefeb11954935a8`. Existing commits, uncommitted message attachment recovery and the earlier named stash were preserved and audited.

The additive `20261006-media-3` migration records the known Cloudinary provider and terminal `finalized_at`. Existing unknown finalization times remain NULL; migration does not invent historical evidence or rewrite legacy URLs. New explicit approvals and permanent rejections retain finalization time across repeated completion and deletion. Contradictory approval reasons fail closed.

After a lost direct-upload acknowledgement, retry first verifies the same server reservation. Only `media_upload_not_found`, from a first resource lookup 404 before any verified identity exists, permits another write to the reserved authenticated `overwrite=false` identity. Provider outages, identity recheck failures, moderation errors, malformed approval and session changes remain failures. Message grant renewal validates the exact history tuple and rejects missing, unchanged, expired, deleted or foreign grants. The long-history scroll container does not shrink its contents above the reachable scroll area.

The required production audit found four newly reported dependency advisories. Scoped patches update `proxy-addr` to 2.0.8, `compression` to 1.8.2 and Capacitor Android/iOS to 8.5.2 in the frozen lockfile. Native applications must be rebuilt and redistributed separately; browser/API validation does not establish native release acceptance.

The repository lifecycle names map to the requested states: `pending` is pending upload, `uploaded`/`verifying` are pending verification/moderation, `approved` and `rejected` are terminal decisions, and `deleted` plus `deletion_status=pending` records revoked media awaiting cleanup. Retryable `failed` assets remain non-publishable. Moderation evidence is retained in `moderation_json`; deletion does not erase it.

The final continuation report records exact commands, counts, source revision and CI evidence. Earlier 4/5 October results below are historical evidence for their recorded revisions.

The resumed audit started at `f3ca64d2afb0a895a46437a8a24b0697e4d40a45`, retained all ten newer implementation commits and the unfinished documentation, and confirmed remote `main` remained at the audited baseline. Focused failing regressions identified and repaired four additional gaps:

- Finalization now verifies the current reservation returned by its successful lease claim. Bytes or identity committed between the first read and the claim cannot bypass the retained digest check.
- Cleanup renews its own token immediately before each provider request, skips a token acquired by another worker, and counts only committed deletion/retry updates. Decoder wall-clock timeouts remain retryable and non-publishable; malformed or excessive decoder output still permanently rejects the asset.
- Typed follow, requester, call and Story-viewer responses hydrate approved referenced avatars into API grants. Foreign/unreferenced avatars remain unavailable, and arbitrary metadata/text cannot mint grants.
- If Highlight creation succeeds but Story publication fails, the composer retains that acknowledged Highlight destination along with its approved voice/cover IDs, files and caption. Retrying creates one Highlight.

An existing authentication regression now fixes only its TOTP test epoch so bcrypt/database latency cannot cross a token boundary. Its real security assertions and production authentication code are unchanged. The complete API rerun passed 262/262 with zero skips against a fresh isolated database. See [the final verification report](MEDIA_LIFECYCLE_VERIFICATION_2026-10-06.md) for remaining checks and exact-source CI evidence; a prior green revision is not acceptance of a later source change.

## Adjustment to the transport design

Cloudinary excludes `file` and `resource_type` from upload signatures; widget size limits are client-side. Checking a fabricated preset `max_file_size` would not close that gap.

Restricted direct grants require authenticated Admin API `media_limits` proving positive finite image, video and raw account ceilings no higher than the purpose's byte limit. Otherwise the same lifecycle uses bounded authenticated server upload; the server signs the authenticated identity and restricted preset without exposing an unrestricted direct grant. Both transports share verification, moderation, approval, publication and cleanup.

References: [upload signatures](https://cloudinary.com/documentation/upload_images#generating_authentication_signatures), [Upload API](https://cloudinary.com/documentation/image_upload_api_reference), [Admin API usage](https://cloudinary.com/documentation/admin_api#usage).

## Implemented behavior and rollout

The lifecycle is `pending -> uploaded -> verifying -> approved/rejected/failed -> deleted`. Failures can retry the same reservation; terminal approval/rejection is idempotent. A lost server-upload response can retry the same owner/MIME/length/hash and acknowledge the committed upload without another provider write; different bytes cannot replace it. Finalization checks the downloaded hash against the original server buffer where present. The database stores immutable provider identity, original byte SHA256, decoded metadata, explicit moderation decision, verification/deletion leases and entity references. It prevents NULL verification metadata from satisfying approval. Content and approved ownership/purpose checks commit in one transaction, including replacements. Historical URL-only content remains unverified and readable; its URLs cannot be reused as new attachments. Historical provider backfill is not implemented by this change.

`POST /media/presign` requires authenticated ownership plus filename, exact MIME, size and purpose. `POST /media/:id/upload` is the bounded multipart transport. `POST /media/:id/finalize` accepts an empty body and the owned record ID; it returns 202 while another verifier holds the lease. `/media/upload`, `/posts/upload-image` and `/users/me/avatar` use the same verification/moderation path. `DELETE /media/:id` schedules deletion only when the asset is unused. All responses retain the existing API envelope.

Publication uses `mediaIds`, `mediaId`, `avatarMediaId`, `coverMediaId`, `thumbnailMediaId`, `customImageMediaId` or `logoMediaId`, as applicable. Purposes cover avatars, posts, post/video comments, Stories, image/voice messages, videos, products, articles, events, live-stream covers, broadcast-channel covers, highlights, showcases, businesses and communities. Direct/group image-message drafts survive moderation and send failures, including image-only messages. Studio Camera Post mode captures a bounded JPEG frame; Reel/Story modes record video. A separately allowlisted external-video URL requires an independently approved image poster. Raw uploaded URLs and provider public IDs are rejected.

Static JPEG/PNG/WebP images are supported; animated images, GIF, SVG, QuickTime and audio MP4 are excluded. Video MP4/WebM and audio MPEG/WAV/WebM/Ogg are supported only for the applicable purposes. Avatars and image covers/logos have a 2 MiB limit; content images and ordinary voice/comment attachments have a 5 MiB limit; Story audio/video and uploaded video content have a 10 MiB limit. Audio/video lasts at most 120 seconds. Images have a 4096-pixel edge/12-megapixel limit; avatars 2048/4 megapixels; video 1920 long edge, 1080 short edge and 2.1 megapixels. Portrait video is supported.

Actual FFprobe inspection and complete FFmpeg decoding enforce container signatures, tracks, corruption, animation, dimensions and duration; provider MIME/headers cannot attest bytes. Gemini receives those verified original bytes and a strict safety schema. Timeout, blocked, malformed, unsupported or uncertain results cannot approve. Video input uses 5 FPS sampling: this is not a guarantee that every frame has been assessed, and real-provider acceptance must evaluate short unsafe scenes and audio.

Cloudinary originals/poster URLs remain internal. Expiring HMAC delivery grants point to `GET /media/:id/content`; every request checks approval and deletion state. Provider bytes must match the finalized hash before delivery. Video posters are generated from those same verified original bytes. This closes the replay window where a valid upload signature recreates a deleted provider path while an older delivery URL is cached. Delivery supports bounded single-range audio/video requests, uses `no-store`, and caches at most three verified buffers for 30 seconds; approval is rechecked before cache use. Set `MEDIA_DELIVERY_ORIGIN` to the HTTPS API origin when the frontend and API use different domains.

The lifecycle worker removes expired unused reservations, rejected/orphaned assets, expired non-highlight Stories and deleted/vanished messages. Last-reference/account deletion revokes publication before provider cleanup. Deletion is leased, idempotent and backed off after errors. Tombstones retain the server public ID and reconcile image/video/raw replay namespaces during the upload-signature window. A retry never restores publication.

The candidate query excludes live references before limiting the batch, so older published assets cannot starve later abandoned/rejected assets. The permanent media sweep recovers its completed/dead job state at startup and every minute without stealing a live lease or changing finite account cleanup dead-letter policy. Provider deletion backoff remains durable and independent of the recurring job's lease.

Publication, explicit deletion, worker cleanup and the last-reference trigger acquire an asset lock before a separate reference-existence check. This matters under PostgreSQL READ COMMITTED: a deletion that waited for publication must see the reference committed during that wait. A two-connection regression reaches the actual PostgreSQL lock wait before releasing publication and verifies that the surviving reference keeps the asset approved.

Run the additive beta/production migration before deploying the API; it adds `media_assets`, `media_references`, structured message attachment columns, a nullable community cover column and cleanup triggers. It does not approve legacy URLs. No live database/provider settings or uploads were changed during implementation.

The follow-up migration also records `20261005-media-2` for the historical message repair. Repeating migration does not classify new text, including backdated fixture rows; the earlier `20261004-media-1` deployment timestamp remains unchanged. Message creation/edit timestamps are interpreted as the UTC wall-clock values written by the server, even in a non-UTC database session.

Production media requires working Cloudinary credentials, three signed presets (`CLOUDINARY_MEDIA_IMAGE_PRESET`, `CLOUDINARY_MEDIA_VIDEO_PRESET`, `CLOUDINARY_MEDIA_AUDIO_PRESET`), FFmpeg/FFprobe and `GEMINI_API_KEY` plus an accessible `MEDIA_GEMINI_MODEL`. Presets must use `unsigned=false`, `type=authenticated`, `overwrite=false`, and exact supported format allowlists (images `jpg,png,webp`; video `mp4,webm`; audio `mp3,wav,webm,ogg`), without transformations, public-ID overrides or access-control overrides. Cloudinary credentials or an OpenAI-only text provider do not enable media. The production API image installs FFmpeg; a serverless runtime without both binaries cannot handle this lifecycle. Use the long-lived production API container for verification and delivery.

`/readyz` reports `details.media` storage/preset/decoder/moderation readiness independently. Core readiness does not imply that media is ready. Normal release smoke requires `details.media.ready=true`, `details.media.decoder=true`, healthy database/Redis/notification services and `details.lifecycle.ready=true`. Only `CI=true` plus `SMOKE_SYNTHETIC_PROVIDERS=true` with a loopback `BASE_URL` permits synthetic smoke that explicitly expects unavailable providers; it cannot accept a real deployment. Presign fails closed when its provider/moderator checks are unavailable; finalization fails closed if actual verification fails. Payment, live-room, push and RTC flags stay disabled.

Lifecycle recovery must preserve durable jobs, media leases and audit history.
Use the [current operations runbook](PRODUCTION_LAUNCH.md#lifecycle-inspection-and-recovery)
to inspect overdue work, expired leases, dead letters and cleanup progress, and
to record a reason when replaying an eligible dead job. Do not delete or reset
job rows to hide an incident. Accept the 8 October handler bounds and durable
notification attempt cap only against the final evidence in the current report.

## Validation status

Historical local revalidation on 5 October passed with 243 API tests, 49 unit tests and 57 browser tests, all without skips. The frozen install, production dependency audit, contract/design checks, fresh and repeated production migration, both typechecks/builds, production configuration and Compose parsing also passed for that earlier source. This Windows host has no Docker Engine: actual production container builds and readiness smoke run in GitHub Actions. The intended 5 October final tag was never pushed and is not verification evidence. The earlier [4 October lifecycle CI](https://github.com/yorayriniwnl/yor-talksv2/actions/runs/37219328605) passed image builds and container smoke for `735c8b8`; it is historical evidence, not acceptance of the newer fixes. Current results and the final source-specific CI run belong in the continuation verification report.

Local API verification uses a fresh synthetic PostgreSQL 16 database configured to UTC and a dedicated Redis test database, matching CI's UTC database. Browser verification explicitly uses `NODE_ENV=production` because the local ignored `.env` selects development. The default local development runtime invokes React effects twice and invalidates existing first-response billing retry fixtures; the production suite passes unchanged. Previously reused synthetic databases retained successful analytics jobs and failed an existing first-run metric assertion; the fresh database passes unchanged.

The first 5 October API run encountered connection resets in the older temporary PostgreSQL service and ended with 235 passed and eight failed. Its logs were retained separately. A new isolated PostgreSQL cluster and Redis service on ports 55435 and 56385, a fresh UTC database, and hash-verified decoder binaries produced 243 passes without application or assertion changes. No production database was involved.

A clock probe also measured Windows PostgreSQL about 10 ms ahead of Node. One existing engagement fixture inserted a Story view at database `now()` and immediately compared it to Node's exclusive `now()` cutoff. The fixture now assigns its engagement timestamps one minute in the past, within the period it tests, retaining every original KPI assertion. Production analytics code is unchanged.

The following table preserves the historical 5 October results. Current results are in the [6 October verification report](MEDIA_LIFECYCLE_VERIFICATION_2026-10-06.md).

| Gate | Exact command / execution | Historical result |
| --- | --- | --- |
| Dependencies | `pnpm install --frozen-lockfile` | Passed; lockfile unchanged |
| Production dependency audit | `pnpm audit --prod` | Passed; zero advisories across all severities, 339 production dependencies |
| API contract | `pnpm contract:generate`; `pnpm contract:check` | Passed; 231 operations / 195 paths |
| Design | `pnpm design:check` | Passed |
| Unit tests | `pnpm test:unit` | 49 passed; zero skipped |
| Database package | `pnpm --filter @workspace/db build` | Passed |
| Production migration | `pnpm --filter @workspace/db migrate:production` | Passed fresh and repeated on the new synthetic UTC database, including media migrations v1 and v2 |
| CI migration | `pnpm --filter @workspace/db migrate:beta` | Required by final-tag CI; actual production migrator also runs during container smoke |
| API typecheck | `pnpm --filter @workspace/api-server typecheck` | Passed |
| Frontend typecheck | `pnpm --filter @workspace/social typecheck` | Passed |
| API tests | From `api-server`: `node --import tsx --test --test-concurrency=1 src/__tests__/*.test.ts` | 243 passed; zero skipped; `MEDIA_REQUIRE_DECODER_TESTS=true` and actual binaries |
| Browser tests | `NODE_ENV=production CI=true pnpm test:e2e` | 57 passed; no retries/skips |
| API build | `pnpm --filter @workspace/api-server build` | Passed |
| Frontend build | `NODE_ENV=production pnpm --filter @workspace/social build` | Passed |
| Production configuration | `pnpm production-config:check` | Passed; 64 environment keys |
| Production Compose | `docker compose --env-file ops/ci-production.env -f docker-compose.production.yml config --quiet` | Passed locally with verified Compose executable; the CI-only provider-isolation overlay also parses; repeated by final CI |
| Production images | `docker compose --project-name yor-talks-ci-release --env-file ops/ci-production.env -f docker-compose.production.yml build migrate api web` | Required by final-tag CI |
| Production stack | `WEB_PORT=127.0.0.1:18080 docker compose --project-name yor-talks-ci-release --env-file ops/ci-production.env -f docker-compose.production.yml -f ops/ci-provider-isolation.compose.yml up -d --no-build` | Synthetic production stack with external provider requests blocked, required by final-tag CI |
| Readiness smoke | `BASE_URL=http://127.0.0.1:18080 pnpm smoke` | Final CI requires healthy `/api/readyz`, `details.media.decoder=true`, `details.media.ready=false` for unavailable synthetic providers, successful migrator, non-root API user, provider DNS isolation and Redis-backed rate limits |

No CI gate was removed or weakened. CI requires decoder installation/execution, the production dependency audit and production smoke checks. Production provider acceptance is separate: synthetic configuration deliberately cannot make `details.media.ready` true without working restricted Cloudinary presets and accessible Gemini moderation.

## Security test coverage

The final candidate has 69 additional API test results beyond the 193-test audited baseline: `media-http.integration.test.ts` (5), `media-lifecycle.integration.test.ts` (20), `media-provider-security.test.ts` (16), `media-publication.integration.test.ts` (19, including five nested typed-avatar checks), `media-cleanup-loop.integration.test.ts` (1), `media-legacy-migration.integration.test.ts` (3), and five additions to the original `media-security.test.ts` assertion (6 total). Shared synthetic metadata is in `media-fixtures.ts`. Integration cases use actual PostgreSQL transactions and HTTP authentication; provider transport/moderation cases inject controlled external responses. Required decoder cases execute actual FFmpeg/FFprobe, including poster extraction, and CI requires these cases rather than skipping missing binaries. Thirteen browser-client unit cases exercise the bundled API client, including both ambiguous upload transports, generic provider failures, message grant validation and session changes. Browser cases exercise approved/rejected/retryable post uploads, direct/group image messages with moderation and send failures, camera photo publication, expired video/image/voice grants, Highlight/Story retry reuse and legacy attachment rendering. Legacy migration cases use private random schemas in an isolated database and verify fresh install, existing-v1 repair, metadata upgrade and edit/time-zone boundaries.

| Threat | Checked boundary |
| --- | --- |
| Forged public ID, storage URL or owner | Strict presign/finalize/upload bodies; server-generated owner/media path |
| Wrong owner / another user's media ID | Upload, finalize, deletion and transactional publication |
| MIME spoofing / byte-signature mismatch | Actual nine supported formats, cross-format declarations, disguised video/audio, corrupt and animated content |
| Oversized resource | Purpose byte ceilings, provider metadata, streamed original bytes and actual decoder input |
| Wrong resource type / media purpose | Cloudinary authenticated resource identity and per-consumer approved-ID bindings |
| Missing provider object / metadata mismatch | Missing-object failure; public ID, asset ID, version, format, size and dimension mismatches |
| Moderation timeout / provider error | Abort/timeout bounds and failed, retryable lifecycle state; no approval |
| Malformed / uncertain moderation | Explicit strict safety schema; blocked, incomplete or contradictory output fails closed |
| Rejected / pending publication | Owner, approved state and purpose checks under asset locks; content/reference rollback |
| Repeated / concurrent finalize | Durable verification lease, one moderation invocation, terminal idempotence and revoked late approval |
| Provider replay / tampering | Identity recheck after moderation, original SHA verification on delivery, expiring grant tampering and deletion revocation |
| Publication versus deletion | Explicit deletion, replacement, account deletion and last-reference trigger lock interleavings |
| Cleanup failure / concurrency / starvation | Retry state, one deletion claim, live references excluded before batch limits, recurring sweep recovery and late direct-upload tombstone reconciliation |

The HTTP suite explicitly sets the process production environment and confirms that configured upload and presign succeed. A separate HTTP case proves unavailable moderation returns conditional 503; provider tests cover storage and preset failures. This is executable evidence that the old unconditional production 503 is gone while failure gates remain.

## Changed files

Complete manifest relative to the pulled GitHub main revision above is maintained in the [6 October continuation report](MEDIA_LIFECYCLE_VERIFICATION_2026-10-06.md). The historical implementation manifest follows; use that complete report for the final file count and additions.

- `.env.example`
- `.github/workflows/ci.yml`
- `api-server/.env.example`
- `api-server/Dockerfile`
- `api-server/package.json`
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
- `tests/media-client.test.mjs`
