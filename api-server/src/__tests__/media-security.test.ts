import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { env } from "../config/env.js";
import { MediaModerationUnavailableError, StorageService } from "../services/storage-service.js";
import { MediaService, MediaLifecycleError, type MediaModerator } from "../services/media-service.js";
import { MediaModerationService } from "../services/media-moderation-service.js";
import { type MediaProvider, type MediaUploadIntent, type VerifiedMedia, MEDIA_MIME_FORMATS,
  MediaProviderNotConfiguredError, MediaVerificationError, MediaUploadNotFoundError } from "../services/media-provider.js";
import { UserRepository } from "../repositories/user-repository.js";
import { createTestUser } from "./test-helpers.js";

after(() => pool.end());

test("production media storage fails closed before publishing unmoderated media", async (t) => {
  const previous = env.NODE_ENV;
  env.NODE_ENV = "production";
  t.after(() => { env.NODE_ENV = previous; });
  await assert.rejects(() => new StorageService().uploadImage(Buffer.from("image"), "avatar.png"), MediaModerationUnavailableError);
});

const bytes = Buffer.from("synthetic verified media security fixture");
const users = new UserRepository();
const approved: MediaModerator = { assertReady: async () => {}, moderate: async () => ({ decision: "approve", reasons: [] }) };
function verified(intent: MediaUploadIntent): VerifiedMedia {
  return { assetId: "c".repeat(32), publicId: intent.publicId, resourceType: intent.resourceType,
    deliveryType: "authenticated", version: 1, format: MEDIA_MIME_FORMATS[intent.declaredMimeType],
    buffer: bytes, mimeType: intent.declaredMimeType, bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex") };
}
function provider(overrides: Partial<MediaProvider> = {}): MediaProvider {
  return {
    prepareUpload: async intent => ({ directAllowed: false, uploadUrl: "unused", cloudName: "fixture", apiKey: "fixture",
      resourceType: intent.resourceType, publicId: intent.publicId, maxFileSize: 10 * 1024 * 1024, fields: {} }),
    uploadBuffer: async () => {}, verifyUpload: async intent => verified(intent), verifyIdentity: async () => {},
    signedDeliveryUrl: () => { throw new Error("Security fixtures must not mint provider URLs"); },
    signedPosterUrl: () => { throw new Error("Security fixtures must not mint provider URLs"); },
    deleteAsset: async () => {}, deletePendingUpload: async () => {}, deleteUpload: async () => {}, deleteExpected: async () => {},
    inspectReadiness: async () => ({ storage: true, presets: true, direct: false, errorCodes: [] }), ...overrides,
  };
}
const asset = async (id: string) => (await pool.query("SELECT * FROM media_assets WHERE id=$1", [id])).rows[0];

test("verified image, audio and video retain provider identity and an immutable finalization timestamp", async t => {
  const owner = await createTestUser(users);
  t.after(() => users.deleteById(owner.id));
  const service = new MediaService(provider(), approved);
  for (const [purpose, mimeType] of [["post", "image/png"], ["message", "audio/mpeg"], ["video", "video/mp4"]]) {
    const media = await service.prepareUpload(owner.id, { purpose, mimeType, size: bytes.length, filename: "fixture" });
    assert.equal(media.status, "pending");
    assert.equal((await asset(media.id)).provider, "cloudinary");
    assert.equal((await asset(media.id)).finalized_at, null);
    assert.equal((await service.upload(owner.id, media.id, { buffer: bytes, mimetype: mimeType })).url, undefined);
    assert.equal((await asset(media.id)).finalized_at, null);
    const complete = await service.finalizeUpload(owner.id, media.id), persisted = await asset(media.id);
    assert.equal(complete.status, "approved");
    assert.equal(complete.url, `media:${media.id}`);
    assert.equal(persisted.provider, "cloudinary");
    assert.equal(persisted.public_id, `yor-talks/${owner.id}/${media.id}`);
    assert.equal(persisted.provider_asset_id, "c".repeat(32));
    assert.equal(persisted.resource_type, mimeType.startsWith("image/") ? "image" : "video");
    assert.equal(persisted.declared_mime, mimeType); assert.equal(persisted.verified_mime, mimeType);
    assert.equal(persisted.declared_bytes, bytes.length); assert.equal(persisted.verified_bytes, bytes.length);
    assert.equal(persisted.moderation_json.decision, "approve");
    assert.ok(persisted.finalized_at instanceof Date);
    assert.ok(persisted.finalized_at >= persisted.created_at);
    assert.deepEqual(await service.finalizeUpload(owner.id, media.id), complete);
    assert.equal((await asset(media.id)).finalized_at.getTime(), persisted.finalized_at.getTime());
    await service.deleteUpload(owner.id, media.id);
    assert.equal((await asset(media.id)).finalized_at.getTime(), persisted.finalized_at.getTime());
  }
});

test("unavailable or contradictory media decisions cannot finalize; explicit approval can retry safely", async t => {
  const owner = await createTestUser(users);
  t.after(() => users.deleteById(owner.id));
  for (const moderate of [async () => { throw new MediaModerationUnavailableError(); },
    async () => ({ decision: "approve" as const, reasons: ["sexual_content"] })]) {
    const service = new MediaService(provider(), { ...approved, moderate });
    const media = await service.prepareUpload(owner.id, { purpose: "post", mimeType: "image/png", size: bytes.length, filename: "fixture" });
    await assert.rejects(() => service.finalizeUpload(owner.id, media.id), error => error instanceof MediaLifecycleError && error.code === "media_moderation_unavailable");
    const failed = await asset(media.id);
    assert.equal(failed.status, "failed"); assert.equal(failed.finalized_at, null); assert.equal(failed.moderation_json, null);
    const retry = await new MediaService(provider(), approved).finalizeUpload(owner.id, media.id);
    assert.equal(retry.status, "approved"); assert.ok((await asset(media.id)).finalized_at instanceof Date);
  }
});

test("moderation and verification rejection retain finalization evidence through duplicate requests", async t => {
  const owner = await createTestUser(users);
  t.after(() => users.deleteById(owner.id));
  const services = [new MediaService(provider(), { ...approved, moderate: async () => ({ decision: "reject", reasons: ["sexual_content"] }) }),
    new MediaService(provider({ verifyUpload: async () => { throw new MediaVerificationError("forged identity"); } }), approved)];
  for (const service of services) {
    const media = await service.prepareUpload(owner.id, { purpose: "post", mimeType: "image/png", size: bytes.length, filename: "fixture" });
    try { await service.finalizeUpload(owner.id, media.id); } catch (error) {
      assert.ok(error instanceof MediaLifecycleError && error.code === "media_verification_failed");
    }
    const rejected = await asset(media.id);
    assert.equal(rejected.status, "rejected"); assert.equal(rejected.deletion_status, "pending");
    assert.ok(rejected.finalized_at instanceof Date);
    assert.equal((await service.finalizeUpload(owner.id, media.id)).url, undefined);
    assert.equal((await asset(media.id)).finalized_at.getTime(), rejected.finalized_at.getTime());
  }
});

test("missing Gemini or Cloudinary configuration fails before any provider request", async t => {
  const previous = { GEMINI_API_KEY: env.GEMINI_API_KEY, CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME };
  t.after(() => Object.assign(env, previous));
  env.GEMINI_API_KEY = ""; env.CLOUDINARY_CLOUD_NAME = "";
  let requests = 0;
  const fetcher = (async () => { requests++; throw new Error("No provider request is authorized in this fixture"); }) as typeof fetch;
  await assert.rejects(() => new MediaModerationService(fetcher).assertReady(), MediaModerationUnavailableError);
  const storage = new StorageService(undefined, { inspectReadiness: async () => true, verify: async () => { throw new Error("unused"); } }, fetcher);
  await assert.rejects(() => storage.prepareUpload({ id: randomUUID(), ownerId: randomUUID(), purpose: "post",
    publicId: "security-fixture/never-uploaded", resourceType: "image", declaredMimeType: "image/png", declaredBytes: bytes.length }), MediaProviderNotConfiguredError);
  assert.equal(requests, 0);
});

test("a confirmed absent reservation stays retryable and cannot become finalized or publishable", async t => {
  const owner = await createTestUser(users);
  t.after(() => users.deleteById(owner.id));
  const service = new MediaService(provider({ verifyUpload: async () => { throw new MediaUploadNotFoundError(); } }), approved);
  const media = await service.prepareUpload(owner.id, { purpose: "post", mimeType: "image/png", size: bytes.length, filename: "fixture" });
  await assert.rejects(() => service.finalizeUpload(owner.id, media.id), error => error instanceof MediaLifecycleError && error.code === "media_upload_not_found");
  const missing = await asset(media.id);
  assert.equal(missing.status, "failed"); assert.equal(missing.deletion_status, "none");
  assert.equal(missing.finalized_at, null); assert.equal(missing.moderation_json, null);
  assert.equal((await new MediaService(provider(), approved).finalizeUpload(owner.id, media.id)).status, "approved");
});
