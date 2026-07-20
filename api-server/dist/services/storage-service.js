import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});
export class StorageService {
    async uploadAvatar(buffer, originalName) {
        return this.uploadBuffer(buffer, "image", "avatars");
    }
    async uploadImage(buffer, originalName) {
        return this.uploadBuffer(buffer, "image", "posts");
    }
    async uploadVideo(buffer, originalName) {
        return this.uploadBuffer(buffer, "video", "posts");
    }
    async uploadBuffer(buffer, resourceType, folder) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({ resource_type: resourceType, folder }, (error, result) => {
                if (error) {
                    return reject(error);
                }
                if (!result) {
                    return reject(new Error("Unknown Cloudinary error"));
                }
                resolve(result.secure_url);
            });
            uploadStream.end(buffer);
        });
    }
}
//# sourceMappingURL=storage-service.js.map