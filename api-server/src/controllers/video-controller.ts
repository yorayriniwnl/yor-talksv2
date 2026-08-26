import { type Request, type Response } from "express";
import { VideoService } from "../services/video-service.js";
import { createResponse } from "../utils/response.js";
import { ContentPolicyViolationError } from "../services/content-policy-service.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  private view(video: any, viewerId?: string) {
    const { likedBy = [], ...publicVideo } = video;
    return { ...publicVideo, likes: likedBy.length, likedByMe: Boolean(viewerId && likedBy.includes(viewerId)) };
  }

  private commentView(comment: any) {
    const { likedBy = [], ...publicComment } = comment;
    return { ...publicComment, likes: comment.likes ?? likedBy.length, likedByMe: Boolean(comment.likedByMe) };
  }

  create = async (req: Request, res: Response) => {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const video = await this.videoService.createVideo({ ...req.body, authorId });
    return res.status(201).json(createResponse("Video uploaded", this.view(video, authorId)));
  };

  list = async (req: Request, res: Response) => {
    const videos = await this.videoService.listVideos(req.user?.id);
    return res.status(200).json(createResponse("Videos retrieved", videos.map((video) => this.view(video, req.user?.id))));
  };

  get = async (req: Request, res: Response) => {
    const video = await this.videoService.getVideo(paramId(req), req.user?.id);
    if (!video) {
      return res.status(404).json(createResponse("Video not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Video retrieved", this.view(video, req.user?.id)));
  };

  toggleLike = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const video = await this.videoService.toggleLike(paramId(req), userId);
    if (!video) {
      return res.status(404).json(createResponse("Video not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Like toggled", this.view(video, userId)));
  };

  comments = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    const comments = await this.videoService.listComments(paramId(req), userId);
    return res.status(200).json(createResponse("Video comments retrieved", comments.map((comment) => this.commentView(comment))));
  };

  comment = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    try {
      const result = await this.videoService.commentOnVideo(paramId(req), userId, req.body.content, {
        mediaUrl: req.body.mediaUrl,
        mediaType: req.body.mediaType,
        mediaDuration: req.body.mediaDuration,
      });
      if (!result) return res.status(404).json(createResponse("Video not found", null, {}, ["Not found"]));
      return res.status(201).json(createResponse("Video comment created", {
        video: this.view(result.video, userId),
        comment: this.commentView(result.comment),
      }));
    } catch (error) {
      if (error instanceof ContentPolicyViolationError) {
        return res.status(422).json(createResponse(error.message, null, {}, Object.entries(error.moderation).filter(([, value]) => value).map(([key]) => key)));
      }
      throw error;
    }
  };

  commentLike = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    const commentId = Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId;
    const comment = await this.videoService.toggleCommentLike(paramId(req), commentId, userId);
    if (!comment) return res.status(404).json(createResponse("Comment not found", null, {}, ["Not found"]));
    return res.status(200).json(createResponse("Video comment like toggled", this.commentView(comment)));
  };

  remove = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const deleted = await this.videoService.deleteVideo(paramId(req), userId);
    if (!deleted) {
      return res.status(404).json(createResponse("Video not found or not yours to delete", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Video removed", null));
  };
}
