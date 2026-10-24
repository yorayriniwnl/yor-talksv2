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
import { visibleCollectionPage } from '../utils/saved-collection-page.js';
import { withApprovedMedia, mediaBinding, attachmentFields, rejectRawMedia } from "./media-publication.js";
import { MediaLifecycleError } from "./media-service.js";
import { allowedExternalVideoUrl } from '../utils/external-video.js';

export function normalizeExternalVideoUrl(value: string): string {
  const url = allowedExternalVideoUrl(value);
  if (!url) throw new MediaLifecycleError("External video URL is not allowed", 400, "invalid_external_video");
  return url;
}

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
    mediaId?: string;
    externalVideoUrl?: string;
    thumbnailMediaId?: string;
    title: string;
    type: string;
    contentCategory?: VideoRecord["contentCategory"];
    contentRating?: VideoRecord["contentRating"];
  }): Promise<VideoRecord> {
    await enforceTextContentPolicy(input.title, this.aiService, "video");
    rejectRawMedia(input, ["videoUrl", "thumbnailUrl"]);
    if (Boolean(input.mediaId) === Boolean(input.externalVideoUrl) || (input.externalVideoUrl && !input.thumbnailMediaId)) throw new MediaLifecycleError("Choose approved video media or an external video with an approved thumbnail", 400, "invalid_video_media");
    const externalVideoUrl = input.externalVideoUrl ? normalizeExternalVideoUrl(input.externalVideoUrl) : "";
    const video: VideoRecord = {
      id: randomUUID(),
      ...input,
      videoUrl: externalVideoUrl,
      thumbnailUrl: "",
      views: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
      contentCategory: input.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    return withApprovedMedia(input.authorId, [
      ...mediaBinding(input.mediaId, "video", "videoUrl", "video"),
      ...mediaBinding(input.thumbnailMediaId, "video", "thumbnailUrl", "image"),
    ], { type: "videos", id: video.id }, media => {
      const thumbnailUrl = media.thumbnailUrl?.[0]?.url ?? media.videoUrl?.[0]?.thumbnailUrl;
      if (!thumbnailUrl) throw new MediaLifecycleError("Video poster is unavailable", 422, "media_poster_unavailable");
      return this.videoRepository.create({ ...video, videoUrl: media.videoUrl?.[0]?.url ?? externalVideoUrl, thumbnailUrl });
    });
  }

  async listVideos(viewerId?: string): Promise<VideoRecord[]> {
    const visible = await this.filterVisibleVideos(await this.videoRepository.list(), viewerId);
    if (!viewerId) return visible;
    const savedIds = new Set(await this.videoBookmarkRepository.listForUser(viewerId));
    return visible.map((video) => ({ ...video, savedByMe: savedIds.has(video.id) }));
  }

  async getVideo(id: string, viewerId?: string, countView = true): Promise<VideoRecord | undefined> {
    const existing = await this.videoRepository.findById(id);
    if (!existing || (viewerId && !(await this.contactShieldService.canView(viewerId, existing.authorId)))) return undefined;
    if (!(await this.contentSafetyService.isVisible(existing, viewerId, existing?.authorId))) return undefined;
    if (countView) {
      const updated = await this.videoRepository.incrementViews(id);
      if (updated) return updated;
    }
    return existing;
  }

  async toggleLike(videoId: string, userId: string): Promise<VideoRecord | undefined> {
    const video = await this.getVideo(videoId, userId, false);
    if (!video) return undefined;
    return this.videoRepository.toggleLike(videoId, userId);
  }

  async listComments(videoId: string, viewerId: string): Promise<VideoCommentRecord[]> {
    const video = await this.getVideo(videoId, viewerId, false);
    if (!video) return [];
    const shielded = await this.contactShieldService.getShieldedUserIds(viewerId);
    const comments = await this.videoCommentRepository.list(videoId);
    const candidates = comments.filter((comment) => !shielded.has(comment.authorId));
    const visibleComments = await this.contentSafetyService.filterVisibleByAuthor(candidates,viewerId,comment => comment.authorId);
    return Promise.all(visibleComments.map(async (comment) => {
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

  async commentOnVideo(videoId: string, authorId: string, content: string, attachment?: { mediaId?: string; mediaType?: string; mediaDuration?: number }): Promise<{ video: VideoRecord; comment: VideoCommentRecord } | undefined> {
    const video = await this.getVideo(videoId, authorId, false);
    if (!video) return undefined;
    if (!content.trim() && attachment?.mediaId === undefined) throw new MediaLifecycleError("Comment text or approved media is required", 400, "invalid_comment");
    await enforceTextContentPolicy(content, this.aiService, "video comment");
    rejectRawMedia(attachment ?? {}, ["mediaUrl"]);
    const id = randomUUID();
    const comment = await withApprovedMedia(authorId, mediaBinding(attachment?.mediaId, "video_comment", "mediaUrl"), { type: "video_comments", id }, media => this.videoCommentRepository.create({
      id,
      videoId,
      authorId,
      content,
      ...attachmentFields(media.mediaUrl?.[0]),
      createdAt: new Date().toISOString(),
      likedBy: [],
    }));
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
    const visible = await this.filterVisibleVideos(await this.videoRepository.listByIds(bookmarkIds), userId);
    return visible.map((video) => ({ ...video, savedByMe: true }));
  }

  async listBookmarkedVideosPage(userId: string, limit = 50, cursor?: string) {
    const shielded = await this.contactShieldService.getShieldedUserIds(userId);
    const page = await visibleCollectionPage({
      kind: 'saved_videos', ownerId: userId, limit, cursor,
      fetch: (position, size) => this.videoBookmarkRepository.listPageForUser(userId, position, size),
      filter: items => this.contentSafetyService.filterVisibleByAuthor(items.filter(video => !shielded.has(video.authorId)), userId, video => video.authorId),
    });
    return { ...page, data: page.data.map(video => ({ ...video, savedByMe: true })) };
  }

  private async filterVisibleVideos(videos: VideoRecord[], viewerId?: string): Promise<VideoRecord[]> {
    const shielded = viewerId ? await this.contactShieldService.getShieldedUserIds(viewerId) : new Set<string>();
    return this.contentSafetyService.filterVisibleByAuthor(videos.filter(video => !shielded.has(video.authorId)), viewerId, video => video.authorId);
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
