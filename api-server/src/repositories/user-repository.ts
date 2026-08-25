import { eq, or, ilike } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { UserRecord } from "../types/index.js";

export class UserRepository {

  async followUser(followerId: string, followingId: string): Promise<void> {
    const existing = await db.select().from(userFollowsTable).where(and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followingId, followingId)));
    if (existing.length === 0) {
      await db.insert(userFollowsTable).values({ followerId, followingId });
      await db.execute(sql`UPDATE users SET following_count = following_count + 1 WHERE id = ${followerId}`);
      await db.execute(sql`UPDATE users SET follower_count = follower_count + 1 WHERE id = ${followingId}`);
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const deleted = await db.delete(userFollowsTable).where(and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followingId, followingId))).returning();
    if (deleted.length > 0) {
      await db.execute(sql`UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = ${followerId}`);
      await db.execute(sql`UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = ${followingId}`);
    }
  }

  async create(user: UserRecord): Promise<UserRecord> {
    const [created] = await db.insert(usersTable).values(user).returning();
    return created as UserRecord;
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    return user as UserRecord | undefined;
  }

  async findByUsername(username: string): Promise<UserRecord | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
    return user as UserRecord | undefined;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user as UserRecord | undefined;
  }

  async update(id: string, updates: Partial<UserRecord>): Promise<UserRecord | undefined> {
    const [updated] = await db.update(usersTable)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(usersTable.id, id))
      .returning();
    return updated as UserRecord | undefined;
  }

  async list(search = ""): Promise<UserRecord[]> {
    if (!search) {
      return (await db.select().from(usersTable)) as UserRecord[];
    }
    const query = `%${search}%`;
    return (await db.select().from(usersTable).where(
      or(
        ilike(usersTable.username, query),
        ilike(usersTable.fullName, query)
      )
    )) as UserRecord[];
  }
}
