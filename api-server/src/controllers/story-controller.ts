import { type Request, type Response } from "express";
import { PremiumFeatureUnavailableError, StoryService } from "../services/story-service.js";
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

  listHighlights = async (req: Request, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    return res.status(200).json(createResponse("Highlights loaded", await this.storyService.listHighlights(ownerId)));
  };

  createHighlight = async (req: Request, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    try {
      const highlight = await this.storyService.createHighlight(ownerId, req.body.title, req.body.coverUrl);
      return res.status(201).json(createResponse("Highlight created", highlight));
    } catch (error) {
      return res.status(400).json(createResponse("Could not create Highlight", null, {}, [error instanceof Error ? error.message : "Bad request"]));
    }
  };

  create = async (req: Request, res: Response) => {
    const authorId = req.user?.id;
    if (!authorId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    try {
      const story = await this.storyService.createStory({ ...req.body, authorId });
      return res.status(201).json(createResponse("Story created", viewStory(story, authorId)));
    } catch (error) {
      if (error instanceof PremiumFeatureUnavailableError) {
        return res.status(403).json(createResponse(error.message, null, {}, ["premium_feature_unavailable"]));
      }
      throw error;
    }
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
    const eventKey = typeof req.body?.eventKey === "string" ? req.body.eventKey : undefined;
    const story = await this.storyService.addView(paramId(req), userId, eventKey);
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
    try {
      const story = await this.storyService.react(paramId(req), userId, req.body.emoji, req.body.reactionType);
      if (!story) {
        return res.status(404).json(createResponse("Story not found", null, {}, ["Not found"]));
      }
      return res.status(200).json(createResponse("Story reacted", viewStory(story, userId)));
    } catch (error) {
      if (error instanceof PremiumFeatureUnavailableError) {
        return res.status(403).json(createResponse(error.message, null, {}, ["premium_feature_unavailable"]));
      }
      throw error;
    }
  };

  analytics = async (req: Request, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    try {
      const analytics = await this.storyService.getAnalytics(paramId(req), ownerId);
      if (!analytics) return res.status(404).json(createResponse("Story not found", null, {}, ["Not found"]));
      return res.status(200).json(createResponse("Story analytics loaded", analytics));
    } catch (error) {
      if (error instanceof PremiumFeatureUnavailableError) {
        return res.status(403).json(createResponse(error.message, null, {}, ["premium_feature_unavailable"]));
      }
      throw error;
    }
  };

  viewers = async (req: Request, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
      const viewers = await this.storyService.searchViewers(
        paramId(req),
        ownerId,
        typeof req.query.q === "string" ? req.query.q : undefined,
        typeof req.query.cursor === "string" ? req.query.cursor : undefined,
        limit,
      );
      if (!viewers) return res.status(404).json(createResponse("Story not found", null, {}, ["Not found"]));
      return res.status(200).json(createResponse("Story viewers loaded", viewers, { limit, hasMore: Boolean(viewers.nextCursor), nextCursor: viewers.nextCursor }));
    } catch (error) {
      if (error instanceof PremiumFeatureUnavailableError) {
        return res.status(403).json(createResponse(error.message, null, {}, ["premium_feature_unavailable"]));
      }
      throw error;
    }
  };

  setPriority = async (req: Request, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    try {
      const story = await this.storyService.setPriority(paramId(req), ownerId, req.body.enabled);
      if (!story) return res.status(404).json(createResponse("Story not found", null, {}, ["Not found"]));
      return res.status(200).json(createResponse("Story priority updated", viewStory(story, ownerId)));
    } catch (error) {
      if (error instanceof PremiumFeatureUnavailableError) {
        return res.status(403).json(createResponse(error.message, null, {}, ["premium_feature_unavailable"]));
      }
      throw error;
    }
  };

  votePoll = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
    }
    const story = await this.storyService.votePoll(paramId(req), req.body.optionId, userId);
    if (!story) {
      return res.status(404).json(createResponse("Story poll or option not found", null, {}, ["Story poll or option not found"]));
    }
    return res.status(200).json(createResponse("Story poll vote recorded", viewStory(story, userId)));
  };
}
