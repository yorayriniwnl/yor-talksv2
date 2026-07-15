import { type Request, type Response } from "express";
import { PostService } from "../services/post-service.js";
import { createResponse } from "../utils/response.js";

export class PostController {
  constructor(private readonly postService: PostService) {}

  createPost = (req: Request, res: Response) => {
    const post = this.postService.createPost(req.user?.id ?? "", req.body.content, req.body.images ?? []);
    return res.status(201).json(createResponse("Post created", post));
  };

  deletePost = (req: Request, res: Response) => {
    const deleted = this.postService.deletePost(req.params.postId);
    if (!deleted) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post deleted", null));
  };

  editPost = (req: Request, res: Response) => {
    const post = this.postService.editPost(req.params.postId, req.body.content);
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post updated", post));
  };

  like = (req: Request, res: Response) => {
    const post = this.postService.likePost(req.params.postId, req.user?.id ?? "");
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post liked", post));
  };

  unlike = (req: Request, res: Response) => {
    const post = this.postService.unlikePost(req.params.postId, req.user?.id ?? "");
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post unliked", post));
  };

  comment = (req: Request, res: Response) => {
    const result = this.postService.commentOnPost(req.params.postId, req.user?.id ?? "", req.body.content);
    if (!result) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(201).json(createResponse("Comment created", result));
  };

  reply = (req: Request, res: Response) => {
    const result = this.postService.replyToComment(req.params.postId, req.params.commentId, req.user?.id ?? "", req.body.content);
    if (!result) {
      return res.status(404).json(createResponse("Comment not found", null, {}, ["Comment not found"]));
    }
    return res.status(201).json(createResponse("Reply created", result));
  };

  bookmark = (req: Request, res: Response) => {
    const post = this.postService.bookmarkPost(req.params.postId, req.user?.id ?? "");
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Post bookmarked", post));
  };

  share = (req: Request, res: Response) => {
    const post = this.postService.sharePost(req.params.postId);
    if (!post) {
      return res.status(404).json(createResponse("Post not found", null, {}, ["Post not found"]));
    }
    return res.status(200).json(createResponse("Share count updated", post));
  };

  feed = (_req: Request, res: Response) => {
    return res.status(200).json(createResponse("Feed loaded", this.postService.getFeed()));
  };

  trendingFeed = (_req: Request, res: Response) => {
    return res.status(200).json(createResponse("Trending feed loaded", this.postService.getTrendingFeed()));
  };

  userFeed = (req: Request, res: Response) => {
    return res.status(200).json(createResponse("User feed loaded", this.postService.getUserFeed(req.params.userId)));
  };
}
