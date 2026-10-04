import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "../config/env.js";
import { StorageService, type CloudinaryMediaClient } from "../services/storage-service.js";
import { FFmpegMediaDecoder, runMediaProcess, type MediaDecoder } from "../services/media-byte-verification.js";
import { MediaModerationService, parseMediaModerationResponse } from "../services/media-moderation-service.js";
import { createVerifiedVideoPoster } from "../services/media-delivery.js";
import { type MediaUploadIntent, type ProviderIdentity, type VerifiedMedia, MediaProviderUnavailableError, MediaProviderNotConfiguredError, MediaVerificationError, MediaTooLargeError, MediaModerationUnavailableError, purposeLimits } from "../services/media-provider.js";

const intent: MediaUploadIntent = { id: "reservation", ownerId: "owner", purpose: "post", publicId: "yor-media/owner/reservation", resourceType: "image", declaredMimeType: "image/png", declaredBytes: 4 };
const identity: ProviderIdentity = { assetId: "a".repeat(32), publicId: intent.publicId, resourceType: "image", deliveryType: "authenticated", version: 1, format: "png" };
const metadata = () => ({ asset_id: identity.assetId, public_id: identity.publicId, resource_type: "image", type: "authenticated", version: 1, format: "png", bytes: 4, width: 2, height: 2 });
const decoder: MediaDecoder = { inspectReadiness: async () => true, verify: async (buffer, mimeType) => ({ buffer, bytes: buffer.length, mimeType, width: 2, height: 2, sha256: createHash("sha256").update(buffer).digest("hex") }) };
function configured(t: { after(callback: () => void): void }) {
  const values = { CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET,
    CLOUDINARY_MEDIA_IMAGE_PRESET: env.CLOUDINARY_MEDIA_IMAGE_PRESET, CLOUDINARY_MEDIA_VIDEO_PRESET: env.CLOUDINARY_MEDIA_VIDEO_PRESET, CLOUDINARY_MEDIA_AUDIO_PRESET: env.CLOUDINARY_MEDIA_AUDIO_PRESET, GEMINI_API_KEY: env.GEMINI_API_KEY };
  Object.assign(env, { CLOUDINARY_CLOUD_NAME: "fixture", CLOUDINARY_API_KEY: "fixture-key", CLOUDINARY_API_SECRET: "fixture-secret", CLOUDINARY_MEDIA_IMAGE_PRESET: "images", CLOUDINARY_MEDIA_VIDEO_PRESET: "videos", CLOUDINARY_MEDIA_AUDIO_PRESET: "audio", GEMINI_API_KEY: "fixture-gemini-key" });
  t.after(() => Object.assign(env, values));
}
function client(overrides: Partial<CloudinaryMediaClient> = {}): CloudinaryMediaClient {
  return {
    uploadPreset: async (name) => ({ name, unsigned: false, settings: { type: "authenticated", overwrite: false, allowed_formats: name === "images" ? ["jpg", "png", "webp"] : name === "videos" ? ["mp4", "webm"] : ["mp3", "wav", "webm", "ogg"] } }),
    usage: async () => ({ media_limits: { image_max_size_bytes: 1024, video_max_size_bytes: 1024, raw_max_size_bytes: 1024 } }),
    resource: async () => metadata(), resourceByAssetId: async () => metadata(), upload: async () => metadata(),
    deleteByAssetIds: async (ids) => ({ deleted: Object.fromEntries(ids.map((id) => [id, "deleted"])) }), destroy: async () => ({ result: "ok" }),
    sign: (options) => createHash("sha256").update(JSON.stringify(options)).digest("hex"),
    downloadUrl: (id) => `https://api.cloudinary.com/v1_1/fixture/${id.resourceType}/download?public_id=${encodeURIComponent(id.publicId)}&type=authenticated&signature=fixture`,
    posterUrl: (id) => `https://res.cloudinary.com/fixture/video/authenticated/s--fixture--/so_0/v${id.version}/${id.publicId}.jpg`, ...overrides,
  };
}
const fixtureFetch = (async () => new Response(Buffer.from("data"), { headers: { "Content-Type": "text/html", "Content-Length": "0" } })) as typeof fetch;

