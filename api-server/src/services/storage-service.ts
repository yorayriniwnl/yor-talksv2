import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { FFmpegMediaDecoder, type MediaDecoder } from "./media-byte-verification.js";
import { type DirectUploadGrant, type MediaProvider, type MediaUploadIntent, type ProviderIdentity, type ProviderReadiness, type VerifiedMedia,
  MEDIA_MIME_FORMATS, mediaMimeAllowed, purposeLimits, MediaProviderNotConfiguredError, MediaProviderUnavailableError,
  MediaVerificationError, MediaModerationUnavailableError, MediaTooLargeError, MediaUploadNotFoundError } from "./media-provider.js";
export { MediaProviderNotConfiguredError, MediaModerationUnavailableError, MediaProviderUnavailableError, MediaVerificationError, MediaTooLargeError } from "./media-provider.js";

export interface CloudinaryMediaClient {
  uploadPreset(name: string): Promise<unknown>;
  usage(): Promise<unknown>;
  resource(publicId: string, resourceType: "image" | "video" | "raw"): Promise<unknown>;
  resourceByAssetId(assetId: string): Promise<unknown>;
  upload(buffer: Buffer, options: Record<string, unknown>): Promise<unknown>;
  deleteByAssetIds(assetIds: string[]): Promise<unknown>;
  destroy(publicId: string, resourceType: "image" | "video" | "raw"): Promise<unknown>;
  sign(options: Record<string, string | number | boolean>): string;
  downloadUrl(identity: ProviderIdentity): string;
  posterUrl(identity: ProviderIdentity): string;
}
function accountOptions() {
  return { cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET,
    secure: true, timeout: env.MEDIA_PROVIDER_TIMEOUT_MS };
}
const defaultClient: CloudinaryMediaClient = {
  uploadPreset: (name) => cloudinary.api.upload_preset(name, accountOptions()),
  usage: () => cloudinary.api.usage(accountOptions()),
  resource: (id, type) => cloudinary.api.resource(id, { ...accountOptions(), resource_type: type, type: "authenticated", media_metadata: true }),
  resourceByAssetId: (id) => (cloudinary.api as unknown as { resource_by_asset_id(id: string, options: unknown): Promise<unknown> }).resource_by_asset_id(id, { ...accountOptions(), media_metadata: true }),
  upload: (buffer, options) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ ...accountOptions(), ...options }, (error, result) => error || !result ? reject(error) : resolve(result));
    stream.on("error", reject); stream.end(buffer);
  }),
  deleteByAssetIds: (ids) => cloudinary.api.delete_resources_by_asset_ids(ids, { ...accountOptions(), invalidate: true }),
  destroy: (id, type) => cloudinary.uploader.destroy(id, { ...accountOptions(), resource_type: type, type: "authenticated", invalidate: true }),
  downloadUrl: (identity) => cloudinary.utils.private_download_url(identity.publicId, identity.format, {
    ...accountOptions(), resource_type: identity.resourceType, type: "authenticated", attachment: false,
    expires_at: Math.floor(Date.now() / 1000) + env.MEDIA_SIGNED_URL_TTL_SECONDS,
  }),
  sign: (options) => cloudinary.utils.api_sign_request(options, env.CLOUDINARY_API_SECRET),
  // private_download_url has no transformation support; posters use the documented signed, version-bound frame URL.
  posterUrl: (identity) => cloudinary.url(identity.publicId, { ...accountOptions(), resource_type: "video", type: "authenticated", sign_url: true,
    version: identity.version, format: "jpg", transformation: [{ start_offset: "0", width: 960, crop: "limit" }] }),
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MediaVerificationError();
  return value as Record<string, unknown>;
}
function sameIdentity(a: ProviderIdentity, b: ProviderIdentity): boolean {
  return a.assetId === b.assetId && a.publicId === b.publicId && a.resourceType === b.resourceType && a.deliveryType === b.deliveryType && a.version === b.version && a.format === b.format;
}
function identityOf(value: unknown): ProviderIdentity {
  const a = record(value);
  if (typeof a.asset_id !== "string" || !/^[a-f0-9]{32}$/i.test(a.asset_id) || typeof a.public_id !== "string" || !["image", "video"].includes(String(a.resource_type))
    || a.type !== "authenticated" || !Number.isSafeInteger(a.version) || Number(a.version) < 1 || typeof a.format !== "string" || !Object.values(MEDIA_MIME_FORMATS).includes(a.format)) throw new MediaVerificationError("Provider asset identity is invalid");
  return { assetId: a.asset_id, publicId: a.public_id, resourceType: a.resource_type as "image" | "video", deliveryType: "authenticated", version: Number(a.version), format: a.format };
}
function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const info = error as { http_code?: unknown; error?: { http_code?: unknown } };
  return info.http_code === 404 || info.error?.http_code === 404;
}
function validatePublicId(id: string): void {
  if (!/^[A-Za-z0-9_/-]{1,255}$/.test(id) || id.split("/").some((part) => !part || part === "." || part === "..")) throw new MediaVerificationError("Invalid media identity");
}

