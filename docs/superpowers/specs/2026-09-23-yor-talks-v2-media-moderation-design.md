# Yor Talks V2 Media Upload and Moderation Design

## Status

The user approved the staged-media approach. This written specification is awaiting review before implementation. No production requests or uploads are in scope.

## Current state and problem

- `/media/upload` and `/media/presign` return production `503` based on raw `process.env.NODE_ENV`, before Cloudinary configuration is checked.
- `StorageService` independently refuses production uploads before checking Cloudinary.
- The browser direct-upload contract does not send the server-signed `public_id`.
- Direct uploads currently result in public URLs; there is no server completion step proving provider metadata, owner, actual bytes, or moderation result before content references the URL.
- Media moderation is not implemented. The existing AI policy checks text only.
- Entity records store media URLs, so deletion and expiry do not reliably identify Cloudinary assets.
- The development fallback returns base64 data URLs that later JSON persistence cannot reliably carry.
- A file-backed video upload reports the video URL itself as the thumbnail.

## Goals

1. Permit production media upload only when storage, provider-enforced upload limits, and a media moderation provider are all ready.
2. Ensure newly uploaded media stays inaccessible to viewers until server-side checks and moderation pass.
3. Bind each upload to an authenticated owner, one purpose, an allowed media type, and a provider object chosen by the server.
4. Carry an approved media identifier through publication and maintain enough provider metadata to revoke and delete assets.
5. Keep user-facing upload flows for avatars, post and comment images, story image/audio, voice notes, and file-backed video/clip creation.
6. Make provider failures visible and retryable without publishing the asset or silently switching to an unsafe fallback.

## Non-goals

- No production credentials, Cloudinary account settings, database, or media objects are changed by this code task.
- Existing external video-link mode remains separate from uploaded media. It will be restricted to valid HTTPS URLs and an explicit host policy, and it will not be described as server-hosted media.
- This work does not provide video transcoding/HLS.

## Proposed flow

### 1. Prepare an upload

The authenticated client requests an upload using a purpose, declared MIME type, and declared size. The server validates the exact allowlist for that purpose, the existing 10 MiB ceiling, rate limit, and authenticated owner. It creates a `media_assets` record in `pending_upload` state and chooses the asset ID, Cloudinary folder, resource type, and public ID. Existing multipart avatar and post-image endpoints become wrappers around this same lifecycle; they cannot bypass moderation.

The server signs every provider parameter that controls identity or access, including `public_id`, `folder`, `type=authenticated`, and a configured restricted upload preset. It also chooses the upload endpoint's `resource_type`; the browser cannot choose an alternate provider endpoint. The browser sends the exact signed fields, including `public_id`; it never supplies an arbitrary provider URL or public ID. A purpose-specific restricted Cloudinary upload preset must independently enforce allowed formats and the 10 MiB ceiling because browser checks and an unsigned size field are not security boundaries. Add its configured preset name to production readiness; do not claim production uploads are ready until the Cloudinary account has that preset.

The allowed MIME set is explicit by purpose. The server verifies Cloudinary-reported size and format, downloads the provider asset through a server-generated Cloudinary URL, and checks its bytes with the existing signature-sniffing logic before moderation. Claimed MIME and client-reported size are not trusted.

### 2. Moderate before approval

Uploads begin as authenticated, inaccessible Cloudinary assets. A new media-moderation adapter submits the verified media bytes and MIME type to the configured multimodal Gemini API, then parses a strict structured decision. It supports image, audio, and video input and applies the existing text safety categories plus applicable visual/audio safety categories. This chooses the already-integrated Gemini provider for the new media inputs; production upload readiness therefore requires `GEMINI_API_KEY` (the current OpenAI-only text-moderation configuration is insufficient for media).

Only an explicit, well-formed approval moves the asset to `approved`. A rejection moves it to `rejected` and schedules provider deletion. Timeouts, provider errors, blocked responses, unsupported MIME types, and malformed output leave it non-publishable; they never fall back to text-only screening or public delivery. Production readiness requires the Gemini media-moderation key/configuration as well as Cloudinary settings. Cloudinary credentials alone do not enable publication.

### 3. Finalize and publish

The client finalizes an upload by media ID. The server checks that the authenticated owner matches the pending record, fetches the provider object by the server-recorded public ID, verifies provider metadata and bytes, moderates it, and returns the final state. Repeated finalize requests are idempotent. Publication endpoints accept approved media IDs for uploaded assets, check owner and purpose, and create media-reference rows transactionally with their content records. Voice-note messages carry a media ID through the message API and render as an audio attachment; the URL is not embedded in free-form message text.

