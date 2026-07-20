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
}
