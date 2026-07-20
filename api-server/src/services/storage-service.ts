import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export class StorageService {
  async uploadAvatar(buffer: Buffer, originalName: string): Promise<string> {
    return this.uploadBuffer(buffer, "image", "avatars");
  }

  async uploadImage(buffer: Buffer, originalName: string): Promise<string> {
    return this.uploadBuffer(buffer, "image", "posts");
  }

  async uploadVideo(buffer: Buffer, originalName: string): Promise<string> {
    return this.uploadBuffer(buffer, "video", "posts");
  }

  private async uploadBuffer(buffer: Buffer, resourceType: "image" | "video", folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, folder },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error("Unknown Cloudinary error"));
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(buffer);
    });
  }
}
