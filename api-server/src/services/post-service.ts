import { randomUUID } from "node:crypto";
import { emitToUser } from "../lib/realtime.js";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { AIService } from "./ai-service.js";
import { QueueService } from "./queue-service.js";
import { SecurityService } from "./security-service.js";
import type { CommentRecord, NotificationRecord, PostRecord, ReplyRecord } from "../types/index.js";

export class PostService {
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
      likedBy: [],
      comments: [],
      bookmarkedBy: [],
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
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    if (!post.likedBy.includes(userId)) {
      post.likedBy.push(userId);
      post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
      await this.postRepository.update(postId, { likedBy: post.likedBy, score: post.score });
      const author = await this.userRepository.findById(post.authorId);
      if (author && author.id !== userId) {
        const liker = await this.userRepository.findById(userId);
        await this.notify({
          id: randomUUID(),
          recipientId: author.id,
          type: "like",
          title: "New like",
          message: `${liker?.username ?? "Someone"} liked your post`,
          relatedId: post.id,
          createdAt: new Date().toISOString(),
          readAt: null,
          metadata: { actorId: userId },
        });
      }
    }
    return post;
  }

  async unlikePost(postId: string, userId: string): Promise<PostRecord | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    post.likedBy = post.likedBy.filter((entry: string) => entry !== userId);
    post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
    return this.postRepository.update(postId, { likedBy: post.likedBy, score: post.score });
  }

  async commentOnPost(postId: string, authorId: string, content: string): Promise<{ post: PostRecord; comment: CommentRecord } | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    const comment: CommentRecord = {
      id: randomUUID(),
      authorId,
      content,
      createdAt: new Date().toISOString(),
      replies: [],
      reactions: {},
    };
    post.comments.push(comment);
    post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
    await this.postRepository.update(postId, { comments: post.comments, score: post.score });
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
    return { post, comment };
  }

  async replyToComment(postId: string, commentId: string, authorId: string, content: string): Promise<{ post: PostRecord; reply: ReplyRecord } | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    const comment = post.comments.find((entry: CommentRecord) => entry.id === commentId);
    if (!comment) {
      return undefined;
    }
    const reply: ReplyRecord = {
      id: randomUUID(),
      authorId,
      content,
      createdAt: new Date().toISOString(),
      reactions: {},
    };
    comment.replies.push(reply);
    post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
    await this.postRepository.update(postId, { comments: post.comments, score: post.score });
    return { post, reply };
  }

  async bookmarkPost(postId: string, userId: string): Promise<PostRecord | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    if (!post.bookmarkedBy.includes(userId)) {
      post.bookmarkedBy.push(userId);
      await this.postRepository.update(postId, { bookmarkedBy: post.bookmarkedBy });
    }
    return post;
  }

  async sharePost(postId: string): Promise<PostRecord | undefined> {
    const post = await this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    post.shareCount += 1;
    post.score = this.calculateScore({ likes: post.likedBy.length, shares: post.shareCount, comments: post.comments.length });
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

  async getFeed(): Promise<PostRecord[]> {
    return this.sortPosts(await this.postRepository.list());
  }

  async getTrendingFeed(): Promise<PostRecord[]> {
    const posts = await this.postRepository.list();
    return this.sortPosts(posts).slice(0, 10);
  }

  async getUserFeed(userId: string): Promise<PostRecord[]> {
    return this.sortPosts(await this.postRepository.listByUser(userId));
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

  private sortPosts(posts: PostRecord[]): PostRecord[] {
    return [...posts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
}
