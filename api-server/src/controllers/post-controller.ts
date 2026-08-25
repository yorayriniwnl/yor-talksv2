import { ai } from '../services/ai/AIGateway.js';
import { type Request, type Response } from "express";
import { PostService } from "../services/post-service.js";
import { PaginationService } from "../services/pagination-service.js";
import { StorageService } from "../services/storage-service.js";
import { createResponse } from "../utils/response.js";

function parsePagination(req: Request): { page: number; pageSize: number } {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  return { page, pageSize };
}

export class PostController {
  private readonly paginationService = new PaginationService();
  private readonly storageService = new StorageService();

  constructor(private readonly postService: PostService) {}

  getPost = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const post = await this.postService.getPost(postId, req.user?.id);
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post loaded", post));
  };

  uploadImage = async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json(createResponse("No image file provided", null, {}, ["Expected a multipart file field named 'image'"]));
    }
    try {
      const url = await this.storageService.uploadImage(file.buffer, file.originalname);
      return res.status(201).json(createResponse("Image uploaded", { url }));
    } catch (error) {
      return res.status(502).json(createResponse("Image upload failed", null, {}, [error instanceof Error ? error.message : "Upload provider error"]));
    }
  };

  createPost = async (req: Request, res: Response) => {
    
    const content = typeof req.body.content === "string" ? req.body.content : "";
    
    // AI Moderation check
    if (content) {
      try {
        const modResult = await ai.moderateContent(content);
        if (modResult.isToxic) {
          return res.status(400).json({ success: false, error: "Content violated community guidelines", flags: modResult.flags });
        }
      } catch (e) {
        console.error("Moderation check failed (soft fail):", e);
      }
    }

    const images = Array.isArray(req.body.images) ? req.body.images : [];
    const post = await this.postService.createPost(req.user?.id ?? "", content, images, req.body.contentCategory, req.body.contentRating);
    return res.status(201).json(createResponse("Post created", post));
  };

  deletePost = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const deleted = await this.postService.deletePost(postId, req.user?.id ?? "");
    if (!deleted) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post deleted", null));
  };

  editPost = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const post = await this.postService.editPost(postId, req.user?.id ?? "", content, req.body.contentRating);
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post updated", post));
  };

  like = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const post = await this.postService.likePost(postId, req.user?.id ?? "");
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post liked", post));
  };

  unlike = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const post = await this.postService.unlikePost(postId, req.user?.id ?? "");
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post unliked", post));
  };

  comment = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const result = await this.postService.commentOnPost(postId, req.user?.id ?? "", content);
    if (!result) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(201).json(createResponse("Comment created", result));
  };

  reply = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const commentId = typeof req.params.commentId === "string" ? req.params.commentId : "";
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const result = await this.postService.replyToComment(postId, commentId, req.user?.id ?? "", content);
    if (!result) {
      return res.status(404).json(createResponse("Comment not found", null, {}, ["Comment not found"]));
    }
    return res.status(201).json(createResponse("Reply created", result));
  };

  bookmark = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const post = await this.postService.bookmarkPost(postId, req.user?.id ?? "");
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post bookmarked", post));
  };

  share = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const post = await this.postService.sharePost(postId, req.user?.id ?? "");
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Share count updated", post));
  };

  
  feed = async (req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const cursor = req.query.cursor as string | undefined;
    const items = await this.postService.getFeed(cursor, limit, req.user?.id);
    const nextCursor = items.length === limit ? items[items.length - 1].createdAt : null;
    return res.status(200).json(createResponse("Feed loaded", items, { nextCursor, limit }));
  };

  trendingFeed = async (req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const cursorStr = req.query.cursor as string | undefined;
    const cursor = cursorStr ? Number(cursorStr) : undefined;
    const items = await this.postService.getTrendingFeed(cursor, limit, req.user?.id);
    const nextCursor = items.length === limit ? items[items.length - 1].score : null;
    return res.status(200).json(createResponse("Trending feed loaded", items, { nextCursor, limit }));
  };

  userFeed = async (req: Request, res: Response) => {
    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const cursor = req.query.cursor as string | undefined;
    const items = await this.postService.getUserFeed(userId, cursor, limit, req.user?.id);
    const nextCursor = items.length === limit ? items[items.length - 1].createdAt : null;
    return res.status(200).json(createResponse("User feed loaded", items, { nextCursor, limit }));
  };

}
