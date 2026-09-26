# Verified Media Upload and Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable media uploads only through owner-bound, provider-verified, moderated assets, then ensure content endpoints can reference only approved assets.

**Architecture:** Create a staged media asset lifecycle backed by PostgreSQL and private Cloudinary objects. The server signs a provider object identity, verifies provider metadata and bytes on finalize, runs the configured Gemini media moderation adapter, and only then issues an approved media ID for content references. Keep Cloudinary-only production uploads unavailable until both provider limits and moderation are configured.

**Tech Stack:** TypeScript, Express 5, Drizzle ORM, PostgreSQL, Cloudinary, Gemini REST API, React/TypeScript client, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-23-yor-talks-v2-media-moderation-design.md`.

## Global Constraints

- Do not make production provider requests, upload media, change Cloudinary settings, or run production migrations.
- Cloudinary credentials alone must never make an asset publishable; moderation/configuration failures stay non-publishable.
- New uploaded media references use server-owned IDs and validated owner/purpose/status; arbitrary external URLs are not accepted as uploaded media.
- Existing URL columns and legacy rows remain readable during the additive migration; do not mark legacy media as approved.
- Do not store base64 data URLs as persistent media.

## Review Focus

- A user finalizes another user's pending media ID.
- Cloudinary reports a MIME type, size, or public ID different from the server's intent.
- Moderation times out, returns malformed output, rejects, or lacks configuration.
- A content request attempts to use an arbitrary external URL or an unapproved/incorrect-purpose media ID.
- Content or an account is deleted while media references remain or provider deletion is unavailable.

---

### Task 1: Add additive media asset and reference persistence

**Files:**
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/scripts/migrate-beta.mjs`
- Modify: `lib/db/scripts/migrate-production.mjs`
- Modify: `api-server/src/types/index.ts`
- Test: `api-server/src/__tests__/media-security.test.ts`

**Interfaces:**
- Add `media_assets` with owner, purpose, Cloudinary resource type/public ID, declared and verified metadata, moderation/deletion state, and timestamps.
- Add media-reference rows for each supported content owner; keep provider identity authoritative and existing URL fields as compatibility output only.

- [ ] Add failing schema/service tests for pending, approved, rejected, and deletion-pending assets, including owner/purpose checks.
- [ ] Run `pnpm --filter @workspace/api-server exec tsx --test src/__tests__/media-security.test.ts` and confirm the new lifecycle cases fail.
- [ ] Add Drizzle tables and additive creation statements to both migration scripts. Do not drop or rewrite legacy media columns.
- [ ] Add duplicate/orphan preflight checks for any new uniqueness or reference constraint; fail with diagnostics and preserve all existing rows.
- [ ] Rerun the focused media-security tests and run `pnpm --filter @workspace/db build`.

### Task 2: Implement prepare, finalize, verify, and moderate

**Files:**
- Modify: `api-server/src/routes/media.ts`
- Modify: `api-server/src/services/storage-service.ts`
- Modify: `api-server/src/services/media-service.ts`
- Create: `api-server/src/services/media-moderation-service.ts`
- Modify: `api-server/src/config/env.ts`
- Modify: `api-server/src/middlewares/upload.ts`
- Test: `api-server/src/__tests__/media-security.test.ts`

**Interfaces:**
- `prepareUpload(ownerId, purpose, mimeType, size)` creates a server-chosen pending asset and signs the exact Cloudinary identity.
- `finalizeUpload(ownerId, assetId)` verifies Cloudinary metadata/bytes, moderates strictly, and returns approved/rejected/pending without exposing unapproved delivery URLs.

- [ ] Add failing tests for production presign with complete storage but missing moderation configuration, forged public IDs, wrong owner, invalid metadata, moderation timeout, and repeat finalize.
- [ ] Run the focused media test and confirm all new scenarios fail under the URL-only flow.
- [ ] Require a configured restricted Cloudinary upload preset, provider-enforced type/size limits, authenticated delivery, and parsed `env.NODE_ENV`; remove raw `process.env.NODE_ENV` checks.
- [ ] Verify provider-returned resource type, public ID, size, format, and downloaded byte signature against the server-created asset record.
- [ ] Add strict structured Gemini moderation for supported image/audio/video media. Only explicit approval sets `approved`; rejection schedules deletion; timeout, malformed output, or provider errors remain non-publishable.
- [ ] Map unsupported type/size, owner mismatch, and unavailable provider/moderator to the stable status codes in the spec.
- [ ] Rerun focused media tests; confirm no live Cloudinary/Gemini calls were made.

### Task 3: Require approved media IDs at every content boundary

**Files:**
- Modify: `api-server/src/validators/post.ts`
- Modify: `api-server/src/validators/story.ts`
- Modify: `api-server/src/validators/video.ts`
- Modify: `api-server/src/validators/user.ts`
- Modify: related comment, message, and video-comment validators/services
- Modify: `api-server/src/services/post-service.ts`
- Modify: `api-server/src/services/story-service.ts`
- Modify: `api-server/src/services/video-service.ts`
- Modify: `api-server/src/services/user-service.ts`
- Modify: `social/src/lib/api-client.ts` and each existing upload caller
- Test: `api-server/src/__tests__/media-security.test.ts`

**Interfaces:**
- Uploaded-media request fields carry media IDs. View models may continue returning URL-shaped fields generated from approved assets.
- External video links remain a distinct HTTPS/host-validated mode and are not treated as uploaded media.

- [ ] Add failing service/route tests proving arbitrary URLs, pending IDs, cross-owner IDs, and wrong-purpose IDs cannot be published.
- [ ] Run focused media tests and confirm each invalid reference is rejected before database content insertion.
- [ ] Change content validators and service entrypoints to authorize approved asset ID, owner, purpose, and media type before writing references in the same transaction as content.
- [ ] Migrate all current browser upload calls to prepare → provider upload → finalize → publish with the returned media ID; preserve retryable local file state on transient errors.
- [ ] Ensure generated video posters are image references, not the video URL.
- [ ] Rerun focused media tests and API/client typechecks.

### Task 4: Clean up media and retain safe compatibility

**Files:**
- Modify: `api-server/src/services/queue-service.ts`
- Modify: relevant post/story/message/account deletion services and notification/media workers
- Modify: `lib/db/scripts/migrate-beta.mjs`
- Modify: `lib/db/scripts/migrate-production.mjs`
- Modify: `docs/PRODUCTION_LAUNCH.md`
- Test: `api-server/src/__tests__/media-security.test.ts`

- [ ] Add failing tests for rejected/abandoned uploads, last-reference deletion, story expiry, and provider deletion retries.
- [ ] Implement idempotent Cloudinary deletion jobs and bounded cleanup of stale pending/unreferenced assets; keep retry state on provider errors.
- [ ] Keep URL-only legacy records marked unverified and readable by the compatibility policy; do not infer moderation approval from their current URL.
- [ ] Update production documentation with required Cloudinary preset/access-control and Gemini moderation configuration.
- [ ] Run the focused media tests, `pnpm --filter @workspace/api-server typecheck`, and `pnpm --filter @workspace/db build`; do not run migrations against production.

### Task 5: Review the complete media flow

- [ ] Trace one image and one audio/video path from client preparation through approved publication and view-model delivery.
- [ ] Confirm all rejection, timeout, missing-config, wrong-owner, and deletion-failure paths keep media non-publishable.
- [ ] Confirm no production provider calls, uploads, or migrations were performed.
