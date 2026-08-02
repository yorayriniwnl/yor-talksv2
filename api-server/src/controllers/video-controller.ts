import { type Request, type Response } from "express";
import { VideoService } from "../services/video-service.js";
import { createResponse } from "../utils/response.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  create = async (req: Request, res: Response) => {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const video = await this.videoService.createVideo({ ...req.body, authorId });
    return res.status(201).json(createResponse("Video uploaded", video));
  };

  list = async (_req: Request, res: Response) => {
    const videos = await this.videoService.listVideos();
    return res.status(200).json(createResponse("Videos retrieved", videos));
  };

  get = async (req: Request, res: Response) => {
    const video = await this.videoService.getVideo(paramId(req));
    if (!video) {
      return res.status(404).json(createResponse("Video not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Video retrieved", video));
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
    return res.status(200).json(createResponse("Like toggled", video));
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
