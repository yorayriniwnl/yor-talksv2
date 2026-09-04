import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export class MediaProviderNotConfiguredError extends Error {
  constructor() {
    super("Cloudinary media storage is not configured for this deployment");
    this.name = "MediaProviderNotConfiguredError";
  }
}

export class MediaModerationUnavailableError extends Error {
  constructor() {
    super("Media moderation is not configured for this deployment");
    this.name = "MediaModerationUnavailableError";
  }
}

export type DirectUploadResourceType = "image" | "video";
export type DirectUploadFolder = "posts" | "audio" | "avatars";

export interface DirectUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: DirectUploadFolder;
  publicId: string;
  signature: string;
  resourceType: DirectUploadResourceType;
  maxFileSize: number;
}

export class StorageService {
  createDirectUploadSignature(
    resourceType: DirectUploadResourceType,
    folder: DirectUploadFolder,
    ownerId: string,
  ): DirectUploadSignature {
    const cloudinaryConfigured = Boolean(
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
    );

    if (!cloudinaryConfigured) {
      throw new MediaProviderNotConfiguredError();
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `${ownerId}/${randomUUID()}`;
    const signature = cloudinary.utils.api_sign_request(
      { folder, public_id: publicId, timestamp },
      env.CLOUDINARY_API_SECRET,
    );

    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      timestamp,
      folder,
      publicId,
      signature,
      resourceType,
      maxFileSize: 10 * 1024 * 1024,
    };
  }

  async uploadAvatar(buffer: Buffer, originalName: string): Promise<string> {
    return this.uploadBuffer(buffer, "image", "avatars", originalName);
  }

  async uploadImage(buffer: Buffer, originalName: string): Promise<string> {
    return this.uploadBuffer(buffer, "image", "posts", originalName);
  }

  async uploadVideo(buffer: Buffer, originalName: string): Promise<string> {
    return this.uploadBuffer(buffer, "video", "posts", originalName);
  }

  async uploadAudio(buffer: Buffer, originalName: string, mimeType = "audio/webm"): Promise<string> {
    // Cloudinary serves audio through its video resource type. Keeping a
    // separate folder makes retention and moderation policies easier to apply.
    return this.uploadBuffer(buffer, "video", "audio", originalName, mimeType);
  }

  private async uploadBuffer(
    buffer: Buffer,
    resourceType: "image" | "video",
    folder: string,
    originalName: string,
    fallbackMimeType?: string,
  ): Promise<string> {
    if (env.NODE_ENV === "production") {
      throw new MediaModerationUnavailableError();
    }

    const cloudinaryConfigured = Boolean(
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
    );

    if (cloudinaryConfigured) {
      try {
        return await new Promise<string>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: resourceType, folder },
            (error, result) => {
              if (error || !result) {
                return reject(error || new Error("Cloudinary error"));
              }
              resolve(result.secure_url);
            }
          );
          uploadStream.end(buffer);
        });
      } catch (err) {
        console.error("Cloudinary upload failed", err);
        throw err;
      }
    }

    if ((env.NODE_ENV as string) === "production") {
      throw new MediaProviderNotConfiguredError();
    }

    // Local development/test fallback; production never stores user media in a data URL.
    const mimeType = fallbackMimeType || (resourceType === "video" ? "video/mp4" : "image/jpeg");
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }
}