test("direct grants require authentic provider ceilings for every unsigned resource-type endpoint", async (t) => {
  configured(t);
  const grant = await new StorageService(client(), decoder).prepareUpload(intent);
  assert.equal(grant.directAllowed, true);
  assert.deepEqual(Object.keys(grant.fields).sort(), ["allowed_formats", "api_key", "overwrite", "public_id", "signature", "timestamp", "type", "upload_preset"].sort());
  assert.equal(grant.fields.public_id, intent.publicId); assert.equal(grant.fields.overwrite, "false"); assert.equal(grant.fields.type, "authenticated"); assert.equal(grant.fields.allowed_formats, "png");
  for (const limits of [undefined, {}, { image_max_size_bytes: 1024, video_max_size_bytes: 1024, raw_max_size_bytes: 100_000_000 }, { image_max_size_bytes: 0, video_max_size_bytes: 1, raw_max_size_bytes: 1 }]) {
    assert.equal((await new StorageService(client({ usage: async () => ({ media_limits: limits }) }), decoder).prepareUpload(intent)).directAllowed, false);
  }
  assert.equal((await new StorageService(client({ usage: async () => { throw new Error("unavailable"); } }), decoder).prepareUpload(intent)).directAllowed, false);
});

test("unsigned, public, mutable and converting presets fail before signing", async (t) => {
  configured(t);
  for (const bad of [{ unsigned: true }, { settings: { type: "upload", overwrite: false, allowed_formats: ["png"] } }, { settings: { type: "authenticated", overwrite: true, allowed_formats: ["png"] } }, { settings: { type: "authenticated", overwrite: false, allowed_formats: ["png"], format: "jpg" } }, { settings: { type: "authenticated", overwrite: false, allowed_formats: ["png", "svg"] } }]) {
    let signed = false;
    await assert.rejects(() => new StorageService(client({ uploadPreset: async () => ({ name: "images", unsigned: false, ...bad }), sign: () => { signed = true; return "signature"; } }), decoder).prepareUpload(intent), MediaProviderNotConfiguredError);
    assert.equal(signed, false);
  }
});

test("server upload verifies bytes and per-purpose limits before any provider write", async (t) => {
  configured(t); let uploads = 0;
  const storage = new StorageService(client({ upload: async () => { uploads++; return metadata(); } }), { ...decoder, verify: async () => { throw new MediaVerificationError("invalid image"); } });
  await assert.rejects(() => storage.uploadBuffer(intent, Buffer.from("data")), MediaVerificationError);
  await assert.rejects(() => storage.uploadBuffer({ ...intent, purpose: "avatar", declaredBytes: 2 * 1024 * 1024 + 1 }, Buffer.alloc(1)), MediaTooLargeError);
  assert.equal(uploads, 0);
  const successful = new StorageService(client({ upload: async (_, options) => { assert.equal(options.overwrite, false); assert.equal(options.type, "authenticated"); assert.equal(options.public_id, intent.publicId); uploads++; return metadata(); } }), decoder);
  await successful.uploadBuffer(intent, Buffer.from("data")); assert.equal(uploads, 1);
});

