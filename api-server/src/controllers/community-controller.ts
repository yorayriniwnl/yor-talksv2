import { type Request, type Response } from "express";
import { CommunityService } from "../services/community-service.js";
import { createResponse } from "../utils/response.js";

export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  create = async (req: Request, res: Response) => {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
      }
      const community = await this.communityService.createCommunity({ ...req.body, ownerId });
      return res.status(201).json(createResponse("Community created", community));
    } catch (error) {
      // Most likely cause: the slug unique constraint (communities_slug_unique).
      return res.status(409).json(createResponse("Could not create community", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  list = async (_req: Request, res: Response) => {
    try {
      const communities = await this.communityService.listCommunities();
      return res.status(200).json(createResponse("Communities retrieved", communities));
    } catch (error) {
      return res.status(500).json(createResponse("Failed to list communities", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  getBySlugOrId = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const community = await this.communityService.getCommunity(id);
      if (!community) {
        return res.status(404).json(createResponse("Community not found", null, {}, ["Not found"]));
      }
      return res.status(200).json(createResponse("Community retrieved", community));
    } catch (error) {
      return res.status(500).json(createResponse("Failed to retrieve community", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  join = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const community = await this.communityService.joinCommunity(id, userId);
    if (!community) {
      return res.status(404).json(createResponse("Community not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Joined community", community));
  };

  leave = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const community = await this.communityService.leaveCommunity(id, userId);
      if (!community) {
        return res.status(404).json(createResponse("Community not found", null, {}, ["Not found"]));
      }
      return res.status(200).json(createResponse("Left community", community));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot leave community", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };
}
