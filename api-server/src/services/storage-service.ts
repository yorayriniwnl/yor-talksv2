import { v2 as cloudinary } from "cloudinary";
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

export class StorageService {
  async uploadAvatar(buffer: Buffer, originalName: string): Promise<string> {
    return this.uploadBuffer(buffer, "image", "avatars", originalName);
  }

  async uploadImage(buffer: Buffer, originalName: string): Promise<string> {
    return this.uploadBuffer(buffer, "image", "posts", originalName);
  }

  async uploadVideo(buffer: Buffer, originalName: string): Promise<string> {
    return this.uploadBuffer(buffer, "video", "posts", originalName);
  }

  async uploadAudio(buffer: Buffer, originalName: string): Promise<string> {
    // Cloudinary serves audio through its video resource type. Keeping a
    // separate folder makes retention and moderation policies easier to apply.
    return this.uploadBuffer(buffer, "video", "audio", originalName, "audio/webm");
  }

  private async uploadBuffer(
    buffer: Buffer,
    resourceType: "image" | "video",
    folder: string,
    originalName: string,
    fallbackMimeType?: string,
  ): Promise<string> {
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