test("completion fetches only original server-signed destination and verifies immutable bytes and version", async (t) => {
  configured(t); let requests = 0;
  const fetcher = (async (url, options) => { requests++; assert.equal(new URL(String(url)).hostname, "api.cloudinary.com"); assert.equal(options?.redirect, "error"); return fixtureFetch(url, options); }) as typeof fetch;
  const verified = await new StorageService(client(), decoder, fetcher).verifyUpload(intent);
  assert.equal(verified.mimeType, "image/png"); assert.equal(verified.bytes, 4); assert.equal(requests, 1);
  await assert.rejects(() => new StorageService(client({ downloadUrl: () => "https://internal.example/secret" }), decoder, fetcher).verifyUpload(intent), MediaVerificationError); assert.equal(requests, 1);
  await assert.rejects(() => new StorageService(client({ resourceByAssetId: async () => ({ ...metadata(), version: 2 }) }), decoder, fixtureFetch).verifyUpload(intent), MediaVerificationError);
  await assert.rejects(() => new StorageService(client({ resource: async () => ({ ...metadata(), width: 99 }) }), decoder, fixtureFetch).verifyUpload(intent), MediaVerificationError);
  await assert.rejects(() => new StorageService(client({ resource: async () => ({ ...metadata(), bytes: 5 }) }), decoder, fixtureFetch).verifyUpload(intent), MediaVerificationError);
  await assert.rejects(() => new StorageService(client(), decoder, fixtureFetch).verifyUpload(intent, { ...identity, assetId: "b".repeat(32) }), MediaVerificationError);
});

test("completion bounds actual streamed bytes independently of size headers", async (t) => {
  configured(t); let cancelled = false;
  const fetcher = (async () => new Response(new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(Buffer.alloc(5 * 1024 * 1024 + 1)); }, cancel() { cancelled = true; } }), { headers: { "Content-Length": "1" } })) as typeof fetch;
  await assert.rejects(() => new StorageService(client(), decoder, fetcher).verifyUpload(intent), MediaTooLargeError); assert.equal(cancelled, true);
});

test('provider metadata cannot forge the public ID, resource type, delivery type, format, size or immutable version', async t => {
  configured(t);
  for (const patch of [{ public_id: 'another-user/asset' }, { resource_type: 'video' }, { type: 'upload' }, { format: 'jpg' },
    { asset_id: '' }, { version: 0 }, { version: '1' }, { bytes: -1 }, { width: 999 }, { bytes: 5 * 1024 * 1024 + 1 }]) {
    await assert.rejects(() => new StorageService(client({ resource: async () => ({ ...metadata(), ...patch }) }), decoder, fixtureFetch).verifyUpload(intent),
      error => error instanceof MediaVerificationError || error instanceof MediaTooLargeError);
  }
  await assert.rejects(() => new StorageService(client({ resource: async () => { throw { http_code: 404 }; } }), decoder, fixtureFetch).verifyUpload(intent), MediaProviderUnavailableError);
});

test("deletion uses immutable asset IDs and reconciles all authenticated replay namespaces", async (t) => {
  configured(t); const seen: string[] = [];
  const provider = new StorageService(client({ deleteByAssetIds: async (ids) => { assert.deepEqual(ids, [identity.assetId]); return { deleted: { [identity.assetId]: "not_found" } }; }, destroy: async (id, type) => { assert.equal(id, intent.publicId); seen.push(type); return { result: "not found" }; } }), decoder);
  await provider.deleteAsset(identity); await provider.deleteUpload(intent); assert.deepEqual(seen.sort(), ["image", "raw", "video"]);
  await assert.rejects(() => new StorageService(client({ destroy: async () => ({ result: "failed" }) }), decoder).deleteUpload(intent), MediaProviderUnavailableError);
});

const clear = { decision: "approve", certainty: "clear", reasons: [], sexualContent: false, graphicViolence: false, hate: false, harassment: false, selfHarm: false, illegalActivity: false };
const modelResponse = (decision: unknown = clear) => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(decision) }] } }] });
test("multimodal receipt approves only complete explicit clear decisions", () => {
  assert.equal(parseMediaModerationResponse(modelResponse()).decision, "approve");
  for (const bad of [{ ...clear, certainty: "uncertain" }, { ...clear, sexualContent: true }, { ...clear, reasons: ["cannot_assess"] }, { ...clear, extra: true }, { decision: "approve" }, { ...clear, hate: "false" }]) assert.throws(() => parseMediaModerationResponse(modelResponse(bad)), MediaModerationUnavailableError);
  for (const bad of [{}, { ...modelResponse(), promptFeedback: { blockReason: "SAFETY" } }, { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: JSON.stringify(clear) }] } }] }, { candidates: [{ ...modelResponse().candidates[0], safetyRatings: [{ probability: "HIGH", blocked: false }] }] }]) assert.throws(() => parseMediaModerationResponse(bad), MediaModerationUnavailableError);
  assert.equal(parseMediaModerationResponse(modelResponse({ ...clear, decision: "uncertain", certainty: "uncertain", reasons: ["cannot_assess"] })).decision, "uncertain");
});

