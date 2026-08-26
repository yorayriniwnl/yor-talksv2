import { randomUUID } from "node:crypto";
import { VideoRepository } from "../repositories/video-repository.js";
import { VideoCommentRepository } from "../repositories/video-comment-repository.js";
import { VideoBookmarkRepository } from "../repositories/video-bookmark-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { VideoCommentRecord, VideoRecord } from "../types/index.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { DEFAULT_CONTENT_CATEGORY } from "../utils/content-category.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { ContactShieldService } from "./contact-shield-service.js";

export class VideoService {
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly videoCommentRepository: VideoCommentRepository = new VideoCommentRepository(),
    private readonly videoBookmarkRepository: VideoBookmarkRepository = new VideoBookmarkRepository(),
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
    private readonly aiService: AIService = new AIService(),
    private readonly contactShieldService: ContactShieldService = new ContactShieldService(),
    private readonly userRepository: UserRepository = new UserRepository(),
  ) {}

  async createVideo(input: {
    authorId: string;
    videoUrl: string;
    thumbnailUrl: string;
    title: string;
    type: string;
    contentCategory?: VideoRecord["contentCategory"];
    contentRating?: VideoRecord["contentRating"];
  }): Promise<VideoRecord> {
    await enforceTextContentPolicy(input.title, this.aiService, "video");
    const video: VideoRecord = {
      id: randomUUID(),
      ...input,
      views: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
      contentCategory: input.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    return this.videoRepository.create(video);
  }

  async listVideos(viewerId?: string): Promise<VideoRecord[]> {
    const visible = await this.contentSafetyService.filterVisibleByAuthor(await this.videoRepository.list(), viewerId, (video) => video.authorId);
    if (!viewerId) return visible;
    const savedIds = new Set(await this.videoBookmarkRepository.listForUser(viewerId));
    return visible.map((video) => ({ ...video, savedByMe: savedIds.has(video.id) }));
  }

  async getVideo(id: string, viewerId?: string, countView = true): Promise<VideoRecord | undefined> {
    const existing = await this.videoRepository.findById(id);
    if (!(await this.contentSafetyService.isVisible(existing, viewerId, existing?.authorId))) return undefined;
    if (countView) {
      const updated = await this.videoRepository.incrementViews(id);
      if (updated) return updated;
    }
    return existing;
  }

  async toggleLike(videoId: string, userId: string): Promise<VideoRecord | undefined> {
    const video = await this.videoRepository.findById(videoId);
    if (!video || !(await this.contentSafetyService.isVisible(video, userId, video.authorId))) return undefined;
    return this.videoRepository.toggleLike(videoId, userId);
  }

  async listComments(videoId: string, viewerId: string): Promise<VideoCommentRecord[]> {
    const video = await this.getVideo(videoId, viewerId, false);
    if (!video) return [];
    const shielded = await this.contactShieldService.getShieldedUserIds(viewerId);
    const comments = await this.videoCommentRepository.list(videoId);
    return Promise.all(comments.filter((comment) => !shielded.has(comment.authorId)).map(async (comment) => {
      const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
      const author = await this.getAuthor(comment.authorId);
      return {
        id: comment.id,
        videoId: comment.videoId,
        authorId: comment.authorId,
        content: comment.content,
        mediaUrl: comment.mediaUrl,
        mediaType: comment.mediaType,
        mediaDuration: comment.mediaDuration,
        createdAt: comment.createdAt,
        likes: likedBy.length,
        likedByMe: likedBy.includes(viewerId),
        author,
      };
    }));
  }

  async commentOnVideo(videoId: string, authorId: string, content: string, media?: Pick<VideoCommentRecord, "mediaUrl" | "mediaType" | "mediaDuration">): Promise<{ video: VideoRecord; comment: VideoCommentRecord } | undefined> {
    const video = await this.getVideo(videoId, authorId, false);
    if (!video) return undefined;
    await enforceTextContentPolicy(content, this.aiService, "video comment");
    const comment = await this.videoCommentRepository.create({
      id: randomUUID(),
      videoId,
      authorId,
      content,
      mediaUrl: media?.mediaUrl,
      mediaType: media?.mediaType,
      mediaDuration: media?.mediaDuration,
      createdAt: new Date().toISOString(),
      likedBy: [],
    });
    return { video, comment: await this.presentComment(comment, authorId) };
  }

  async toggleCommentLike(videoId: string, commentId: string, userId: string): Promise<VideoCommentRecord | undefined> {
    const video = await this.getVideo(videoId, userId, false);
    if (!video) return undefined;
    const comments = await this.videoCommentRepository.list(videoId);
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || !(await this.contactShieldService.canView(userId, comment.authorId))) return undefined;
    const updated = await this.videoCommentRepository.toggleLike(videoId, commentId, userId);
    return updated ? this.presentComment(updated, userId) : undefined;
  }

  async toggleBookmark(videoId: string, userId: string): Promise<VideoRecord | undefined> {
    const video = await this.getVideo(videoId, userId, false);
    if (!video) return undefined;
    const savedByMe = await this.videoBookmarkRepository.toggle(videoId, userId);
    return { ...video, savedByMe };
  }

  async listBookmarkedVideos(userId: string): Promise<VideoRecord[]> {
    const bookmarkIds = await this.videoBookmarkRepository.listForUser(userId);
    const visible = await this.contentSafetyService.filterVisibleByAuthor(await this.videoRepository.listByIds(bookmarkIds), userId, (video) => video.authorId);
    return visible.map((video) => ({ ...video, savedByMe: true }));
  }

  private async presentComment(comment: VideoCommentRecord, viewerId: string): Promise<VideoCommentRecord> {
    const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
    return {
      ...comment,
      likes: likedBy.length,
      likedByMe: likedBy.includes(viewerId),
      author: await this.getAuthor(comment.authorId),
    };
  }

  private async getAuthor(authorId: string) {
    const author = await this.userRepository.findById(authorId);
    return {
      id: authorId,
      username: author?.username ?? "user",
      fullName: author?.fullName ?? "User",
      avatarUrl: author?.avatarUrl ?? null,
    };
  }

  async deleteVideo(id: string, userId: string): Promise<boolean> {
    const video = await this.videoRepository.findById(id);
    if (!video || video.authorId !== userId) {
      return false;
    }
    return this.videoRepository.delete(id);
  }
}
