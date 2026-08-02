import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { communitiesTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { CommunityRecord } from "../types/index.js";

export class CommunityService {
  async createCommunity(input: { name: string; slug: string; description: string; ownerId: string }): Promise<CommunityRecord> {
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
    };
    
    const [created] = await db.insert(communitiesTable).values(community).returning();
    return created as CommunityRecord;
  }

  async listCommunities(): Promise<CommunityRecord[]> {
    return (await db.select().from(communitiesTable)) as CommunityRecord[];
  }

  async getCommunity(id: string): Promise<CommunityRecord | undefined> {
    const [community] = await db.select().from(communitiesTable).where(eq(communitiesTable.id, id));
    return community as CommunityRecord | undefined;
  }

  async joinCommunity(communityId: string, userId: string): Promise<CommunityRecord | undefined> {
    const community = await this.getCommunity(communityId);
    if (!community) return undefined;
    if (!community.memberIds.includes(userId)) {
      const memberIds = [...community.memberIds, userId];
      const [updated] = await db.update(communitiesTable).set({ memberIds, updatedAt: new Date().toISOString() }).where(eq(communitiesTable.id, communityId)).returning();
      return updated as CommunityRecord;
    }
    return community;
  }

  async leaveCommunity(communityId: string, userId: string): Promise<CommunityRecord | undefined> {
    const community = await this.getCommunity(communityId);
    if (!community) return undefined;
    if (community.ownerId === userId) {
      throw new Error("The owner can't leave their own community");
    }
    const memberIds = community.memberIds.filter((id) => id !== userId);
    const [updated] = await db.update(communitiesTable).set({ memberIds, updatedAt: new Date().toISOString() }).where(eq(communitiesTable.id, communityId)).returning();
    return updated as CommunityRecord;
  }
}
