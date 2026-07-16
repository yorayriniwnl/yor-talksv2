import { randomUUID } from "node:crypto";
import type { CommunityRecord } from "../types/index.js";

export class CommunityService {
  private readonly communities = new Map<string, CommunityRecord>();

  createCommunity(input: { name: string; slug: string; description: string; ownerId: string }): CommunityRecord {
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
    this.communities.set(community.id, community);
    return community;
  }

  listCommunities(): CommunityRecord[] {
    return Array.from(this.communities.values());
  }

  getCommunity(id: string): CommunityRecord | undefined {
    return this.communities.get(id);
  }
}
