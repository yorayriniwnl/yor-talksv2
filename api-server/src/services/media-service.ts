import { randomUUID } from "crypto";
import { StorageService } from "./storage-service.js";

export interface MediaUploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  blurhash?: string;
  hlsMasterUrl?: string;
  resolutions?: string[];
}

export interface HlsManifest {
  masterPlaylist: string;
  variants: {
    resolution: string;
    bitrate: number;
    playlistUrl: string;
  }[];
}

export class MediaService {
  private readonly storageService = new StorageService();

  /**
   * Process and save media buffer (Images / Videos)
   */
  async processUpload(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<MediaUploadResult> {
    const id = randomUUID();
    const isVideo = mimeType.startsWith("video/");
    
    const url = isVideo
      ? await this.storageService.uploadVideo(buffer, filename)
      : await this.storageService.uploadImage(buffer, filename);

    return {
      id,
      url,
      thumbnailUrl: url,
      mimeType,
      size: buffer.length,
    };
  }

  /** HLS transcoding is not provided by Cloudinary's basic upload path. */
  generateHlsManifest(mediaId: string): HlsManifest {
    throw new Error(`HLS transcoding is not configured for media ${mediaId}`);
  }
}
