import { randomUUID } from "node:crypto";
import { emitToUser } from "../lib/realtime.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { encodePostCursor, encodeTrendingCursor, PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { AIService } from "./ai-service.js";
import { QueueService } from "./queue-service.js";
import { SecurityService } from "./security-service.js";
import type { CommentRecord, NotificationRecord, PostRecord, ReplyRecord } from "../types/index.js";
import { db } from "@workspace/db";
import { commentsTable, postLikesTable, postBookmarksTable, postRepostsTable } from "@workspace/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { ContactShieldService } from "./contact-shield-service.js";
import { canViewContent, DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";
import { DEFAULT_CONTENT_CATEGORY } from "../utils/content-category.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { logger } from "../lib/logger.js";

export { ContentPolicyViolationError } from "./content-policy-service.js";

export class PostService {

  async moderateContent(content: string): Promise<{ spam: boolean; toxicity: boolean; nsfw: boolean }> {
    return this.aiService.moderate(content);
  }

  private async attachInteractions(posts: PostRecord[], userId?: string) {
    if (posts.length === 0) return posts;
    const postIds = posts.map(p => p.id);
    const polls = await this.postRepository.getPolls(postIds, userId);
    if (!userId) {
      return posts.map((post) => ({ ...post, ...(polls.get(post.id) ? { poll: polls.get(post.id) } : {}) }));
    }
    const [likes, bookmarks, reposts] = await Promise.all([
      db.select({ postId: postLikesTable.postId }).from(postLikesTable).where(and(inArray(postLikesTable.postId, postIds), eq(postLikesTable.userId, userId))),
      db.select({ postId: postBookmarksTable.postId }).from(postBookmarksTable).where(and(inArray(postBookmarksTable.postId, postIds), eq(postBookmarksTable.userId, userId))),
      db.select({ postId: postRepostsTable.postId }).from(postRepostsTable).where(and(inArray(postRepostsTable.postId, postIds), eq(postRepostsTable.userId, userId))),
    ]);

    const likedSet = new Set(likes.map(l => l.postId));
    const bookmarkedSet = new Set(bookmarks.map(b => b.postId));
    const repostedSet = new Set(reposts.map((repost) => repost.postId));

    return posts.map(p => ({
      ...p,
      likedByMe: likedSet.has(p.id),
      savedByMe: bookmarkedSet.has(p.id),
      repostedByMe: repostedSet.has(p.id),
      ...(polls.get(p.id) ? { poll: polls.get(p.id) } : {}),
    }));
  }

  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly queueService?: QueueService,
    private readonly aiService: AIService = new AIService(),
    private readonly securityService: SecurityService = new SecurityService(),
    private readonly contactShieldService: ContactShieldService = new ContactShieldService(),
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
  ) {}

  private async notify(input: NotificationRecord) {
    const notification = await this.notificationRepository.create(input);
    await this.queueService?.enqueue("notification:deliver", notification);
    emitToUser(notification.recipientId, "notification:new", notification);
    return notification;
  }

  async getPost(postId: string, currentUserId?: string): Promise<PostRecord | undefined> {
    const excludedAuthorIds = currentUserId ? [...await this.contactShieldService.getShieldedUserIds(currentUserId)] : [];
    const contentFilter = await this.contentSafetyService.getViewerFilter(currentUserId);
    const post = await this.postRepository.findById(postId, excludedAuthorIds, contentFilter);
    if (!post || !(await this.canViewAuthorContent(post.authorId, currentUserId))) return undefined;
    return (await this.attachInteractions([post], currentUserId))[0];
  }

  async createPost(
    authorId: string,
    content: string,
    images: string[],
    contentCategory = DEFAULT_CONTENT_CATEGORY,
    contentRating = DEFAULT_CONTENT_RATING,
    poll?: { question: string; options: Array<{ text: string }> },
  ): Promise<PostRecord> {
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
      repostCount: 0,
      reactions: {},
      tags,
      mentions,
      score: this.calculateScore({ likes: 0, shares: 0, comments: 0 }),
      contentCategory,
      contentRating,
    };
    await enforceTextContentPolicy([
      content,
      poll?.question ?? "",
      ...(poll?.options ?? []).map((option) => option.text),
    ].join("\n"), this.aiService, "post");
    const normalizedPoll = poll ? {
      id: randomUUID(),
      question: poll.question.trim(),
      options: poll.options.map((option, position) => ({ id: randomUUID(), text: option.text.trim(), position })),
    } : undefined;
    const created = await this.postRepository.create(post, normalizedPoll);
    return (await this.getPost(created.id, authorId)) ?? created;
  }

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const post = await this.postRepository.findById(postId);
    if (!post || post.authorId !== userId) return false;
    return this.postRepository.delete(postId);
  }

  async editPost(postId: string, userId: string, content: string, contentRating?: PostRecord["contentRating"], contentCategory?: PostRecord["contentCategory"]): Promise<PostRecord | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post || post.authorId !== userId) return undefined;
    await enforceTextContentPolicy(content, this.aiService, "post");
    return this.postRepository.update(postId, {
      content,
      tags: this.extractHashtags(content),
      mentions: this.extractMentions(content),
      ...(contentRating ? { contentRating } : {}),
      ...(contentCategory ? { contentCategory } : {}),
      updatedAt: new Date().toISOString(),
    });
  }

  
  async likePost(postId: string, userId: string): Promise<PostRecord | undefined> {
    if (!(await this.getPost(postId, userId))) return undefined;
    await this.postRepository.likePost(postId, userId);
    return this.getPost(postId, userId);
  }

  async unlikePost(postId: string, userId: string): Promise<PostRecord | undefined> {
    if (!(await this.getPost(postId, userId))) return undefined;
    await this.postRepository.unlikePost(postId, userId);
    return this.getPost(postId, userId);
  }

  async commentOnPost(
    postId: string,
    authorId: string,
    content: string,
    attachment?: { mediaUrl?: string; mediaType?: "image" | "gif" | "audio"; mediaDuration?: number },
  ): Promise<{ post: PostRecord; comment: CommentRecord } | undefined> {
    const post = await this.getPost(postId, authorId);
    if (!post) {
      return undefined;
    }
    const normalizedContent = content.trim();
    await enforceTextContentPolicy(normalizedContent, this.aiService, "comment");
    const createdComment = await db.transaction(async (tx) => {
      const [created] = await tx.insert(commentsTable).values({
        id: randomUUID(),
        postId,
        authorId,
        content: normalizedContent,
        mediaUrl: attachment?.mediaUrl,
        mediaType: attachment?.mediaType,
        mediaDuration: attachment?.mediaDuration,
      }).returning();
      await tx.execute(sql`
        UPDATE posts
        SET comments_count = comments_count + 1,
            score = (likes_count * 3) + ((comments_count + 1) * 2) + (share_count * 5),
            updated_at = NOW()
        WHERE id = ${postId}
      `);
      return created;
    });
    const updatedPost = await this.postRepository.findById(postId);
    const comment: CommentRecord = {
      id: createdComment.id,
      authorId: createdComment.authorId,
      content: createdComment.content,
      mediaUrl: createdComment.mediaUrl,
      mediaType: createdComment.mediaType as CommentRecord["mediaType"],
      mediaDuration: createdComment.mediaDuration,
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
    const post = await this.getPost(postId, authorId);
    if (!post) {
      return undefined;
    }
    await enforceTextContentPolicy(content, this.aiService, "reply");
    const [parentComment] = await db.select().from(commentsTable).where(and(
      eq(commentsTable.id, commentId),
      eq(commentsTable.postId, postId),
    ));
    if (!parentComment) {
      return undefined;
    }
    const createdReply = await db.transaction(async (tx) => {
      const [created] = await tx.insert(commentsTable).values({
        id: randomUUID(),
        postId,
        authorId,
        parentId: commentId,
        content,
      }).returning();
      await tx.update(commentsTable)
        .set({ repliesCount: sql`${commentsTable.repliesCount} + 1` })
        .where(eq(commentsTable.id, commentId));
      await tx.execute(sql`
        UPDATE posts
        SET comments_count = comments_count + 1,
            score = (likes_count * 3) + ((comments_count + 1) * 2) + (share_count * 5),
            updated_at = NOW()
        WHERE id = ${postId}
      `);
      return created;
    });
    const updatedPost = await this.postRepository.findById(postId);
    const reply: ReplyRecord = {
      id: createdReply.id,
      authorId: createdReply.authorId,
      content: createdReply.content,
      createdAt: createdReply.createdAt,
      reactions: (createdReply.reactions ?? {}) as Record<string, string[]>,
    };
    return { post: updatedPost ?? post, reply };
  }

  async toggleCommentLike(postId: string, commentId: string, userId: string): Promise<CommentRecord | undefined> {
    const post = await this.getPost(postId, userId);
    if (!post) return undefined;

    const [comment] = await db.select().from(commentsTable).where(and(
      eq(commentsTable.id, commentId),
      eq(commentsTable.postId, postId),
    ));
    if (!comment || !(await this.contactShieldService.canView(userId, comment.authorId))) return undefined;

    // Toggle the JSONB membership atomically so two devices cannot overwrite
    // each other's likes with a stale client-side array.
    const [updated] = await db.update(commentsTable).set({
      likedBy: sql`CASE WHEN ${commentsTable.likedBy} ? ${userId} THEN ${commentsTable.likedBy} - ${userId} ELSE ${commentsTable.likedBy} || jsonb_build_array(${userId}) END`,
      updatedAt: new Date().toISOString(),
    }).where(and(
      eq(commentsTable.id, commentId),
      eq(commentsTable.postId, postId),
    )).returning();
    if (!updated) return undefined;

    const likedBy = Array.isArray(updated.likedBy) ? updated.likedBy.filter((value): value is string => typeof value === "string") : [];
    return {
      id: updated.id,
      authorId: updated.authorId,
      content: updated.content,
      mediaUrl: updated.mediaUrl,
      mediaType: updated.mediaType as CommentRecord["mediaType"],
      mediaDuration: updated.mediaDuration,
      createdAt: updated.createdAt,
      replies: [],
      reactions: (updated.reactions ?? {}) as Record<string, string[]>,
      likes: likedBy.length,
      likedByMe: likedBy.includes(userId),
      repliesCount: updated.repliesCount ?? 0,
      parentId: updated.parentId,
    };
  }

  async listComments(postId: string, viewerId: string): Promise<Array<CommentRecord & { author: { id: string; username: string; fullName: string; avatarUrl: string | null } }>> {
    const post = await this.getPost(postId, viewerId);
    if (!post) return [];
    const excludedAuthorIds = viewerId ? await this.contactShieldService.getShieldedUserIds(viewerId) : new Set<string>();
    const rows = await db.select().from(commentsTable)
      .where(eq(commentsTable.postId, postId))
      .orderBy(asc(commentsTable.createdAt));
    const visibleRows = rows.filter((row) => !excludedAuthorIds.has(row.authorId));
    return Promise.all(visibleRows.filter((row) => !row.parentId).map(async (row) => {
      const author = await this.userRepository.findById(row.authorId);
      const likedBy = Array.isArray(row.likedBy) ? row.likedBy.filter((value): value is string => typeof value === "string") : [];
      const replies = visibleRows.filter((reply) => reply.parentId === row.id).map((reply) => ({
        id: reply.id,
        authorId: reply.authorId,
        content: reply.content,
        createdAt: reply.createdAt,
        reactions: (reply.reactions ?? {}) as Record<string, string[]>,
      }));
      return {
        id: row.id,
        authorId: row.authorId,
        content: row.content,
        mediaUrl: row.mediaUrl,
        mediaType: row.mediaType as CommentRecord["mediaType"],
        mediaDuration: row.mediaDuration,
        createdAt: row.createdAt,
        replies,
        reactions: (row.reactions ?? {}) as Record<string, string[]>,
        likes: likedBy.length,
        likedByMe: likedBy.includes(viewerId),
        repliesCount: row.repliesCount ?? replies.length,
        parentId: row.parentId,
        author: {
          id: row.authorId,
          username: author?.username ?? "user",
          fullName: author?.fullName ?? "User",
          avatarUrl: author?.avatarUrl ?? null,
        },
      };
    }));
  }

  async bookmarkPost(postId: string, userId: string): Promise<PostRecord | undefined> {
    const post = await this.getPost(postId, userId);
    if (!post) return undefined;
    await this.postRepository.toggleBookmark(postId, userId);
    return this.getPost(postId, userId);
  }

  async sharePost(postId: string, userId?: string): Promise<PostRecord | undefined> {
    const post = await this.getPost(postId, userId);
    if (!post) {
      return undefined;
    }
    await db.execute(sql`
      UPDATE posts
      SET share_count = share_count + 1,
          score = (likes_count * 3) + (comments_count * 2) + ((share_count + 1) * 5),
          updated_at = NOW()
      WHERE id = ${postId}
    `);
    return this.getPost(postId, userId);
  }

  async repostPost(postId: string, userId: string, note?: string): Promise<PostRecord | undefined> {
    if (!(await this.getPost(postId, userId))) return undefined;
    await this.postRepository.repostPost(postId, userId, note);
    return this.getPost(postId, userId);
  }

  async unrepostPost(postId: string, userId: string): Promise<PostRecord | undefined> {
    if (!(await this.getPost(postId, userId))) return undefined;
    await this.postRepository.unrepostPost(postId, userId);
    return this.getPost(postId, userId);
  }

  async votePoll(postId: string, optionId: string, userId: string): Promise<PostRecord | undefined> {
    if (!(await this.getPost(postId, userId))) return undefined;
    if (!(await this.postRepository.votePoll(postId, optionId, userId))) return undefined;
    return this.getPost(postId, userId);
  }

  async addReaction(postId: string, userId: string, reaction: string): Promise<PostRecord | undefined> {
    const post = await this.getPost(postId, userId);
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
    return this.getPost(postId, userId);
  }

  
  async getFeed(cursor?: string, limit: number = 20, currentUserId?: string): Promise<any[]> {
    const excludedAuthorIds = currentUserId ? [...await this.contactShieldService.getShieldedUserIds(currentUserId)] : [];
    const contentFilter = await this.contentSafetyService.getViewerFilter(currentUserId);
    const visible: PostRecord[] = [];
    let nextCursor = cursor;
    const pageSize = Math.min(100, Math.max(20, limit * 2));
    for (let page = 0; page < 10 && visible.length < limit; page += 1) {
      const candidates = await this.postRepository.list(nextCursor, pageSize, excludedAuthorIds, contentFilter);
      if (candidates.length === 0) break;
      visible.push(...await this.filterVisiblePosts(candidates, currentUserId));
      if (candidates.length < pageSize) break;
      nextCursor = encodePostCursor(candidates[candidates.length - 1]);
    }
    return this.attachInteractions(visible.slice(0, limit), currentUserId);
  }

    private redis = new Redis(env.REDIS_URL);

  async getTrendingFeed(cursor?: string, limit: number = 20, currentUserId?: string): Promise<any[]> {
    const excludedAuthorIds = currentUserId ? [...await this.contactShieldService.getShieldedUserIds(currentUserId)] : [];
    const contentFilter = await this.contentSafetyService.getViewerFilter(currentUserId);
    const pageSize = Math.min(100, Math.max(20, limit * 2));
    const cacheKey = `feed:trending:${cursor || "first"}:${pageSize}`;
    
    // Redis is an optimization, never a requirement for a healthy feed.
    let cached: string | null = null;
    try {
      cached = await this.redis.get(cacheKey);
    } catch (error) {
      logger.warn({ err: error }, "Trending feed cache read failed");
    }
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        cached = JSON.stringify(parsed);
      } catch (e) {
        cached = null;
      }
    }

    // Cache the unfiltered candidate set. Contact Shield visibility is per
    // viewer, so storing one user's filtered list would hide those posts from
    // every other viewer sharing the cache key.
    const visible: PostRecord[] = [];
    let nextCursor = cursor;
    let firstPage = true;
    for (let page = 0; page < 10 && visible.length < limit; page += 1) {
      let posts: PostRecord[];
      if (firstPage && cached) {
        posts = JSON.parse(cached) as PostRecord[];
      } else {
        posts = await this.postRepository.listTrending(nextCursor, pageSize);
        if (firstPage) {
          try {
            await this.redis.set(cacheKey, JSON.stringify(posts), "EX", 60);
          } catch (error) {
            logger.warn({ err: error }, "Trending feed cache write failed");
          }
        }
      }
      firstPage = false;
      if (posts.length === 0) break;
      const contentVisible = posts.filter((post) =>
        !excludedAuthorIds.includes(post.authorId) && canViewContent(post.contentRating, contentFilter),
      );
      visible.push(...await this.filterVisiblePosts(contentVisible, currentUserId));
      if (posts.length < pageSize) break;
      nextCursor = encodeTrendingCursor(posts[posts.length - 1]);
    }
    return this.attachInteractions(visible.slice(0, limit), currentUserId);
  }
  async getUserFeed(userId: string, cursor?: string, limit: number = 20, currentUserId?: string): Promise<any[]> {
    if (currentUserId && !(await this.contactShieldService.canView(currentUserId, userId))) return [];
    const excludedAuthorIds = currentUserId ? [...await this.contactShieldService.getShieldedUserIds(currentUserId)] : [];
    const contentFilter = await this.contentSafetyService.getViewerFilter(currentUserId);
    const visible: PostRecord[] = [];
    let nextCursor = cursor;
    const pageSize = Math.min(100, Math.max(20, limit * 2));
    for (let page = 0; page < 10 && visible.length < limit; page += 1) {
      const candidates = await this.postRepository.listByUser(userId, nextCursor, pageSize, excludedAuthorIds, contentFilter);
      if (candidates.length === 0) break;
      visible.push(...await this.filterVisiblePosts(candidates, currentUserId));
      if (candidates.length < pageSize) break;
      nextCursor = encodePostCursor(candidates[candidates.length - 1]);
    }
    return this.attachInteractions(visible.slice(0, limit), currentUserId);
  }

  async getSavedPosts(userId: string, limit = 100): Promise<any[]> {
    const excludedAuthorIds = [...await this.contactShieldService.getShieldedUserIds(userId)];
    const contentFilter = await this.contentSafetyService.getViewerFilter(userId);
    const posts = await this.postRepository.listBookmarked(userId, limit, excludedAuthorIds, contentFilter);
    return this.attachInteractions(await this.filterVisiblePosts(posts, userId), userId);
  }

  async getLikedPosts(userId: string, limit = 100): Promise<any[]> {
    const excludedAuthorIds = [...await this.contactShieldService.getShieldedUserIds(userId)];
    const contentFilter = await this.contentSafetyService.getViewerFilter(userId);
    const posts = await this.postRepository.listLiked(userId, limit, excludedAuthorIds, contentFilter);
    return this.attachInteractions(await this.filterVisiblePosts(posts, userId), userId);
  }

  private async filterVisiblePosts(posts: PostRecord[], viewerId?: string): Promise<PostRecord[]> {
    if (posts.length === 0 || !viewerId) return posts;
    const visible = await Promise.all(posts.map(async (post) => ({
      post,
      allowed: await this.canViewAuthorContent(post.authorId, viewerId),
    })));
    return visible.filter(({ allowed }) => allowed).map(({ post }) => post);
  }

  private async canViewAuthorContent(authorId: string, viewerId?: string): Promise<boolean> {
    if (!viewerId || authorId === viewerId) return true;
    const author = await this.userRepository.findById(authorId);
    if (!author) return false;
    const visibility = author.privacy?.profileVisibility ?? (author.settings?.privateAccount ? "private" : "public");
    return visibility === "public" || await this.userRepository.isFollowing(viewerId, authorId);
  }

  close(): void {
    this.redis.disconnect();
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
