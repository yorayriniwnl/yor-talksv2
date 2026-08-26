import { type Request, type Response } from "express";
import { encodePostCursor, encodeTrendingCursor } from "../repositories/post-repository.js";
import { ContentPolicyViolationError, PostService } from "../services/post-service.js";
import { PaginationService } from "../services/pagination-service.js";
import { StorageService } from "../services/storage-service.js";
import { assertValidUploadedFile } from "../middlewares/upload.js";
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
      assertValidUploadedFile(file, "image");
      const url = await this.storageService.uploadImage(file.buffer, file.originalname);
      return res.status(201).json(createResponse("Image uploaded", { url }));
    } catch (error) {
      if (error instanceof Error && error.name === "InvalidFileTypeError") {
        return res.status(415).json(createResponse("Invalid image file", null, {}, [error.message]));
      }
      return res.status(502).json(createResponse("Image upload failed", null, {}, ["Upload provider error"]));
    }
  };

  createPost = async (req: Request, res: Response) => {
    
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const images = Array.isArray(req.body.images) ? req.body.images : [];
    try {
      const post = await this.postService.createPost(req.user?.id ?? "", content, images, req.body.contentCategory, req.body.contentRating, req.body.poll);
      return res.status(201).json(createResponse("Post created", post));
    } catch (error) {
      if (error instanceof ContentPolicyViolationError) {
        return res.status(422).json(createResponse(error.message, null, {}, Object.entries(error.flags).filter(([, value]) => value).map(([key]) => key)));
      }
      throw error;
    }
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
    let post;
    try {
      post = await this.postService.editPost(postId, req.user?.id ?? "", content, req.body.contentRating, req.body.contentCategory);
    } catch (error) {
      if (error instanceof ContentPolicyViolationError) {
        return res.status(422).json(createResponse(error.message, null, {}, Object.entries(error.flags).filter(([, value]) => value).map(([key]) => key)));
      }
      throw error;
    }
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
    let result;
    try {
      result = await this.postService.commentOnPost(postId, req.user?.id ?? "", content, {
        mediaUrl: req.body.mediaUrl,
        mediaType: req.body.mediaType,
        mediaDuration: req.body.mediaDuration,
      });
    } catch (error) {
      if (error instanceof ContentPolicyViolationError) {
        return res.status(422).json(createResponse(error.message, null, {}, Object.entries(error.flags).filter(([, value]) => value).map(([key]) => key)));
      }
      throw error;
    }
    if (!result) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(201).json(createResponse("Comment created", result));
  };

  reply = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const commentId = typeof req.params.commentId === "string" ? req.params.commentId : "";
    const content = typeof req.body.content === "string" ? req.body.content : "";
    let result;
    try {
      result = await this.postService.replyToComment(postId, commentId, req.user?.id ?? "", content);
    } catch (error) {
      if (error instanceof ContentPolicyViolationError) {
        return res.status(422).json(createResponse(error.message, null, {}, Object.entries(error.flags).filter(([, value]) => value).map(([key]) => key)));
      }
      throw error;
    }
    if (!result) {
      return res.status(404).json(createResponse("Comment not found", null, {}, ["Comment not found"]));
    }
    return res.status(201).json(createResponse("Reply created", result));
  };

  commentLike = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const commentId = typeof req.params.commentId === "string" ? req.params.commentId : "";
    const comment = await this.postService.toggleCommentLike(postId, commentId, req.user?.id ?? "");
    if (!comment) {
      return res.status(404).json(createResponse("Comment not found", null, {}, ["Comment not found"]));
    }
    return res.status(200).json(createResponse("Comment like updated", comment));
  };

  comments = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const comments = await this.postService.listComments(postId, req.user?.id ?? "");
    return res.status(200).json(createResponse("Comments loaded", comments));
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

  repost = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const post = await this.postService.repostPost(postId, req.user?.id ?? "", req.body.note);
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post reposted", post));
  };

  unrepost = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const post = await this.postService.unrepostPost(postId, req.user?.id ?? "");
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Repost removed", post));
  };

  votePoll = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const post = await this.postService.votePoll(postId, req.body.optionId, req.user?.id ?? "");
    if (!post) {
      return res.status(404).json(createResponse("Poll or option not found", null, {}, ["Poll or option not found"]));
    }
    return res.status(200).json(createResponse("Poll vote recorded", post));
  };

  saved = async (req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const items = await this.postService.getSavedPosts(req.user?.id ?? "", limit);
    return res.status(200).json(createResponse("Saved posts loaded", items, { nextCursor: null, hasMore: false, limit }));
  };

  liked = async (req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const items = await this.postService.getLikedPosts(req.user?.id ?? "", limit);
    return res.status(200).json(createResponse("Liked posts loaded", items, { nextCursor: null, hasMore: false, limit }));
  };

  
  feed = async (req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const cursor = req.query.cursor as string | undefined;
    const items = await this.postService.getFeed(cursor, limit + 1, req.user?.id);
    const hasMore = items.length > limit;
    const visibleItems = items.slice(0, limit);
    const nextCursor = hasMore && visibleItems.length ? encodePostCursor(visibleItems[visibleItems.length - 1]) : null;
    return res.status(200).json(createResponse("Feed loaded", visibleItems, { nextCursor, hasMore, limit }));
  };

  trendingFeed = async (req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const items = await this.postService.getTrendingFeed(cursor, limit + 1, req.user?.id);
    const hasMore = items.length > limit;
    const visibleItems = items.slice(0, limit);
    const nextCursor = hasMore && visibleItems.length ? encodeTrendingCursor(visibleItems[visibleItems.length - 1]) : null;
    return res.status(200).json(createResponse("Trending feed loaded", visibleItems, { nextCursor, hasMore, limit }));
  };

  userFeed = async (req: Request, res: Response) => {
    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const cursor = req.query.cursor as string | undefined;
    const items = await this.postService.getUserFeed(userId, cursor, limit + 1, req.user?.id);
    const hasMore = items.length > limit;
    const visibleItems = items.slice(0, limit);
    const nextCursor = hasMore && visibleItems.length ? encodePostCursor(visibleItems[visibleItems.length - 1]) : null;
    return res.status(200).json(createResponse("User feed loaded", visibleItems, { nextCursor, hasMore, limit }));
  };

}
