export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_PURPOSES = ["avatar", "post", "comment", "video_comment", "message", "story", "video", "product", "article", "event", "live_stream", "broadcast_channel", "highlight", "showcase", "business", "community"] as const;
export type MediaPurpose = typeof MEDIA_PURPOSES[number];
export type MediaResourceType = "image" | "video";
export type MediaFamily = "image" | "video" | "audio";

export const MEDIA_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MEDIA_VIDEO_MIMES = ["video/mp4", "video/webm"] as const;
export const MEDIA_AUDIO_MIMES = ["audio/mpeg", "audio/wav", "audio/webm", "audio/ogg"] as const;
export const MEDIA_MIME_FORMATS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/webm": "webm", "audio/mpeg": "mp3",
  "audio/wav": "wav", "audio/webm": "webm", "audio/ogg": "ogg",
};

export function mediaMimeAllowed(purpose: MediaPurpose, mimeType: string): boolean {
  if ((MEDIA_IMAGE_MIMES as readonly string[]).includes(mimeType)) return true;
  if ((MEDIA_VIDEO_MIMES as readonly string[]).includes(mimeType)) return ["story", "video"].includes(purpose);
  if ((MEDIA_AUDIO_MIMES as readonly string[]).includes(mimeType)) return ["comment", "video_comment", "message", "story"].includes(purpose);
  return false;
}

export function purposeLimits(purpose: MediaPurpose, mimeType: string) {
  const family = mimeType.split("/", 1)[0] as MediaFamily;
  const contentImage = ["post", "comment", "video_comment", "message", "story", "video"].includes(purpose);
  const maxBytes = purpose === "avatar" ? 2 * 1024 * 1024
    : family === "image" ? (contentImage ? 5 : 2) * 1024 * 1024
      : family === "audio" && purpose !== "story" ? 5 * 1024 * 1024 : MEDIA_MAX_BYTES;
  return {
    maxBytes, maxDuration: 120,
    maxWidth: purpose === "avatar" ? 2048 : family === "video" ? 1920 : 4096,
    maxHeight: purpose === "avatar" ? 2048 : family === "video" ? 1920 : 4096,
    maxEdge: purpose === "avatar" ? 2048 : family === "video" ? 1920 : 4096,
    maxShortEdge: family === "video" ? 1080 : Number.POSITIVE_INFINITY,
    maxPixels: purpose === "avatar" ? 4_000_000 : family === "video" ? 2_100_000 : 12_000_000,
  };
}
export const mediaLimits = purposeLimits;

export interface MediaUploadIntent {
  id: string;
  ownerId: string;
  purpose: MediaPurpose;
  publicId: string;
  resourceType: MediaResourceType;
  declaredMimeType: string;
  declaredBytes: number;
}

export interface ProviderIdentity {
  assetId: string;
  publicId: string;
  resourceType: MediaResourceType;
  deliveryType: "authenticated";
  version: number;
  format: string;
}

export interface DecodedMedia {
  buffer: Buffer;
  mimeType: string;
  bytes: number;
  sha256: string;
  width?: number;
  height?: number;
  /** Seconds, obtained from parsed timestamps and a complete decode. */
  duration?: number;
}
export interface VerifiedMedia extends ProviderIdentity, DecodedMedia {}

export interface DirectUploadGrant {
  directAllowed: boolean;
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  resourceType: MediaResourceType;
  publicId: string;
  maxFileSize: number;
  fields: Record<string, string>;
}

export interface ProviderReadiness {
  storage: boolean;
  presets: boolean;
  direct: boolean;
  errorCodes: string[];
}

export interface MediaProvider {
  prepareUpload(intent: MediaUploadIntent): Promise<DirectUploadGrant>;
  uploadBuffer(intent: MediaUploadIntent, buffer: Buffer): Promise<void>;
  verifyUpload(intent: MediaUploadIntent, expectedIdentity?: ProviderIdentity): Promise<VerifiedMedia>;
  /** Recheck immediately after moderation, before persisting approval. */
  verifyIdentity(identity: ProviderIdentity): Promise<void>;
  signedDeliveryUrl(identity: ProviderIdentity): string;
  signedPosterUrl(identity: ProviderIdentity): string | null;
  deleteAsset(identity: ProviderIdentity): Promise<void>;
  /** Unique reservation IDs only. Also cleans resource_type endpoint replays. */
  deletePendingUpload(intent: MediaUploadIntent): Promise<void>;
  deleteUpload(intent: MediaUploadIntent): Promise<void>;
  deleteExpected(publicId: string, resourceType: MediaResourceType | "raw"): Promise<void>;
  inspectReadiness(): Promise<ProviderReadiness>;
}

export class MediaProviderNotConfiguredError extends Error {
  constructor() { super("Media storage is not configured"); this.name = "MediaProviderNotConfiguredError"; }
}
export class MediaModerationUnavailableError extends Error {
  constructor() { super("Media moderation is unavailable"); this.name = "MediaModerationUnavailableError"; }
}
export class MediaProviderUnavailableError extends Error {
  constructor() { super("Media storage is temporarily unavailable"); this.name = "MediaProviderUnavailableError"; }
}
/** Only an initial reservation lookup without prior identity may report upload absence.
 * Identity rechecks after verification must remain ordinary provider failures. */
export class MediaUploadNotFoundError extends MediaProviderUnavailableError {
  constructor() { super(); this.name = "MediaUploadNotFoundError"; }
}
export class MediaVerificationError extends Error {
  constructor(message = "Media could not be verified") { super(message); this.name = "MediaVerificationError"; }
}
export class MediaTooLargeError extends Error {
  constructor() { super("Media exceeds the upload limit"); this.name = "MediaTooLargeError"; }
}
