import { randomUUID } from "node:crypto";
import { NotificationRepository } from "../repositories/notification-repository.js";
import { PostRepository } from "../repositories/post-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import type { CommentRecord, PostRecord, ReplyRecord } from "../types/index.js";

export class PostService {
  constructor(
    private readonly postRepository: PostRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

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
    return this.postRepository.create(post);
  }

  async deletePost(postId: string): Promise<boolean> {
    return this.postRepository.delete(postId);
  }

  async editPost(postId: string, content: string): Promise<PostRecord | undefined> {
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
      if (author) {
        await this.notificationRepository.create({
          id: randomUUID(),
          recipientId: author.id,
          type: "like",
          title: "New like",
          message: `${userId} liked your post`,
          relatedId: post.id,
          createdAt: new Date().toISOString(),
          readAt: null,
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
