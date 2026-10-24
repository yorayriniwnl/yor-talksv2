import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { followRequestsTable, userCloseFriendsTable, userFavoriteCreatorsTable, userFollowsTable, usersTable, userTermsAcceptancesTable } from "@workspace/db/schema";
import { db, type DbTransaction } from "@workspace/db";
import type { FollowRequestRecord, PrivacySettings, UserRecord, UserSettings } from "../types/index.js";
import { lockActiveUser } from "../utils/active-user-lock.js";

export class UserRepository {

  async revokeAllCredentials(userId: string): Promise<void> {
    await db.update(usersTable).set({ authVersion: sql`${usersTable.authVersion} + 1` })
      .where(eq(usersTable.id, userId));
  }

  async recordLogin(user: UserRecord, updates: Partial<Pick<UserRecord, 'emailVerified'>>): Promise<UserRecord | undefined> {
    const [record] = await db.update(usersTable).set({ ...updates, lastLoginAt: new Date().toISOString() })
      .where(and(eq(usersTable.id, user.id), eq(usersTable.authVersion, user.authVersion ?? 0),
        sql`coalesce(${usersTable.accountStatus}, 'active') = 'active'`)).returning();
    return record as UserRecord | undefined;
  }

  async savePasswordReset(tokenHash: string, user: UserRecord): Promise<void> {
    await db.execute(sql`INSERT INTO password_reset_tokens(token_hash, user_id, auth_version, expires_at)
      VALUES (${tokenHash}, ${user.id}, ${user.authVersion ?? 0}, now() + interval '1 hour')`);
  }

  async cancelPasswordReset(tokenHash: string): Promise<void> {
    await db.execute(sql`DELETE FROM password_reset_tokens WHERE token_hash = ${tokenHash} AND consumed_at IS NULL`);
  }

  async redeemPasswordReset(tokenHash: string, passwordHash: string): Promise<string | undefined> {
    return db.transaction(async tx => {
      // Lock the user before the token for a consistent lock order across distinct
      // reset tokens. Updating auth_version also invalidates every other reset.
      const candidate = await tx.execute(sql`SELECT user_id FROM password_reset_tokens WHERE token_hash = ${tokenHash}`);
      const userId = candidate.rows[0]?.user_id as string | undefined;
      if (!userId) return undefined;
      await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
      const result = await tx.execute(sql`UPDATE password_reset_tokens r SET consumed_at = now()
        FROM users u WHERE r.token_hash = ${tokenHash} AND r.user_id = u.id
        AND r.consumed_at IS NULL AND r.expires_at > now() AND r.auth_version = u.auth_version
        AND coalesce(u.account_status, 'active') NOT IN ('suspended', 'deactivated', 'deleted') RETURNING r.user_id`);
      if (!result.rowCount) return undefined;
      await tx.update(usersTable).set({ passwordHash, passwordResetRequired: false,
        authVersion: sql`${usersTable.authVersion} + 1`, updatedAt: new Date().toISOString() }).where(eq(usersTable.id, userId));
      return userId;
    });
  }

  async findByIds(ids: string[]): Promise<UserRecord[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    return await db.select().from(usersTable).where(inArray(usersTable.id, unique)) as UserRecord[];
  }

  async audienceRelationships(viewerId: string, authorIds: string[]) {
    if (!authorIds.length) return { following: new Set<string>(), closeFriends: new Set<string>() };
    const rows = await db.execute(sql`
      select following_id as author_id, 'following' as kind from user_follows
      where follower_id = ${viewerId} and following_id in (${sql.join(authorIds.map(id => sql`${id}`), sql`,`)})
      union all
      select user_id as author_id, 'close_friend' as kind from user_close_friends
      where friend_id = ${viewerId} and user_id in (${sql.join(authorIds.map(id => sql`${id}`), sql`,`)})
    `);
    return {
      following: new Set(rows.rows.filter(row => row.kind === 'following').map(row => String(row.author_id))),
      closeFriends: new Set(rows.rows.filter(row => row.kind === 'close_friend').map(row => String(row.author_id))),
    };
  }

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