test("Gemini moderation sends actual multimodal bytes, uses header credentials and never falls back", async (t) => {
  configured(t); const verified: VerifiedMedia = { ...identity, ...await decoder.verify(Buffer.from("data"), "image/png", "post") };
  let inference = 0;
  const fetcher = (async (url, options) => {
    assert.equal(new URL(String(url)).search, ""); assert.equal((options?.headers as Record<string, string>)["x-goog-api-key"], "fixture-gemini-key");
    if (options?.method === "GET") return Response.json({ name: `models/${env.MEDIA_GEMINI_MODEL}`, supportedGenerationMethods: ["generateContent"] });
    const body = JSON.parse(String(options?.body)); assert.deepEqual(body.contents[0].parts[0].inlineData, { mimeType: "image/png", data: Buffer.from("data").toString("base64") }); inference++; return Response.json(modelResponse());
  }) as typeof fetch;
  const moderator = new MediaModerationService(fetcher); await moderator.assertReady(); assert.equal(inference, 0); assert.equal((await moderator.moderate(verified, "post")).decision, "approve"); assert.equal(inference, 1);
  await assert.rejects(() => new MediaModerationService((async () => new Response("bad", { status: 503 })) as typeof fetch).moderate(verified, "post"), MediaModerationUnavailableError);
  await assert.rejects(() => new MediaModerationService((async () => Response.json({ name: `models/${env.MEDIA_GEMINI_MODEL}`, supportedGenerationMethods: ["embedContent"] })) as typeof fetch).assertReady(), MediaModerationUnavailableError);
});

test("video moderation uses a fixed documented5FPS setting; audio and image payloads do not", async (t) => {
  configured(t);
  const seen: Record<string, unknown>[] = [];
  const moderator = new MediaModerationService((async (_, options) => {
    seen.push(JSON.parse(String(options?.body)).contents[0].parts[0]); return Response.json(modelResponse());
  }) as typeof fetch);
  for (const mimeType of ["video/mp4", "video/webm", "audio/webm", "image/png"]) {
    const bytes = await decoder.verify(Buffer.from("data"), mimeType, "story");
    await moderator.moderate({ ...identity, ...bytes }, "story");
  }
  assert.deepEqual(seen.map((part) => part.videoMetadata), [{ fps: 5 }, { fps: 5 }, undefined, undefined]);
});

test("provider and Gemini hung requests time out and leave media unapproved", async (t) => {
  configured(t); const previousProvider = env.MEDIA_PROVIDER_TIMEOUT_MS, previousModeration = env.MEDIA_MODERATION_TIMEOUT_MS;
  env.MEDIA_PROVIDER_TIMEOUT_MS = 20; env.MEDIA_MODERATION_TIMEOUT_MS = 20;
  t.after(() => { env.MEDIA_PROVIDER_TIMEOUT_MS = previousProvider; env.MEDIA_MODERATION_TIMEOUT_MS = previousModeration; });
  await assert.rejects(() => new StorageService(client({ uploadPreset: () => new Promise(() => {}) }), decoder).prepareUpload(intent), MediaProviderUnavailableError);
  const verified: VerifiedMedia = { ...identity, ...await decoder.verify(Buffer.from("data"), "image/png", "post") };
  let aborted = false;
  await assert.rejects(() => new MediaModerationService((async (_, options) => {
    options?.signal?.addEventListener("abort", () => { aborted = true; }); return new Promise(() => {});
  }) as typeof fetch).moderate(verified, "post"), MediaModerationUnavailableError);
  assert.equal(aborted, true);
});

