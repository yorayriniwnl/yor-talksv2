import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, communitiesTable } from "@workspace/db";
export class CommunityService {
    async createCommunity(input) {
        const community = {
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
        return created;
    }
    async listCommunities() {
        return (await db.select().from(communitiesTable));
    }
    async getCommunity(id) {
        const [community] = await db.select().from(communitiesTable).where(eq(communitiesTable.id, id));
        return community;
    }
}
//# sourceMappingURL=community-service.js.map