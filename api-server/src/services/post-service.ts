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

  createPost(authorId: string, content: string, images: string[]): PostRecord {
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
    };
    return this.postRepository.create(post);
  }

  deletePost(postId: string): boolean {
    return this.postRepository.delete(postId);
  }

  editPost(postId: string, content: string): PostRecord | undefined {
    return this.postRepository.update(postId, { content });
  }

  likePost(postId: string, userId: string): PostRecord | undefined {
    const post = this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    if (!post.likedBy.includes(userId)) {
      post.likedBy.push(userId);
      this.postRepository.update(postId, { likedBy: post.likedBy });
      const author = this.userRepository.findById(post.authorId);
      if (author) {
        this.notificationRepository.create({
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

  unlikePost(postId: string, userId: string): PostRecord | undefined {
    const post = this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    post.likedBy = post.likedBy.filter((entry) => entry !== userId);
    return this.postRepository.update(postId, { likedBy: post.likedBy });
  }

  commentOnPost(postId: string, authorId: string, content: string): { post: PostRecord; comment: CommentRecord } | undefined {
    const post = this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    const comment: CommentRecord = {
      id: randomUUID(),
      authorId,
      content,
      createdAt: new Date().toISOString(),
      replies: [],
    };
    post.comments.push(comment);
    this.postRepository.update(postId, { comments: post.comments });
    return { post, comment };
  }

  replyToComment(postId: string, commentId: string, authorId: string, content: string): { post: PostRecord; reply: ReplyRecord } | undefined {
    const post = this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    const comment = post.comments.find((entry) => entry.id === commentId);
    if (!comment) {
      return undefined;
    }
    const reply: ReplyRecord = {
      id: randomUUID(),
      authorId,
      content,
      createdAt: new Date().toISOString(),
    };
    comment.replies.push(reply);
    this.postRepository.update(postId, { comments: post.comments });
    return { post, reply };
  }

  bookmarkPost(postId: string, userId: string): PostRecord | undefined {
    const post = this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    if (!post.bookmarkedBy.includes(userId)) {
      post.bookmarkedBy.push(userId);
      this.postRepository.update(postId, { bookmarkedBy: post.bookmarkedBy });
    }
    return post;
  }

  sharePost(postId: string): PostRecord | undefined {
    const post = this.postRepository.findById(postId);
    if (!post) {
      return undefined;
    }
    post.shareCount += 1;
    return this.postRepository.update(postId, { shareCount: post.shareCount });
  }

  getFeed(): PostRecord[] {
    return this.postRepository.list();
  }

  getTrendingFeed(): PostRecord[] {
    return this.postRepository.list().slice(0, 10);
  }

  getUserFeed(userId: string): PostRecord[] {
    return this.postRepository.listByUser(userId);
  }
}