test("actual decoder handles allowed synthetic formats, rejects disguised tracks, corruption and animation", async (t) => {
  const actual = new FFmpegMediaDecoder();
  if (!(await actual.inspectReadiness())) {
    assert.notEqual(process.env.MEDIA_REQUIRE_DECODER_TESTS, "true", "FFmpeg/ffprobe integration is required in CI"); t.skip("FFmpeg/ffprobe are not installed locally"); return;
  }
  const directory = await mkdtemp(join(tmpdir(), "yor-media-fixtures-")); t.after(() => rm(directory, { recursive: true, force: true }));
  const inputs = [
    { name: "image.png", mime: "image/png", args: ["-f", "lavfi", "-i", "color=blue:s=320x240", "-frames:v", "1"] },
    { name: "image.jpg", mime: "image/jpeg", args: ["-f", "lavfi", "-i", "color=blue:s=320x240", "-frames:v", "1"] },
    { name: "image.webp", mime: "image/webp", args: ["-f", "lavfi", "-i", "color=blue:s=320x240", "-frames:v", "1", "-c:v", "libwebp"] },
    { name: "video.mp4", mime: "video/mp4", args: ["-f", "lavfi", "-i", "color=blue:s=320x240:r=10", "-t", "0.3", "-c:v", "libx264", "-pix_fmt", "yuv420p"] },
    { name: "video.webm", mime: "video/webm", args: ["-f", "lavfi", "-i", "color=blue:s=320x240:r=10", "-t", "0.3", "-c:v", "libvpx-vp9"] },
    { name: "audio.wav", mime: "audio/wav", args: ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "0.3"] },
    { name: "audio.mp3", mime: "audio/mpeg", args: ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "0.3", "-c:a", "libmp3lame"] },
    { name: "audio.webm", mime: "audio/webm", args: ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "0.3", "-c:a", "libopus"] },
    { name: "audio.ogg", mime: "audio/ogg", args: ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "0.3", "-c:a", "libopus"] },
  ];
  for (const fixture of inputs) {
    const path = join(directory, fixture.name); await runMediaProcess(env.MEDIA_FFMPEG_PATH, ["-v", "error", ...fixture.args, "-threads", "1", path], 20000);
    const bytes = await readFile(path), media = await actual.verify(bytes, fixture.mime, "story");
    assert.equal(media.bytes, bytes.length); assert.equal(media.mimeType, fixture.mime);
    if (fixture.mime.startsWith("audio/")) { assert.equal(media.width, undefined); assert.ok(media.duration! > 0); }
    else { assert.equal(media.width, 320); assert.equal(media.height, 240); }
    if (fixture.mime === "video/webm") await assert.rejects(() => actual.verify(bytes, "audio/webm", "message"), MediaVerificationError);
    if (fixture.mime === "image/png") await assert.rejects(() => actual.verify(bytes.subarray(0, 24), fixture.mime, "story"), MediaVerificationError);
    if (fixture.mime === 'image/jpeg') await assert.rejects(() => actual.verify(bytes, 'image/png', 'post'), MediaVerificationError);
    if (fixture.mime === 'image/png') {
      const animated = Buffer.concat([bytes.subarray(0, -12), Buffer.from([0,0,0,8,97,99,84,76,0,0,0,2,0,0,0,0,0,0,0,0]), bytes.subarray(-12)]);
      await assert.rejects(() => actual.verify(animated, 'image/png', 'post'), MediaVerificationError);
    }
    if (fixture.mime.startsWith('video/')) {
      const poster = await createVerifiedVideoPoster(media.buffer, media.mimeType);
      assert.equal(poster.readUInt16BE(0), 0xffd8);
      assert.equal((await actual.verify(poster, 'image/jpeg', 'video')).mimeType, 'image/jpeg');
    }
  }
  assert.equal(purposeLimits("avatar", "image/png").maxBytes, 2 * 1024 * 1024);
});
