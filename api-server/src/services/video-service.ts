import { randomUUID } from "node:crypto";
import { VideoRepository } from "../repositories/video-repository.js";
import type { VideoRecord } from "../types/index.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { ContentSafetyService } from "./content-safety-service.js";

export class VideoService {
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
  ) {}

  async createVideo(input: {
    authorId: string;
    videoUrl: string;
    thumbnailUrl: string;
    title: string;
    type: string;
    contentRating?: VideoRecord["contentRating"];
  }): Promise<VideoRecord> {
    const video: VideoRecord = {
      id: randomUUID(),
      ...input,
      views: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    return this.videoRepository.create(video);
  }

  async listVideos(viewerId?: string): Promise<VideoRecord[]> {
    return this.contentSafetyService.filterVisible(await this.videoRepository.list(), viewerId);
  }

  async getVideo(id: string, viewerId?: string, countView = true): Promise<VideoRecord | undefined> {
    const existing = await this.videoRepository.findById(id);
    if (!(await this.contentSafetyService.isVisible(existing, viewerId))) return undefined;
    if (countView) {
      const updated = await this.videoRepository.incrementViews(id);
      if (updated) return updated;
    }
    return existing;
  }

  async toggleLike(videoId: string, userId: string): Promise<VideoRecord | undefined> {
    const video = await this.videoRepository.findById(videoId);
    if (!video || !(await this.contentSafetyService.isVisible(video, userId))) return undefined;
    const currentLikes = video.likedBy ?? [];
    const likedBy = currentLikes.includes(userId)
      ? currentLikes.filter((id) => id !== userId)
      : [...currentLikes, userId];
    return this.videoRepository.update(videoId, { likedBy });
  }

  async deleteVideo(id: string, userId: string): Promise<boolean> {
    const video = await this.videoRepository.findById(id);
    if (!video || video.authorId !== userId) {
      return false;
    }
    return this.videoRepository.delete(id);
  }
}