For compatibility with existing UI rendering, API view models may continue returning the current URL-shaped fields, but those URLs are generated from approved asset records. Uploaded-media request payloads use media IDs. Arbitrary URLs are rejected on avatar, image, audio, and uploaded-video fields. The intentionally supported external-video mode stays a separately validated URL field.

Approved assets remain authenticated at Cloudinary and are served using server-generated signed delivery URLs. The database stores provider identity, not a client-authoritative delivery URL. Video poster URLs are generated from an approved video frame or an independently approved image; the video URL itself is never used as an image poster.

### 4. Persistence, deletion, and retention

Add `media_assets` records with owner, purpose, Cloudinary resource type/public ID, verified MIME/size, moderation status, timestamps, and deletion state. Add media-use references to associate assets with users, posts, comments, stories, videos, video comments, and messages. New references are created in the same database transaction as publication.

Provider deletion is idempotent and queued/retried after database deletion. Remove assets on rejected/abandoned uploads, content deletion, account deletion, story expiry (unless a retained highlight still references the asset), vanish-message expiry, and deletion of the last reference. A scheduled cleanup path removes stale `pending_upload` records and expired unreferenced assets. Provider failure leaves a retryable deletion state and does not restore a deleted content reference.

Existing URL-only media is treated as `legacy_unverified` during migration and is not retroactively labelled moderated. Preserve existing published content during the rollout to avoid silently removing historical posts; only new uploads and any replacement/update of a legacy media reference require an approved media ID. A backfill path records Cloudinary identities and moderation results where possible, but a legacy URL is never accepted as proof of ownership for a new attachment.

### 5. Client behavior and provider failures

- Presign and completion failures map to stable API codes: invalid type `415`, oversize `413`, not-owner `403`, unavailable provider/moderator `503`, and retryable provider failures `502/503`.
- The client displays pending moderation and retryable failure states; it does not persist or render a pending URL. Existing avatar URL update routes cannot bypass the approved-asset lookup.
- Remove the fake-success base64 data-URL path. A missing local provider returns a clear unavailable result; production never falls back to local storage.
- Production checks use parsed `env.NODE_ENV` consistently. Startup/readiness checks report storage, upload-preset, and moderation readiness independently.
- Preserve current draft/file state when finalization or moderation is temporarily unavailable so the user can retry.

## Product flows in scope

- Avatar multipart upload and any profile avatar update path.
- Post image upload and post creation.
- Image attachments on post comments and video comments.
- Story image and audio uploads.
- Message voice-note upload and message persistence/rendering.
- File-backed Videos, Clip Studio, and Studio Camera publishing, including a real poster frame.

Direct external video URLs remain outside the uploaded-asset lifecycle but will receive strict HTTPS/host validation and text moderation before publication.

## Migration and compatibility

Use additive Drizzle schema changes and the repository's beta/production migration scripts. Preserve legacy URL columns while new media IDs and provider metadata become authoritative. Existing rows must not be marked approved merely because a URL exists. Document the required restricted Cloudinary preset and Gemini media-moderation configuration. Do not run a production migration or alter Cloudinary account settings in this task.

## Acceptance criteria

1. Production upload/presign no longer fail solely because `NODE_ENV` is production; they succeed only when required provider readiness is true.
2. Cloudinary credentials without upload limits or media moderation do not result in an approved or publishable asset.
3. Browser requests include every server-signed parameter, and forged IDs, cross-owner finalization, wrong purpose, MIME/size mismatches, and arbitrary uploaded-media URLs are rejected.
4. An asset cannot appear in a post/story/comment/video/avatar/message before verified approval.
5. Provider/moderation failures remain non-publishable and can be retried safely.
6. Deleting content/account, expiring stories/vanish messages, and abandoning/rejecting uploads schedules corresponding Cloudinary cleanup with retry state.
7. All listed browser upload surfaces use the media-ID lifecycle; external-video mode remains separately validated.
8. No new upload path relies on persistent base64 JSON URLs; video thumbnails are image URLs.
9. Validation will use static review and available typecheck/build commands. No automated tests will be added or run unless separately requested. No production data will be sent, and no production upload or migration will be run.

## External API reference

- [Cloudinary asset moderation](https://cloudinary.com/documentation/moderate_assets) — image/video moderation and moderation status.
- [Cloudinary media access control](https://cloudinary.com/documentation/control_access_to_media) — authenticated media delivery.
- [Gemini audio understanding](https://ai.google.dev/gemini-api/docs/audio) and [video understanding](https://ai.google.dev/gemini-api/docs/video-understanding) — multimodal input support.