export class StorageService implements MediaProvider {
  constructor(private readonly client: CloudinaryMediaClient = defaultClient, private readonly decoder: MediaDecoder = new FFmpegMediaDecoder(), private readonly fetcher: typeof fetch = fetch) {}
  private async providerRead<T>(operation: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new MediaProviderUnavailableError()), env.MEDIA_PROVIDER_TIMEOUT_MS); })]); }
    finally { if (timer) clearTimeout(timer); }
  }
  private assertConfigured(): void {
    if (![env.CLOUDINARY_CLOUD_NAME, env.CLOUDINARY_API_KEY, env.CLOUDINARY_API_SECRET].every(Boolean) || !/^[A-Za-z0-9_-]+$/.test(env.CLOUDINARY_CLOUD_NAME)) throw new MediaProviderNotConfiguredError();
  }
  private assertIntent(intent: MediaUploadIntent): void {
    validatePublicId(intent.publicId);
    if (!mediaMimeAllowed(intent.purpose, intent.declaredMimeType) || intent.resourceType !== (intent.declaredMimeType.startsWith("image/") ? "image" : "video")) throw new MediaVerificationError("Unsupported media type for this purpose");
    if (!Number.isSafeInteger(intent.declaredBytes) || intent.declaredBytes < 1) throw new MediaVerificationError("Invalid media size");
    if (intent.declaredBytes > purposeLimits(intent.purpose, intent.declaredMimeType).maxBytes) throw new MediaTooLargeError();
  }
  private async validatePreset(mime: string, lookups?: Map<string, Promise<unknown>>): Promise<string> {
    this.assertConfigured();
    const name = mime.startsWith("image/") ? env.CLOUDINARY_MEDIA_IMAGE_PRESET : mime.startsWith("audio/") ? env.CLOUDINARY_MEDIA_AUDIO_PRESET : env.CLOUDINARY_MEDIA_VIDEO_PRESET;
    if (!name) throw new MediaProviderNotConfiguredError();
    let preset: Record<string, unknown>;
    try {
      let lookup = lookups?.get(name);
      if (!lookup) { lookup = this.providerRead(this.client.uploadPreset(name)); lookups?.set(name, lookup); }
      preset = record(await lookup);
    } catch { throw new MediaProviderUnavailableError(); }
    let s: Record<string, unknown>;
    try { s = record(preset.settings); } catch { throw new MediaProviderNotConfiguredError(); }
    const formats = Array.isArray(s.allowed_formats) ? s.allowed_formats : typeof s.allowed_formats === "string" ? s.allowed_formats.split(",").map((part) => part.trim()) : [];
    const allowed = mime.startsWith("image/") ? ["jpg", "png", "webp"] : mime.startsWith("audio/") ? ["mp3", "wav", "webm", "ogg"] : ["mp4", "webm"];
    const forbidden = ["format", "transformation", "eval", "on_success", "folder", "public_id", "public_id_prefix", "use_asset_folder_as_public_id_prefix", "access_control", "access_mode", "notification_url"];
    if (preset.name !== name || preset.unsigned !== false || s.type !== "authenticated" || s.overwrite !== false || !formats.length
      || formats.some((format) => typeof format !== "string" || !allowed.includes(format)) || !formats.includes(MEDIA_MIME_FORMATS[mime])
      || forbidden.some((key) => s[key] !== undefined && s[key] !== false && s[key] !== "" && s[key] !== null)) throw new MediaProviderNotConfiguredError();
    return name;
  }
  private async directAllowed(maxBytes: number): Promise<boolean> {
    try {
      const limits = record(record(await this.providerRead(this.client.usage())).media_limits);
      return ["image_max_size_bytes", "video_max_size_bytes", "raw_max_size_bytes"].every((key) => Number.isSafeInteger(limits[key]) && Number(limits[key]) > 0 && Number(limits[key]) <= maxBytes);
    } catch { return false; }
  }
  async prepareUpload(intent: MediaUploadIntent): Promise<DirectUploadGrant> {
    this.assertIntent(intent);
    if (!(await this.decoder.inspectReadiness())) throw new MediaProviderUnavailableError();
    const preset = await this.validatePreset(intent.declaredMimeType), timestamp = Math.floor(Date.now() / 1000);
    const params = { timestamp, public_id: intent.publicId, type: "authenticated", overwrite: false, upload_preset: preset, allowed_formats: MEDIA_MIME_FORMATS[intent.declaredMimeType] };
    const maxFileSize = purposeLimits(intent.purpose, intent.declaredMimeType).maxBytes;
    return { directAllowed: await this.directAllowed(maxFileSize), cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, publicId: intent.publicId,
      resourceType: intent.resourceType, maxFileSize, uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${intent.resourceType}/upload`,
      fields: { ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])), api_key: env.CLOUDINARY_API_KEY, signature: this.client.sign(params) } };
  }
  async uploadBuffer(intent: MediaUploadIntent, buffer: Buffer): Promise<void> {
    this.assertIntent(intent);
    if (buffer.length > purposeLimits(intent.purpose, intent.declaredMimeType).maxBytes) throw new MediaTooLargeError();
    if (buffer.length !== intent.declaredBytes) throw new MediaVerificationError("Media size does not match its reservation");
    await this.decoder.verify(buffer, intent.declaredMimeType, intent.purpose);
    const preset = await this.validatePreset(intent.declaredMimeType);
    try {
      const identity = identityOf(await this.providerRead(this.client.upload(buffer, { public_id: intent.publicId, resource_type: intent.resourceType, type: "authenticated",
        overwrite: false, upload_preset: preset, allowed_formats: [MEDIA_MIME_FORMATS[intent.declaredMimeType]] })));
      if (identity.publicId !== intent.publicId || identity.resourceType !== intent.resourceType || identity.format !== MEDIA_MIME_FORMATS[intent.declaredMimeType]) throw new MediaVerificationError();
    } catch (error) { if (error instanceof MediaVerificationError) throw error; throw new MediaProviderUnavailableError(); }
  }
  async verifyUpload(intent: MediaUploadIntent, expectedIdentity?: ProviderIdentity): Promise<VerifiedMedia> {
    this.assertConfigured(); this.assertIntent(intent);
    let metadata: Record<string, unknown>;
    try { metadata = record(await this.providerRead(this.client.resource(intent.publicId, intent.resourceType))); }
    catch (error) { if (!expectedIdentity && isNotFound(error)) throw new MediaUploadNotFoundError(); throw new MediaProviderUnavailableError(); }
    const identity = identityOf(metadata), limits = purposeLimits(intent.purpose, intent.declaredMimeType);
    if (identity.publicId !== intent.publicId || identity.resourceType !== intent.resourceType || identity.format !== MEDIA_MIME_FORMATS[intent.declaredMimeType]
      || (expectedIdentity && !sameIdentity(identity, expectedIdentity))) throw new MediaVerificationError("Provider asset does not match its reservation");
    if (!Number.isSafeInteger(metadata.bytes) || Number(metadata.bytes) < 1) throw new MediaVerificationError();
    if (Number(metadata.bytes) > limits.maxBytes) throw new MediaTooLargeError();
    const url = this.client.downloadUrl(identity), parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "api.cloudinary.com" || parsed.username || parsed.password
      || parsed.pathname !== `/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${intent.resourceType}/download`) throw new MediaVerificationError("Invalid provider delivery destination");
    let buffer: Buffer;
    try {
      const response = await this.fetcher(url, { redirect: "error", signal: AbortSignal.timeout(env.MEDIA_PROVIDER_TIMEOUT_MS) });
      if (!response.ok || !response.body) throw new MediaProviderUnavailableError();
      const chunks: Buffer[] = []; let bytes = 0; const reader = response.body.getReader();
      try {
        for (;;) { const next = await reader.read(); if (next.done) break; bytes += next.value.byteLength;
          if (bytes > limits.maxBytes) { await reader.cancel(); throw new MediaTooLargeError(); } chunks.push(Buffer.from(next.value)); }
      } finally { reader.releaseLock(); }
      buffer = Buffer.concat(chunks, bytes);
    } catch (error) { if (error instanceof MediaTooLargeError || error instanceof MediaVerificationError) throw error; throw new MediaProviderUnavailableError(); }
    // Content-Type/Length never attest the downloaded bytes.
    if (buffer.length !== Number(metadata.bytes) || buffer.length !== intent.declaredBytes || (metadata.upload_bytes !== undefined && buffer.length !== Number(metadata.upload_bytes))) throw new MediaVerificationError("Provider byte count does not match its asset");
    const decoded = await this.decoder.verify(buffer, intent.declaredMimeType, intent.purpose);
    if ((decoded.width !== undefined && Number(metadata.width) !== decoded.width) || (decoded.height !== undefined && Number(metadata.height) !== decoded.height)
      || (decoded.duration !== undefined && (!Number.isFinite(Number(metadata.duration)) || Math.abs(Number(metadata.duration) - decoded.duration) > Math.max(0.1, decoded.duration * 0.01)))) throw new MediaVerificationError("Provider media metadata does not match its bytes");
    await this.verifyIdentity(identity);
    return { ...identity, ...decoded };
  }
  async verifyIdentity(identity: ProviderIdentity): Promise<void> {
    this.assertConfigured(); validatePublicId(identity.publicId);
    let current: unknown;
    try { current = await this.providerRead(this.client.resourceByAssetId(identity.assetId)); } catch { throw new MediaProviderUnavailableError(); }
    if (!sameIdentity(identity, identityOf(current))) throw new MediaVerificationError("Provider asset changed during verification");
    try { current = await this.providerRead(this.client.resource(identity.publicId, identity.resourceType)); } catch { throw new MediaProviderUnavailableError(); }
    if (!sameIdentity(identity, identityOf(current))) throw new MediaVerificationError("Provider public identity changed during verification");
  }
  signedDeliveryUrl(identity: ProviderIdentity): string { this.assertConfigured(); validatePublicId(identity.publicId); return this.client.downloadUrl(identity); }
  signedPosterUrl(identity: ProviderIdentity): string | null {
    this.assertConfigured(); validatePublicId(identity.publicId);
    return identity.resourceType === "video" && ["mp4", "webm"].includes(identity.format) ? this.client.posterUrl(identity) : null;
  }
  async deleteAsset(identity: ProviderIdentity): Promise<void> {
    this.assertConfigured(); validatePublicId(identity.publicId);
    try { const result = record(await this.providerRead(this.client.deleteByAssetIds([identity.assetId])));
      if (!["deleted", "not_found"].includes(String(record(result.deleted)[identity.assetId]))) throw new MediaProviderUnavailableError();
    } catch (error) { if (!isNotFound(error)) throw new MediaProviderUnavailableError(); }
  }
  async deleteExpected(publicId: string, resourceType: "image" | "video" | "raw"): Promise<void> {
    this.assertConfigured(); validatePublicId(publicId);
    try { const response = record(await this.providerRead(this.client.destroy(publicId, resourceType)));
      if (!["ok", "not found"].includes(String(response.result))) throw new MediaProviderUnavailableError();
    } catch (error) { if (!isNotFound(error)) throw new MediaProviderUnavailableError(); }
  }
  async deletePendingUpload(intent: MediaUploadIntent): Promise<void> {
    const results = await Promise.allSettled((["image", "video", "raw"] as const).map((type) => this.deleteExpected(intent.publicId, type)));
    if (results.some((result) => result.status === "rejected")) throw new MediaProviderUnavailableError();
  }
  async deleteUpload(intent: MediaUploadIntent): Promise<void> { await this.deletePendingUpload(intent); }
  async inspectReadiness(): Promise<ProviderReadiness> {
    const result: ProviderReadiness = { storage: false, presets: false, direct: false, errorCodes: [] };
    let usage: unknown;
    try { this.assertConfigured(); usage = await this.providerRead(this.client.usage()); result.storage = true; }
    catch { result.errorCodes.push("media_storage_not_verified"); return result; }
    try {
      const lookups = new Map<string, Promise<unknown>>();
      for (const mime of ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg"]) await this.validatePreset(mime, lookups);
      result.presets = true;
      const limits = usage && typeof usage === "object" ? (usage as { media_limits?: unknown }).media_limits : undefined;
      if (limits && typeof limits === "object") result.direct = ["image_max_size_bytes", "video_max_size_bytes", "raw_max_size_bytes"].every((key) => {
        const limit = (limits as Record<string, unknown>)[key]; return Number.isSafeInteger(limit) && Number(limit) > 0 && Number(limit) <= 2 * 1024 * 1024;
      });
    } catch { result.errorCodes.push("media_preset_not_verified"); }
    return result;
  }
  // Legacy URL-returning methods cannot bypass lifecycle moderation in any environment.
  createDirectUploadSignature(..._args: unknown[]): never { throw new MediaModerationUnavailableError(); }
  async uploadAvatar(..._args: unknown[]): Promise<string> { throw new MediaModerationUnavailableError(); }
  async uploadImage(..._args: unknown[]): Promise<string> { throw new MediaModerationUnavailableError(); }
  async uploadVideo(..._args: unknown[]): Promise<string> { throw new MediaModerationUnavailableError(); }
  async uploadAudio(..._args: unknown[]): Promise<string> { throw new MediaModerationUnavailableError(); }
}
