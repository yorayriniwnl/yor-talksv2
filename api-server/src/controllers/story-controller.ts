import { type Request, type Response } from "express";
import { StoryService } from "../services/story-service.js";
import { createResponse } from "../utils/response.js";

function paramId(req: Request): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

function viewStory(story: Awaited<ReturnType<StoryService["listActiveStories"]>>[number], viewerId?: string) {
  // Viewer and reaction identities are private interaction data. The client
  // only needs its own state to render viewed/selected-reaction UI.
  return {
    ...story,
    viewerIds: viewerId && story.viewerIds.includes(viewerId) ? [viewerId] : [],
    reactions: viewerId ? story.reactions.filter((reaction) => reaction.userId === viewerId) : [],
  };
}

export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  create = async (req: Request, res: Response) => {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const story = await this.storyService.createStory({ ...req.body, authorId });
    return res.status(201).json(createResponse("Story created", viewStory(story, authorId)));
  };

  listActive = async (req: Request, res: Response) => {
    const stories = await this.storyService.listActiveStories(req.user?.id);
    return res.status(200).json(createResponse("Stories retrieved", stories.map((story) => viewStory(story, req.user?.id))));
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
    return res.status(200).json(createResponse("Story viewed", viewStory(story, userId)));
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
    return res.status(200).json(createResponse("Story reacted", viewStory(story, userId)));
  };
}
