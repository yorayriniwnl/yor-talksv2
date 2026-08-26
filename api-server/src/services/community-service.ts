import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { communitiesTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { CommunityDiscussion, CommunityRecord } from "../types/index.js";
import { AIService } from "./ai-service.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import { ContentSafetyService } from "./content-safety-service.js";
import { DEFAULT_CONTENT_RATING } from "../utils/content-safety.js";

export class CommunityService {
  constructor(
    private readonly contentSafetyService: ContentSafetyService = new ContentSafetyService(),
    private readonly aiService: AIService = new AIService(),
  ) {}

  async createCommunity(input: { name: string; slug: string; description: string; ownerId: string; contentRating?: CommunityRecord["contentRating"] }): Promise<CommunityRecord> {
    await enforceTextContentPolicy(`${input.name}\n${input.description}`, this.aiService, "community");
    const community: CommunityRecord = {
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      description: input.description,
      ownerId: input.ownerId,
      moderators: [input.ownerId],
      memberIds: [input.ownerId],
      pendingRequests: [],
      roles: {
        owner: { name: "owner", permissions: ["manage:community", "manage:members"] },
      },
      inviteLinks: {},
      announcements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    
    const [created] = await db.insert(communitiesTable).values(community).returning();
    return created as CommunityRecord;
  }

  async listCommunities(viewerId?: string): Promise<CommunityRecord[]> {
    return this.contentSafetyService.filterVisibleByAuthor((await db.select().from(communitiesTable).limit(100)) as CommunityRecord[], viewerId, (community) => community.ownerId);
  }

  async getCommunity(idOrSlug: string, viewerId?: string): Promise<CommunityRecord | undefined> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
    const [community] = await db.select().from(communitiesTable).where(
      isUuid ? eq(communitiesTable.id, idOrSlug) : eq(communitiesTable.slug, idOrSlug.trim().toLowerCase()),
    );
    const typedCommunity = community as CommunityRecord | undefined;
    return await this.contentSafetyService.isVisible(typedCommunity, viewerId, typedCommunity?.ownerId) ? typedCommunity : undefined;
  }

  async joinCommunity(communityId: string, userId: string): Promise<CommunityRecord | undefined> {
    const community = await this.getCommunity(communityId, userId);
    if (!community) return undefined;
    if (!community.memberIds.includes(userId)) {
      const memberIds = [...community.memberIds, userId];
      const [updated] = await db.update(communitiesTable).set({ memberIds, updatedAt: new Date().toISOString() }).where(eq(communitiesTable.id, community.id)).returning();
      return updated as CommunityRecord;
    }
    return community;
  }

  async leaveCommunity(communityId: string, userId: string): Promise<CommunityRecord | undefined> {
    const community = await this.getCommunity(communityId, userId);
    if (!community) return undefined;
    if (community.ownerId === userId) {
      throw new Error("The owner can't leave their own community");
    }
    const memberIds = community.memberIds.filter((id) => id !== userId);
    const [updated] = await db.update(communitiesTable).set({ memberIds, updatedAt: new Date().toISOString() }).where(eq(communitiesTable.id, community.id)).returning();
    return updated as CommunityRecord;
  }

  async listDiscussions(communityId: string, viewerId?: string): Promise<CommunityDiscussion[]> {
    const community = await this.getCommunity(communityId, viewerId);
    if (!community) return [];
    const discussions = (Array.isArray(community.announcements) ? community.announcements : [])
      .filter((item): item is CommunityDiscussion => Boolean(
        item && typeof item === "object" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String((item as any).authorId ?? "")),
      )) as CommunityDiscussion[];
    return this.contentSafetyService.filterVisible(discussions, viewerId);
  }

  async createDiscussion(communityId: string, userId: string, input: { title: string; content?: string; tag: string; contentRating?: CommunityDiscussion["contentRating"] }): Promise<CommunityDiscussion | undefined> {
    const community = await this.getCommunity(communityId, userId);
    if (!community) return undefined;
    if (!community.memberIds.includes(userId)) throw new Error("Join this community before starting a discussion");
    await enforceTextContentPolicy(`${input.title}\n${input.content ?? ""}`, this.aiService, "discussion");

    const discussion: CommunityDiscussion = {
      id: randomUUID(),
      title: input.title.trim(),
      content: (input.content ?? "").trim(),
      tag: input.tag,
      authorId: userId,
      repliesCount: 0,
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
      contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
    };
    const announcements = [...(Array.isArray(community.announcements) ? community.announcements : []), discussion];
    await db.update(communitiesTable)
      .set({ announcements, postsCount: sql`${communitiesTable.postsCount} + 1`, updatedAt: new Date().toISOString() })
      .where(eq(communitiesTable.id, community.id));
    return discussion;
  }

  async likeDiscussion(communityId: string, discussionId: string, userId: string): Promise<CommunityDiscussion | undefined> {
    const community = await this.getCommunity(communityId, userId);
    if (!community) return undefined;
    if (!community.memberIds.includes(userId)) throw new Error("Join this community before liking a discussion");
    const discussions = (Array.isArray(community.announcements) ? community.announcements : []) as CommunityDiscussion[];
    const index = discussions.findIndex((discussion) => discussion.id === discussionId);
    if (index < 0) return undefined;
    const current = discussions[index];
    if (!current.authorId) return undefined;
    const likedBy = Array.isArray(current.likedBy) ? current.likedBy : [];
    if (!likedBy.includes(userId)) {
      discussions[index] = { ...current, likedBy: [...likedBy, userId], likes: (current.likes ?? 0) + 1 };
      await db.update(communitiesTable)
        .set({ announcements: discussions, updatedAt: new Date().toISOString() })
        .where(eq(communitiesTable.id, community.id));
    }
    return discussions[index];
  }
}
