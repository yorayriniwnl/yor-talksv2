import { type Request, type Response } from "express";
import { StoryService } from "../services/story-service.js";
import { createResponse } from "../utils/response.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  create = async (req: Request, res: Response) => {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const story = await this.storyService.createStory({ ...req.body, authorId });
    return res.status(201).json(createResponse("Story created", story));
  };

  listActive = async (_req: Request, res: Response) => {
    const stories = await this.storyService.listActiveStories();
    return res.status(200).json(createResponse("Stories retrieved", stories));
  };

  view = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const story = await this.storyService.addView(paramId(req), userId);
    if (!story) {
      return res.status(404).json(createResponse("Story not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Story viewed", story));
  };

  react = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const story = await this.storyService.react(paramId(req), userId, req.body.emoji);
    if (!story) {
      return res.status(404).json(createResponse("Story not found", null, {}, ["Not found"]));
    }
    return res.status(200).json(createResponse("Story reacted", story));
  };
}
