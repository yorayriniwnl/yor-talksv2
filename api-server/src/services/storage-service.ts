import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
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

  private async uploadBuffer(
    buffer: Buffer,
    resourceType: "image" | "video",
    folder: string,
    originalName: string
  ): Promise<string> {
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
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
        console.warn("Cloudinary upload failed, falling back to data URL:", err);
      }
    }
    // Fallback for dev / unconfigured Cloudinary: return a data URL
    const mimeType = resourceType === "video" ? "video/mp4" : "image/jpeg";
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }
}

