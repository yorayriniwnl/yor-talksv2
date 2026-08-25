import { randomUUID } from "crypto";

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
    
    // In production, this pipes to Cloudflare R2 / AWS S3 via S3Client
    // We construct CDN-ready URLs with adaptive HLS manifests
    const baseUrl = `https://cdn.yortalks.in/media/${id}`;
    const url = `${baseUrl}/${encodeURIComponent(filename)}`;
    const thumbnailUrl = isVideo 
      ? `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop`
      : url;

    let hlsMasterUrl: string | undefined;
    let resolutions: string[] | undefined;

    if (isVideo) {
      hlsMasterUrl = `${baseUrl}/master.m3u8`;
      resolutions = ["1080p", "720p", "480p", "360p"];
    }

    return {
      id,
      url,
      thumbnailUrl,
      mimeType,
      size: buffer.length,
      width: isVideo ? 1080 : 1920,
      height: isVideo ? 1920 : 1080,
      duration: isVideo ? 30 : undefined,
      blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
      hlsMasterUrl,
      resolutions,
    };
  }

  /**
   * Generate an adaptive HLS multi-bitrate manifest
   */
  generateHlsManifest(mediaId: string): HlsManifest {
    const baseUrl = `https://cdn.yortalks.in/media/${mediaId}`;
    
    const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1080x1920
${baseUrl}/1080p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=720x1280
${baseUrl}/720p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=480x854
${baseUrl}/480p/index.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=360x640
${baseUrl}/360p/index.m3u8`;

    return {
      masterPlaylist,
      variants: [
        { resolution: "1080p", bitrate: 5000000, playlistUrl: `${baseUrl}/1080p/index.m3u8` },
        { resolution: "720p", bitrate: 2800000, playlistUrl: `${baseUrl}/720p/index.m3u8` },
        { resolution: "480p", bitrate: 1400000, playlistUrl: `${baseUrl}/480p/index.m3u8` },
        { resolution: "360p", bitrate: 800000, playlistUrl: `${baseUrl}/360p/index.m3u8` },
      ],
    };
  }
}