  async create(user: UserRecord, tx?: DbTransaction): Promise<UserRecord> {
    const { followers: _followers, following: _following, pendingFollowIds: _pending, favoriteCreatorIds: _favorites, ...persistedUser } = user;
    const insert = async (connection: DbTransaction) => {
      const [created] = await connection.insert(usersTable).values(persistedUser).returning();
      if (user.termsVersion && user.termsAcceptedAt) {
        await connection.insert(userTermsAcceptancesTable).values({ id: randomUUID(), userId: user.id,
          termsVersion: user.termsVersion, acceptedAt: user.termsAcceptedAt, source: 'registration' }).onConflictDoNothing();
      }
      return created as UserRecord;
    };
    if (tx) return insert(tx);
    if (user.termsVersion && user.termsAcceptedAt) return db.transaction(insert);
    const [created] = await db.insert(usersTable).values(persistedUser).returning();
    return created as UserRecord;
  }

  async findByEmail(email: string, tx?: DbTransaction): Promise<UserRecord | undefined> {
    const [user] = await (tx ?? db).select().from(usersTable).where(eq(usersTable.email, email));
    return user as UserRecord | undefined;
  }

  async findByGoogleSubject(googleSubject: string): Promise<UserRecord | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.googleSubject, googleSubject));
    return user as UserRecord | undefined;
  }

  async linkGoogleSubjectForLogin(user: UserRecord, googleSubject: string): Promise<UserRecord | undefined> {
    try {
      const [linked] = await db.update(usersTable).set({ googleSubject, emailVerified: true, updatedAt: new Date().toISOString() })
        .where(and(eq(usersTable.id, user.id), eq(usersTable.email, user.email),
          eq(usersTable.authVersion, user.authVersion ?? 0), sql`${usersTable.googleSubject} IS NULL`,
          sql`coalesce(${usersTable.accountStatus}, 'active') = 'active'`)).returning();
      return linked as UserRecord | undefined;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') return undefined;
      throw error;
    }
  }

  async findByUsername(username: string, tx?: DbTransaction): Promise<UserRecord | undefined> {
    const [user] = await (tx ?? db).select().from(usersTable).where(eq(usersTable.username, username));
    return user as UserRecord | undefined;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user as UserRecord | undefined;
  }

  async update(id: string, updates: Partial<UserRecord>): Promise<UserRecord | undefined> {
    const { followers: _followers, following: _following, pendingFollowIds: _pending, favoriteCreatorIds: _favorites, ...persistedUpdates } = updates;
    if (updates.termsVersion && updates.termsAcceptedAt) {
      return db.transaction(async tx => {
        const [updated] = await tx.update(usersTable).set({ ...persistedUpdates, updatedAt: new Date().toISOString() })
          .where(eq(usersTable.id, id)).returning();
        if (!updated) return undefined;
        await tx.insert(userTermsAcceptancesTable).values({ id: randomUUID(), userId: id,
          termsVersion: updates.termsVersion!, acceptedAt: updates.termsAcceptedAt!, source: 'reacceptance' }).onConflictDoNothing();
        return updated as UserRecord;
      });
    }
    const [updated] = await db.update(usersTable)
      .set({ ...persistedUpdates, updatedAt: new Date().toISOString() })
      .where(eq(usersTable.id, id))
      .returning();
    return updated as UserRecord | undefined;
  }

  async enableTwoFactorIfDisabled(id: string, encryptedSecret: string): Promise<boolean> {
    const result = await db.update(usersTable)
      .set({ totpSecret: encryptedSecret, updatedAt: new Date().toISOString() })
      .where(and(eq(usersTable.id, id), sql`${usersTable.totpSecret} IS NULL`))
      .returning({ id: usersTable.id });
    return result.length === 1;
  }

  async disableTwoFactorIfMatches(id: string, storedSecret: string): Promise<boolean> {
    const result = await db.update(usersTable)
      .set({ totpSecret: null, updatedAt: new Date().toISOString() })
      .where(and(eq(usersTable.id, id), eq(usersTable.totpSecret, storedSecret)))
      .returning({ id: usersTable.id });
    return result.length === 1;
  }

  async patchSettings(id: string, patch: Partial<UserSettings>): Promise<UserRecord | undefined> {
    // Merge in the UPDATE, under PostgreSQL's row lock. Reading the JSON first
    // lets simultaneous requests replace each other's unrelated preferences.
    const [updated] = await db.update(usersTable).set({
      settings: sql`'{"theme":"light","notificationsEnabled":true,"privateAccount":false}'::jsonb
        || coalesce(${usersTable.settings}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
      updatedAt: new Date().toISOString(),
    }).where(eq(usersTable.id, id)).returning();
    return updated as UserRecord | undefined;
  }

  async patchPrivacy(id: string, patch: Partial<PrivacySettings>): Promise<UserRecord | undefined> {
    const [updated] = await db.update(usersTable).set({
      privacy: sql`jsonb_build_object(
          'profileVisibility', CASE WHEN ${usersTable.settings}->>'privateAccount' = 'true' THEN 'private' ELSE 'public' END,
          'messageRequests', true, 'allowDmFromStrangers', true
        ) || coalesce(${usersTable.privacy}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
      updatedAt: new Date().toISOString(),
    }).where(eq(usersTable.id, id)).returning();
    return updated as UserRecord | undefined;
  }

  async setSafetyRelationship(id: string, targetId: string, field: "blockedUsers" | "mutedUsers", enabled: boolean): Promise<UserRecord | undefined> {
    const column = usersTable[field];
    const current = sql`coalesce(${column}, '[]'::jsonb)`;
    const target = JSON.stringify([targetId]);
    // References stored in another user's JSON array must serialize against
    // deletion of the referenced account, which holds FOR UPDATE while it
    // removes that ID from every surviving array.
    return db.transaction(async tx => {
      if (!(await lockActiveUser(tx, targetId))) return undefined;
      const [updated] = await tx.update(usersTable).set({
        [field]: enabled
          ? sql`CASE WHEN ${current} @> ${target}::jsonb THEN ${current} ELSE ${current} || ${target}::jsonb END`
          : sql`${current} - ${targetId}::text`,
        updatedAt: new Date().toISOString(),
      }).where(eq(usersTable.id, id)).returning();
      if (!updated) return undefined;
      if (field === "blockedUsers" && enabled) {
        // Blocking and revoking existing contact authority share a transaction,
        // so a later unblock can never restore a previously accepted contact.
        const [userA, userB] = [id, targetId].sort();
        await tx.execute(sql`UPDATE contact_authorizations SET state='revoked',revoked_at=clock_timestamp(),updated_at=clock_timestamp()
          WHERE user_a_id=${userA}::uuid AND user_b_id=${userB}::uuid AND state IN ('pending','accepted')`);
      }
      return updated as UserRecord;
    });
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

  async listFollowingIds(userId: string): Promise<string[]> {
    const rows = await db.select({ id: userFollowsTable.followingId }).from(userFollowsTable)
      .where(eq(userFollowsTable.followerId, userId));
    return rows.map((row) => row.id);
  }

  async getOwnRelationships(userId: string): Promise<{ following: string[]; pendingFollowIds: string[]; favoriteCreatorIds: string[] }> {
    const [following, requests, favoriteCreatorIds] = await Promise.all([
      this.listFollowingIds(userId),
      db.select({ id: followRequestsTable.targetId }).from(followRequestsTable).where(and(
        eq(followRequestsTable.requesterId, userId),
        eq(followRequestsTable.status, "pending"),
      )),
      this.listFavoriteCreatorIds(userId),
    ]);
    return { following, pendingFollowIds: requests.map((request) => request.id), favoriteCreatorIds };
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
