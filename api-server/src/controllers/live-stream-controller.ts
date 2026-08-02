import { type Request, type Response } from "express";
import { LiveStreamService } from "../services/live-stream-service.js";
import { createResponse } from "../utils/response.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class LiveStreamController {
  constructor(private readonly liveStreamService: LiveStreamService) {}

  create = async (req: Request, res: Response) => {
    const hostId = req.user?.id;
    if (!hostId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const stream = await this.liveStreamService.createStream({ ...req.body, hostId });
    return res.status(201).json(createResponse("Stream scheduled", stream));
  };

  list = async (_req: Request, res: Response) => {
    const streams = await this.liveStreamService.listStreams();
    return res.status(200).json(createResponse("Streams retrieved", streams));
  };

  get = async (req: Request, res: Response) => {
    const stream = await this.liveStreamService.getStream(paramId(req));
    if (!stream) {
      return res.status(404).json(createResponse("Stream not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Stream retrieved", stream));
  };

  setStatus = async (req: Request, res: Response) => {
    const hostId = req.user?.id;
    if (!hostId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const stream = await this.liveStreamService.setStatus(paramId(req), hostId, req.body.status);
    if (!stream) {
      return res.status(404).json(createResponse("Stream not found or not yours", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Stream status updated", stream));
  };
}
