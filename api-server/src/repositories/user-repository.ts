import { and, eq, ilike, or, sql } from "drizzle-orm";
import { userFollowsTable, usersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { UserRecord } from "../types/index.js";

export class UserRepository {

  async followUser(followerId: string, followingId: string): Promise<boolean> {
    const existing = await db.select().from(userFollowsTable).where(and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followingId, followingId)));
    if (existing.length === 0) {
      await db.insert(userFollowsTable).values({ followerId, followingId });
      await db.execute(sql`UPDATE users SET following_count = following_count + 1 WHERE id = ${followerId}`);
      await db.execute(sql`UPDATE users SET follower_count = follower_count + 1 WHERE id = ${followingId}`);
      return true;
    }
    return false;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const deleted = await db.delete(userFollowsTable).where(and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followingId, followingId))).returning();
    if (deleted.length > 0) {
      await db.execute(sql`UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = ${followerId}`);
      await db.execute(sql`UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = ${followingId}`);
    }
  }

  async create(user: UserRecord): Promise<UserRecord> {
    const { followers: _followers, following: _following, ...persistedUser } = user;
    const [created] = await db.insert(usersTable).values(persistedUser).returning();
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
    const { followers: _followers, following: _following, ...persistedUpdates } = updates;
    const [updated] = await db.update(usersTable)
      .set({ ...persistedUpdates, updatedAt: new Date().toISOString() })
      .where(eq(usersTable.id, id))
      .returning();
    return updated as UserRecord | undefined;
  }

  async deleteById(id: string): Promise<void> {
    await db.delete(usersTable).where(eq(usersTable.id, id));
  }

  async list(search = ""): Promise<UserRecord[]> {
    if (!search) {
      return (await db.select().from(usersTable).limit(100)) as UserRecord[];
    }
    const query = `%${search}%`;
    return (await db.select().from(usersTable).where(
      or(
        ilike(usersTable.username, query),
        ilike(usersTable.fullName, query)
      )
    ).limit(100)) as UserRecord[];
  }

  async listFollowers(userId: string): Promise<UserRecord[]> {
    return (await db
      .select({ user: usersTable })
      .from(userFollowsTable)
      .innerJoin(usersTable, eq(usersTable.id, userFollowsTable.followerId))
      .where(eq(userFollowsTable.followingId, userId))
      .orderBy(userFollowsTable.createdAt))
      .map(({ user }) => user as UserRecord);
  }

  async listFollowing(userId: string): Promise<UserRecord[]> {
    return (await db
      .select({ user: usersTable })
      .from(userFollowsTable)
      .innerJoin(usersTable, eq(usersTable.id, userFollowsTable.followingId))
      .where(eq(userFollowsTable.followerId, userId))
      .orderBy(userFollowsTable.createdAt))
      .map(({ user }) => user as UserRecord);
  }
}
