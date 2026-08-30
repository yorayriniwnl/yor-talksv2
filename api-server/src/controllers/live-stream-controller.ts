import { type Request, type Response } from "express";
import { LiveStreamService } from "../services/live-stream-service.js";
import { LiveKitNotConfiguredError } from "../services/livekit-service.js";
import { LiveStreamNotFoundError, LiveStreamNotLiveError } from "../services/live-stream-service.js";
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
    try {
      const stream = await this.liveStreamService.createStream({ ...req.body, hostId });
      return res.status(201).json(createResponse("Stream scheduled", stream));
    } catch (error) {
      if (error instanceof LiveKitNotConfiguredError) {
        return res.status(503).json(createResponse("Live video is unavailable", null, {}, [error.message]));
      }
      throw error;
    }
  };

  list = async (req: Request, res: Response) => {
    const streams = await this.liveStreamService.listStreams(req.user?.id);
    return res.status(200).json(createResponse("Streams retrieved", streams));
  };

  get = async (req: Request, res: Response) => {
    const stream = await this.liveStreamService.getStream(paramId(req), req.user?.id);
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
    try {
      const stream = await this.liveStreamService.setStatus(paramId(req), hostId, req.body.status);
      if (!stream) {
        return res.status(404).json(createResponse("Stream not found or not yours", null, {}, ["Not found"]));
      }
      return res.status(200).json(createResponse("Stream status updated", stream));
    } catch (error) {
      if (error instanceof LiveKitNotConfiguredError) {
        return res.status(503).json(createResponse("Live video is unavailable", null, {}, [error.message]));
      }
      throw error;
    }
  };

  token = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    try {
      const token = await this.liveStreamService.getRoomAccessToken(paramId(req), userId);
      return res.status(200).json(createResponse("Live room token created", token));
    } catch (error) {
      if (error instanceof LiveKitNotConfiguredError) {
        return res.status(503).json(createResponse("Live video is unavailable", null, {}, [error.message]));
      }
      if (error instanceof LiveStreamNotFoundError) {
        return res.status(404).json(createResponse(error.message, null, {}, [error.message]));
      }
      if (error instanceof LiveStreamNotLiveError) {
        return res.status(409).json(createResponse(error.message, null, {}, [error.message]));
      }
      throw error;
    }
  };
}
