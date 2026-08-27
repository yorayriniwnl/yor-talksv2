import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { followRequestsTable, userCloseFriendsTable, userFavoriteCreatorsTable, userFollowsTable, usersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { FollowRequestRecord, UserRecord } from "../types/index.js";

export class UserRepository {

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [relationship] = await db.select({ followerId: userFollowsTable.followerId })
      .from(userFollowsTable)
      .where(and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followingId, followingId)))
      .limit(1);
    return Boolean(relationship);
  }

  async followUser(followerId: string, followingId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const inserted = await tx.insert(userFollowsTable).values({ followerId, followingId }).onConflictDoNothing().returning({ followerId: userFollowsTable.followerId });
      if (inserted.length === 0) return false;
      await tx.execute(sql`UPDATE users SET following_count = following_count + 1 WHERE id = ${followerId}`);
      await tx.execute(sql`UPDATE users SET follower_count = follower_count + 1 WHERE id = ${followingId}`);
      return true;
    });
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const deleted = await tx.delete(userFollowsTable).where(and(eq(userFollowsTable.followerId, followerId), eq(userFollowsTable.followingId, followingId))).returning();
      if (deleted.length === 0) return;
      await tx.execute(sql`UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = ${followerId}`);
      await tx.execute(sql`UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = ${followingId}`);
    });
  }

  async findFollowRequest(requesterId: string, targetId: string): Promise<FollowRequestRecord | undefined> {
    const [request] = await db.select().from(followRequestsTable).where(and(
      eq(followRequestsTable.requesterId, requesterId),
      eq(followRequestsTable.targetId, targetId),
    )).limit(1);
    return request as FollowRequestRecord | undefined;
  }

  async findFollowRequestById(id: string, targetId: string): Promise<FollowRequestRecord | undefined> {
    const [request] = await db.select().from(followRequestsTable).where(and(
      eq(followRequestsTable.id, id),
      eq(followRequestsTable.targetId, targetId),
    )).limit(1);
    return request as FollowRequestRecord | undefined;
  }

  async createFollowRequest(requesterId: string, targetId: string): Promise<FollowRequestRecord> {
    const existing = await this.findFollowRequest(requesterId, targetId);
    if (existing) {
      if (existing.status === "pending") return existing;
      const [updated] = await db.update(followRequestsTable)
        .set({ status: "pending", updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() })
        .where(eq(followRequestsTable.id, existing.id))
        .returning();
      return updated as FollowRequestRecord;
    }
    const [created] = await db.insert(followRequestsTable).values({
      id: randomUUID(),
      requesterId,
      targetId,
      status: "pending",
    }).returning();
    return created as FollowRequestRecord;
  }

  async listPendingFollowRequests(targetId: string): Promise<Array<{ request: FollowRequestRecord; requester: UserRecord }>> {
    return (await db.select({ request: followRequestsTable, requester: usersTable })
      .from(followRequestsTable)
      .innerJoin(usersTable, eq(usersTable.id, followRequestsTable.requesterId))
      .where(and(eq(followRequestsTable.targetId, targetId), eq(followRequestsTable.status, "pending")))
      .orderBy(desc(followRequestsTable.createdAt)))
      .map(({ request, requester }) => ({ request: request as FollowRequestRecord, requester: requester as UserRecord }));
  }

  async setFollowRequestStatus(id: string, targetId: string, status: "accepted" | "rejected"): Promise<FollowRequestRecord | undefined> {
    const [updated] = await db.update(followRequestsTable)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(and(eq(followRequestsTable.id, id), eq(followRequestsTable.targetId, targetId), eq(followRequestsTable.status, "pending")))
      .returning();
    return updated as FollowRequestRecord | undefined;
  }

  async removeFollowRequest(requesterId: string, targetId: string): Promise<void> {
    await db.delete(followRequestsTable).where(and(
      eq(followRequestsTable.requesterId, requesterId),
      eq(followRequestsTable.targetId, targetId),
      eq(followRequestsTable.status, "pending"),
    ));
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

  async findByGoogleSubject(googleSubject: string): Promise<UserRecord | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.googleSubject, googleSubject));
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

  async listFavoriteCreatorIds(userId: string): Promise<string[]> {
    const rows = await db.select({ creatorId: userFavoriteCreatorsTable.creatorId })
      .from(userFavoriteCreatorsTable)
      .where(eq(userFavoriteCreatorsTable.userId, userId))
      .orderBy(desc(userFavoriteCreatorsTable.createdAt));
    return rows.map(({ creatorId }) => creatorId);
  }

  async isFavoriteCreator(userId: string, creatorId: string): Promise<boolean> {
    const [favorite] = await db.select({ creatorId: userFavoriteCreatorsTable.creatorId })
      .from(userFavoriteCreatorsTable)
      .where(and(
        eq(userFavoriteCreatorsTable.userId, userId),
        eq(userFavoriteCreatorsTable.creatorId, creatorId),
      ))
      .limit(1);
    return Boolean(favorite);
  }

  async addFavoriteCreator(userId: string, creatorId: string): Promise<boolean> {
    const inserted = await db.insert(userFavoriteCreatorsTable)
      .values({ userId, creatorId })
      .onConflictDoNothing()
      .returning({ creatorId: userFavoriteCreatorsTable.creatorId });
    return inserted.length > 0;
  }

  async removeFavoriteCreator(userId: string, creatorId: string): Promise<boolean> {
    const deleted = await db.delete(userFavoriteCreatorsTable)
      .where(and(
        eq(userFavoriteCreatorsTable.userId, userId),
        eq(userFavoriteCreatorsTable.creatorId, creatorId),
      ))
      .returning({ creatorId: userFavoriteCreatorsTable.creatorId });
    return deleted.length > 0;
  }

  async listCloseFriendIds(userId: string): Promise<string[]> {
    const rows = await db.select({ friendId: userCloseFriendsTable.friendId })
      .from(userCloseFriendsTable)
      .where(eq(userCloseFriendsTable.userId, userId))
      .orderBy(desc(userCloseFriendsTable.createdAt));
    return rows.map(({ friendId }) => friendId);
  }

  async isCloseFriend(userId: string, friendId: string): Promise<boolean> {
    const [relationship] = await db.select({ friendId: userCloseFriendsTable.friendId })
      .from(userCloseFriendsTable)
      .where(and(
        eq(userCloseFriendsTable.userId, userId),
        eq(userCloseFriendsTable.friendId, friendId),
      ))
      .limit(1);
    return Boolean(relationship);
  }

  async addCloseFriend(userId: string, friendId: string): Promise<boolean> {
    const inserted = await db.insert(userCloseFriendsTable)
      .values({ userId, friendId })
      .onConflictDoNothing()
      .returning({ friendId: userCloseFriendsTable.friendId });
    return inserted.length > 0;
  }

  async removeCloseFriend(userId: string, friendId: string): Promise<boolean> {
    const deleted = await db.delete(userCloseFriendsTable)
      .where(and(
        eq(userCloseFriendsTable.userId, userId),
        eq(userCloseFriendsTable.friendId, friendId),
      ))
      .returning({ friendId: userCloseFriendsTable.friendId });
    return deleted.length > 0;
  }
}
