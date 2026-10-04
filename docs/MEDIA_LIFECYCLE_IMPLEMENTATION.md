# Production media lifecycle implementation

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

## Adjustment to the transport design

Cloudinary excludes `file` and `resource_type` from upload signatures; widget size limits are client-side. Checking a fabricated preset `max_file_size` would not close that gap.

Restricted direct grants require authenticated Admin API `media_limits` proving positive finite image, video and raw account ceilings no higher than the purpose's byte limit. Otherwise the same lifecycle uses bounded authenticated server upload; the server signs the authenticated identity and restricted preset without exposing an unrestricted direct grant. Both transports share verification, moderation, approval, publication and cleanup.

References: [upload signatures](https://cloudinary.com/documentation/upload_images#generating_authentication_signatures), [Upload API](https://cloudinary.com/documentation/image_upload_api_reference), [Admin API usage](https://cloudinary.com/documentation/admin_api#usage).

## Implemented behavior and rollout

The lifecycle is `pending -> uploaded -> verifying -> approved/rejected/failed -> deleted`. Failures can retry the same reservation; terminal approval/rejection is idempotent. The database stores immutable provider identity, original byte SHA256, decoded metadata, explicit moderation decision, verification/deletion leases and entity references. It prevents NULL verification metadata from satisfying approval. Content and approved ownership/purpose checks commit in one transaction, including replacements. Historical URL-only content remains unverified and readable; its URLs cannot be reused as new attachments. Historical provider backfill is not implemented by this change.

`POST /media/presign` requires authenticated ownership plus filename, exact MIME, size and purpose. `POST /media/:id/upload` is the bounded multipart transport. `POST /media/:id/finalize` accepts an empty body and the owned record ID; it returns 202 while another verifier holds the lease. `/media/upload`, `/posts/upload-image` and `/users/me/avatar` use the same verification/moderation path. `DELETE /media/:id` schedules deletion only when the asset is unused. All responses retain the existing API envelope.

Publication uses `mediaIds`, `mediaId`, `avatarMediaId`, `coverMediaId`, `thumbnailMediaId`, `customImageMediaId` or `logoMediaId`, as applicable. Purposes cover avatars, posts, post/video comments, Stories, image/voice messages, videos, products, articles, events, live-stream covers, broadcast-channel covers, highlights, showcases, businesses and communities. A separately allowlisted external-video URL requires an independently approved image poster. Raw uploaded URLs and provider public IDs are rejected.

Static JPEG/PNG/WebP images are supported; animated images, GIF, SVG, QuickTime and audio MP4 are excluded. Video MP4/WebM and audio MPEG/WAV/WebM/Ogg are supported only for the applicable purposes. Avatars and image covers/logos have a 2 MiB limit; content images and ordinary voice/comment attachments have a 5 MiB limit; Story audio/video and uploaded video content have a 10 MiB limit. Audio/video lasts at most 120 seconds. Images have a 4096-pixel edge/12-megapixel limit; avatars 2048/4 megapixels; video 1920 long edge, 1080 short edge and 2.1 megapixels. Portrait video is supported.

Actual FFprobe inspection and complete FFmpeg decoding enforce container signatures, tracks, corruption, animation, dimensions and duration; provider MIME/headers cannot attest bytes. Gemini receives those verified original bytes and a strict safety schema. Timeout, blocked, malformed, unsupported or uncertain results cannot approve. Video input uses 5 FPS sampling: this is not a guarantee that every frame has been assessed, and real-provider acceptance must evaluate short unsafe scenes and audio.

Cloudinary originals/poster URLs remain internal. Expiring HMAC delivery grants point to `GET /media/:id/content`; every request checks approval and deletion state. Provider bytes must match the finalized hash before delivery. Video posters are generated from those same verified original bytes. This closes the replay window where a valid upload signature recreates a deleted provider path while an older delivery URL is cached. Delivery supports bounded single-range audio/video requests, uses `no-store`, and caches at most three verified buffers for 30 seconds; approval is rechecked before cache use. Set `MEDIA_DELIVERY_ORIGIN` to the HTTPS API origin when the frontend and API use different domains.

The lifecycle worker removes expired unused reservations, rejected/orphaned assets, expired non-highlight Stories and deleted/vanished messages. Last-reference/account deletion revokes publication before provider cleanup. Deletion is leased, idempotent and backed off after errors. Tombstones retain the server public ID and reconcile image/video/raw replay namespaces during the upload-signature window. A retry never restores publication.

Publication, explicit deletion, worker cleanup and the last-reference trigger acquire an asset lock before a separate reference-existence check. This matters under PostgreSQL READ COMMITTED: a deletion that waited for publication must see the reference committed during that wait. A two-connection regression reaches the actual PostgreSQL lock wait before releasing publication and verifies that the surviving reference keeps the asset approved.

Run the additive beta/production migration before deploying the API; it adds `media_assets`, `media_references`, structured message attachment columns, a nullable community cover column and cleanup triggers. It does not approve legacy URLs. No live database/provider settings or uploads were changed during implementation.

Production media requires working Cloudinary credentials, three signed presets (`CLOUDINARY_MEDIA_IMAGE_PRESET`, `CLOUDINARY_MEDIA_VIDEO_PRESET`, `CLOUDINARY_MEDIA_AUDIO_PRESET`), FFmpeg/FFprobe and `GEMINI_API_KEY` plus an accessible `MEDIA_GEMINI_MODEL`. Presets must use `unsigned=false`, `type=authenticated`, `overwrite=false`, and exact supported format allowlists (images `jpg,png,webp`; video `mp4,webm`; audio `mp3,wav,webm,ogg`), without transformations, public-ID overrides or access-control overrides. Cloudinary credentials or an OpenAI-only text provider do not enable media. The production API image installs FFmpeg; a serverless runtime without both binaries cannot handle this lifecycle. Use the long-lived production API container for verification and delivery.

`/readyz` reports `details.media` storage/preset/decoder/moderation readiness independently. Core readiness does not imply that media is ready. Presign fails closed when its provider/moderator checks are unavailable; finalization fails closed if actual verification fails. Payment, live-room, push and RTC flags stay disabled.

## Validation status

Local validation passed with 235 API tests, 48 unit tests and 51 browser tests, all without skips. Contract/design checks, fresh and repeated production migration, both typechecks/builds, production configuration and Compose parsing also passed. This Windows host has no Docker Engine: actual production container builds and the production readiness smoke are still pending verification in GitHub Actions against this change. Green CI for the starting revision does not validate this change.

Local API verification uses a fresh synthetic PostgreSQL 16 database configured to UTC and a dedicated Redis test database, matching CI's UTC database. Browser verification explicitly uses `NODE_ENV=production` because the local ignored `.env` selects development. The default local development runtime invokes React effects twice and invalidates existing first-response billing retry fixtures; the production suite passes unchanged. Previously reused synthetic databases retained successful analytics jobs and failed an existing first-run metric assertion; the fresh database passes unchanged.

## Security test coverage

The new API suites are `media-http.integration.test.ts`, `media-lifecycle.integration.test.ts`, `media-provider-security.test.ts` and `media-publication.integration.test.ts`, with shared synthetic metadata in `media-fixtures.ts`. Integration cases use actual PostgreSQL transactions and HTTP authentication; provider transport/moderation cases inject controlled external responses. Required decoder cases execute actual FFmpeg/FFprobe, including poster extraction, and CI requires these cases rather than skipping missing binaries. Four browser-client unit cases exercise the bundled API client; two browser cases exercise approved image publication and rejected/retryable uploads through the actual composer.

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
| Cleanup failure / concurrency | Retry state, one deletion claim and late direct-upload tombstone reconciliation |

The HTTP suite explicitly sets the process production environment and confirms that configured upload and presign succeed. Separate cases prove that unavailable moderation/storage still return a conditional failure. This is executable evidence that the old unconditional production 503 is gone while failure gates remain.

## Changed files

- `.env.example`
- `.github/workflows/ci.yml`
- `README.md`
- `api-server/.env.example`
- `api-server/Dockerfile`
- `api-server/src/__tests__/beta-feature-gates.test.ts`
- `api-server/src/__tests__/disappearing-message.test.ts`
- `api-server/src/__tests__/event-service.test.ts`
- `api-server/src/__tests__/media-fixtures.ts`
- `api-server/src/__tests__/media-http.integration.test.ts`
- `api-server/src/__tests__/media-lifecycle.integration.test.ts`
- `api-server/src/__tests__/media-provider-security.test.ts`
- `api-server/src/__tests__/media-publication.integration.test.ts`
- `api-server/src/__tests__/payment-hardening.test.ts`
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
- `lib/api-spec/openapi.yaml`
- `lib/db/scripts/migrate-media.mjs`
- `lib/db/scripts/migrate-release.mjs`
- `lib/db/src/index.ts`
- `lib/db/src/schema/index.ts`
- `lib/db/src/schema/media.ts`
- `ops/.env.production.example`
- `scripts/generate-api-contract.mjs`
- `social/src/components/comments/RichCommentComposer.tsx`
- `social/src/components/feed/Post.tsx`
- `social/src/components/feed/StoryBuilderModal.tsx`
- `social/src/components/media/MediaImageField.tsx`
- `social/src/components/messages/VoiceNoteRecorder.tsx`
- `social/src/components/studio/StudioCameraModal.tsx`
- `social/src/components/video/ReelsSwiper.tsx`
- `social/src/lib/api-client.ts`
- `social/src/lib/media-upload.ts`
- `social/src/lib/store.ts`
- `social/src/lib/uploader.ts`
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
