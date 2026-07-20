import { type Request, type Response } from "express";
import { PostService } from "../services/post-service.js";
import { createResponse } from "../utils/response.js";

export class PostController {
  constructor(private readonly postService: PostService) {}

  createPost = async (req: Request, res: Response) => {
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const images = Array.isArray(req.body.images) ? req.body.images : [];
    const post = await this.postService.createPost(req.user?.id ?? "", content, images);
    return res.status(201).json(createResponse("Post created", post));
  };

  deletePost = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const deleted = await this.postService.deletePost(postId);
    if (!deleted) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post deleted", null));
  };

  editPost = async (req: Request, res: Response) => {
    const postId = typeof req.params.postId === "string" ? req.params.postId : "";
    const content = typeof req.body.content === "string" ? req.body.content : "";
    const post = await this.postService.editPost(postId, content);
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
    const post = await this.postService.sharePost(postId);
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Share count updated", post));
  };

  feed = async (_req: Request, res: Response) => {
    return res.status(200).json(createResponse("Feed loaded", await this.postService.getFeed()));
  };

  trendingFeed = async (_req: Request, res: Response) => {
    return res.status(200).json(createResponse("Trending feed loaded", await this.postService.getTrendingFeed()));
  };

  userFeed = async (req: Request, res: Response) => {
    const userId = typeof req.params.userId === "string" ? req.params.userId : "";
    return res.status(200).json(createResponse("User feed loaded", await this.postService.getUserFeed(userId)));
  };
}
