import { type Request, type Response } from "express";
import { UserRepository } from "../repositories/user-repository.js";
import { CommunityService } from "../services/community-service.js";
import { createResponse } from "../utils/response.js";

export class CommunityController {
  constructor(private readonly communityService: CommunityService, private readonly userRepository = new UserRepository()) {}

  private async discussionView(discussion: any, viewerId?: string) {
    const authorId = typeof discussion.authorId === "string" ? discussion.authorId : "";
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authorId);
    const author = isUuid ? await this.userRepository.findById(authorId) : undefined;
    const { likedBy, ...publicDiscussion } = discussion;
    return {
      ...publicDiscussion,
      likedByMe: Boolean(viewerId && Array.isArray(likedBy) && likedBy.includes(viewerId)),
      author: {
        id: authorId,
        username: author?.username ?? "user",
        fullName: author?.fullName ?? "User",
        avatarUrl: author?.avatarUrl ?? null,
      },
    };
  }

  private view(community: any, viewerId?: string) {
    const memberIds = Array.isArray(community.memberIds) ? community.memberIds : [];
    const { pendingRequests, roles, inviteLinks, announcements, moderators, memberIds: _memberIds, ...publicCommunity } = community;
    return {
      ...publicCommunity,
      memberCount: memberIds.length,
      memberIds: viewerId && memberIds.includes(viewerId) ? [viewerId] : [],
      isMember: Boolean(viewerId && memberIds.includes(viewerId)),
    };
  }

  create = async (req: Request, res: Response) => {
    try {
      const ownerId = req.user?.id;
      if (!ownerId) {
        return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
      }
      const community = await this.communityService.createCommunity({ ...req.body, ownerId });
      return res.status(201).json(createResponse("Community created", this.view(community, ownerId)));
    } catch (error) {
      // Most likely cause: the slug unique constraint (communities_slug_unique).
      return res.status(409).json(createResponse("Could not create community", null, {}, [error instanceof Error ? error.message : "Unknown error"]));
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const communities = await this.communityService.listCommunities();
      return res.status(200).json(createResponse("Communities retrieved", communities.map((community) => this.view(community, req.user?.id))));
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
      return res.status(200).json(createResponse("Community retrieved", this.view(community, req.user?.id)));
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
    return res.status(200).json(createResponse("Joined community", this.view(community, userId)));
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
      return res.status(200).json(createResponse("Left community", this.view(community, userId)));
    } catch (error) {
      return res.status(403).json(createResponse("Cannot leave community", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };

  listDiscussions = async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const community = await this.communityService.getCommunity(id);
      if (!community) return res.status(404).json(createResponse("Community not found", null, {}, ["Not found"]));
      const discussions = await this.communityService.listDiscussions(id);
      const visible = await Promise.all(discussions.map((discussion) => this.discussionView(discussion, req.user?.id)));
      return res.status(200).json(createResponse("Discussions loaded", visible));
    } catch {
      return res.status(500).json(createResponse("Discussions could not be loaded", null, {}, ["Internal server error"]));
    }
  };

  createDiscussion = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const discussion = await this.communityService.createDiscussion(id, userId, req.body);
      if (!discussion) return res.status(404).json(createResponse("Community not found", null, {}, ["Not found"]));
      return res.status(201).json(createResponse("Discussion published", await this.discussionView(discussion, userId)));
    } catch (error) {
      return res.status(403).json(createResponse("Discussion could not be published", null, {}, [error instanceof Error ? error.message : "Forbidden"]));
    }
  };

  likeDiscussion = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json(createResponse("Unauthorized", null, {}, ["Unauthorized"]));
      const communityId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const discussionId = Array.isArray(req.params.discussionId) ? req.params.discussionId[0] : req.params.discussionId;
      const discussion = await this.communityService.likeDiscussion(communityId, discussionId, userId);
      if (!discussion) return res.status(404).json(createResponse("Discussion not found", null, {}, ["Not found"]));
      return res.status(200).json(createResponse("Discussion liked", await this.discussionView(discussion, userId)));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Join this community")) {
        return res.status(403).json(createResponse("Join the community first", null, {}, [error.message]));
      }
      return res.status(500).json(createResponse("Discussion could not be liked", null, {}, ["Internal server error"]));
    }
  };
}
