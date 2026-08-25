import { randomUUID } from "node:crypto";
import { VideoRepository } from "../repositories/video-repository.js";
import type { VideoRecord } from "../types/index.js";

export class VideoService {
  constructor(private readonly videoRepository: VideoRepository) {}

  async createVideo(input: {
    authorId: string;
    videoUrl: string;
    thumbnailUrl: string;
    title: string;
    type: string;
  }): Promise<VideoRecord> {
    const video: VideoRecord = {
      id: randomUUID(),
      ...input,
      views: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
    };
    return this.videoRepository.create(video);
  }

  async listVideos(): Promise<VideoRecord[]> {
    return this.videoRepository.list();
  }

  async getVideo(id: string, countView = true): Promise<VideoRecord | undefined> {
    if (countView) {
      const updated = await this.videoRepository.incrementViews(id);
      if (updated) return updated;
    }
    return this.videoRepository.findById(id);
  }

  async toggleLike(videoId: string, userId: string): Promise<VideoRecord | undefined> {
    const video = await this.videoRepository.findById(videoId);
    if (!video) return undefined;
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
