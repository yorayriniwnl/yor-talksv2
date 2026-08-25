import { randomUUID } from "node:crypto";
import { emitToUser } from "../lib/realtime.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { AIService } from "./ai-service.js";
import { QueueService } from "./queue-service.js";
import { SecurityService } from "./security-service.js";
import type { CommentRecord, NotificationRecord, PostRecord, ReplyRecord } from "../types/index.js";
import { db } from "@workspace/db";
import { commentsTable, postLikesTable, postBookmarksTable } from "@workspace/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

export class PostService {

  private async attachInteractions(posts: PostRecord[], userId?: string) {
    if (!userId || posts.length === 0) return posts;
    const postIds = posts.map(p => p.id);
    const { postLikesTable, postBookmarksTable } = await import("@workspace/db/schema");
    const { inArray, and, eq } = await import("drizzle-orm");
    const { db } = await import("@workspace/db");
    
    const [likes, bookmarks] = await Promise.all([
      db.select({ postId: postLikesTable.postId }).from(postLikesTable).where(and(inArray(postLikesTable.postId, postIds), eq(postLikesTable.userId, userId))),
      db.select({ postId: postBookmarksTable.postId }).from(postBookmarksTable).where(and(inArray(postBookmarksTable.postId, postIds), eq(postBookmarksTable.userId, userId)))
    ]);
    
    const likedSet = new Set(likes.map(l => l.postId));
    const bookmarkedSet = new Set(bookmarks.map(b => b.postId));
    
    return posts.map(p => ({
      ...p,
      likedByMe: likedSet.has(p.id),
      savedByMe: bookmarkedSet.has(p.id)
    }));
  }

  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly queueService?: QueueService,
    // Heuristic-only for now (see ai-service.ts) — flagged content is logged
    // for review, not auto-rejected, since the heuristics are too crude to
    // safely block real posts on.
    private readonly aiService: AIService = new AIService(),
    private readonly securityService: SecurityService = new SecurityService(),
  ) {}

  private async notify(input: NotificationRecord) {
    const notification = await this.notificationRepository.create(input);
    await this.queueService?.enqueue("notification:deliver", notification);
    emitToUser(notification.recipientId, "notification:new", notification);
    return notification;
  }

  async getPost(postId: string): Promise<PostRecord | undefined> {
    return this.postRepository.findById(postId);
  }

  async createPost(authorId: string, content: string, images: string[]): Promise<PostRecord> {
    const mentions = this.extractMentions(content);
    const tags = this.extractHashtags(content);
    const post: PostRecord = {
      id: randomUUID(),
      authorId,
      content,
      images,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
      bookmarksCount: 0,
      shareCount: 0,
      reactions: {},
      tags,
      mentions,
      score: this.calculateScore({ likes: 0, shares: 0, comments: 0 }),
    };
    const created = await this.postRepository.create(post);

    // Heuristic-only moderation (see ai-service.ts) — logged for review, not
    // auto-rejected, since keyword matching is too crude to safely block
    // real posts on.
    const moderation = await this.aiService.moderate(content);
    if (moderation.spam || moderation.toxicity || moderation.nsfw) {
      this.securityService.createAuditEvent(
        "content_flagged",
        `post ${created.id} by ${authorId} flagged: ${JSON.stringify(moderation)}`,
      );
    }

    return created;
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const post = await this.postRepository.findById(postId);
    if (!post || post.authorId !== userId) return false;
    return this.postRepository.delete(postId);
  }

  async editPost(postId: string, userId: string, content: string): Promise<PostRecord | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post || post.authorId !== userId) return undefined;
    return this.postRepository.update(postId, { content, updatedAt: new Date().toISOString() });
  }

  
  async likePost(postId: string, userId: string): Promise<PostRecord | undefined> {
    await this.postRepository.likePost(postId, userId);
    return this.postRepository.findById(postId);
  }

  async unlikePost(postId: string, userId: string): Promise<PostRecord | undefined> {
    await this.postRepository.unlikePost(postId, userId);
    return this.postRepository.findById(postId);
  }

  async commentOnPost(postId: string, authorId: string, content: string): Promise<{ post: PostRecord; comment: CommentRecord } | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    const [createdComment] = await db.insert(commentsTable).values({
      id: randomUUID(),
      postId,
      authorId,
      content,
    }).returning();
    const updatedPost = await this.postRepository.update(postId, {
      commentsCount: post.commentsCount + 1,
      score: this.calculateScore({ likes: post.likesCount, shares: post.shareCount, comments: post.commentsCount + 1 }),
    });
    const comment: CommentRecord = {
      id: createdComment.id,
      authorId: createdComment.authorId,
      content: createdComment.content,
      createdAt: createdComment.createdAt,
      replies: [],
      reactions: (createdComment.reactions ?? {}) as Record<string, string[]>,
    };
    if (post.authorId !== authorId) {
      const commenter = await this.userRepository.findById(authorId);
      await this.notify({
        id: randomUUID(),
        recipientId: post.authorId,
        type: "comment",
        title: "New comment",
        message: `${commenter?.username ?? "Someone"} commented on your post`,
        relatedId: post.id,
        createdAt: new Date().toISOString(),
        readAt: null,
        metadata: { actorId: authorId },
      });
    }
    return { post: updatedPost ?? post, comment };
  }

  async replyToComment(postId: string, commentId: string, authorId: string, content: string): Promise<{ post: PostRecord; reply: ReplyRecord } | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    const [parentComment] = await db.select().from(commentsTable).where(and(
      eq(commentsTable.id, commentId),
      eq(commentsTable.postId, postId),
    ));
    if (!parentComment) {
      return undefined;
    }
    const [createdReply] = await db.insert(commentsTable).values({
      id: randomUUID(),
      postId,
      authorId,
      parentId: commentId,
      content,
    }).returning();
    await db.update(commentsTable)
      .set({ repliesCount: sql`${commentsTable.repliesCount} + 1` })
      .where(eq(commentsTable.id, commentId));
    const updatedPost = await this.postRepository.update(postId, {
      commentsCount: post.commentsCount + 1,
      score: this.calculateScore({ likes: post.likesCount, shares: post.shareCount, comments: post.commentsCount + 1 }),
    });
    const reply: ReplyRecord = {
      id: createdReply.id,
      authorId: createdReply.authorId,
      content: createdReply.content,
      createdAt: createdReply.createdAt,
      reactions: (createdReply.reactions ?? {}) as Record<string, string[]>,
    };
    return { post: updatedPost ?? post, reply };
  }

  async bookmarkPost(postId: string, userId: string): Promise<PostRecord | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) return undefined;
    await this.postRepository.toggleBookmark(postId, userId);
    return this.postRepository.findById(postId);
  }

  async sharePost(postId: string): Promise<PostRecord | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    post.shareCount += 1;
    post.score = this.calculateScore({ likes: post.likesCount, shares: post.shareCount, comments: post.commentsCount });
    return this.postRepository.update(postId, { shareCount: post.shareCount, score: post.score });
  }

  async addReaction(postId: string, userId: string, reaction: string): Promise<PostRecord | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    const reactions = post.reactions ?? {};
    const current = reactions[reaction] ?? [];
    if (!current.includes(userId)) {
      current.push(userId);
      reactions[reaction] = current;
      post.reactions = reactions;
      await this.postRepository.update(postId, { reactions: post.reactions });
    }
    return post;
  }

  
  async getFeed(cursor?: string, limit: number = 20, currentUserId?: string): Promise<any[]> {
    return this.attachInteractions(await this.postRepository.list(cursor, limit), currentUserId);
  }

    private redis = new Redis(env.REDIS_URL);

  async getTrendingFeed(cursor?: number, limit: number = 20, currentUserId?: string): Promise<any[]> {
    const cacheKey = `feed:trending:${cursor || 0}:${limit}`;
    
    // Try Redis cache first (Phase 5 Caching Architecture)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return this.attachInteractions(parsed, currentUserId);
      } catch (e) { /* ignore parse error */ }
    }

    const posts = await (this.postRepository as any).listTrending(cursor, limit);
    
    // Cache for 60 seconds
    await this.redis.set(cacheKey, JSON.stringify(posts), "EX", 60);
    return this.attachInteractions(posts, currentUserId);
  }
  async getUserFeed(userId: string, cursor?: string, limit: number = 20, currentUserId?: string): Promise<any[]> {
    return this.attachInteractions(await this.postRepository.listByUser(userId, cursor, limit), currentUserId);
  }


  private extractMentions(content: string): string[] {
    return [...content.matchAll(/@([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
  }

  private extractHashtags(content: string): string[] {
    return [...content.matchAll(/#([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
  }

  private calculateScore(input: { likes: number; shares: number; comments: number }): number {
    return input.likes * 3 + input.shares * 5 + input.comments * 2;
  }

  
}
