import { randomUUID } from "node:crypto";

export class StorageService {
  async uploadAvatar(buffer: Buffer, originalName: string): Promise<string> {
    return `https://res.cloudinary.com/demo/image/upload/${randomUUID()}-${originalName}`;
  }

  async uploadImage(buffer: Buffer, originalName: string): Promise<string> {
    return `https://res.cloudinary.com/demo/image/upload/${randomUUID()}-${originalName}`;
  }

  async uploadVideo(buffer: Buffer, originalName: string): Promise<string> {
    return `https://res.cloudinary.com/demo/video/upload/${randomUUID()}-${originalName}`;
  }
}
