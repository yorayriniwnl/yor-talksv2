import { type Request, type Response } from "express";
import { VideoService } from "../services/video-service.js";
import { createResponse } from "../utils/response.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  private view(video: any, viewerId?: string) {
    const { likedBy = [], ...publicVideo } = video;
    return { ...publicVideo, likes: likedBy.length, likedByMe: Boolean(viewerId && likedBy.includes(viewerId)) };
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
