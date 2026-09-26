import bcrypt from "bcryptjs";
import { eq, or, sql } from "drizzle-orm";
import { randomUUID } from 'node:crypto';
import {
  commentsTable,
  contactShieldsTable,
  invitesTable,
  ledgerTransactionsTable,
  postsTable,
  reportsTable,
  userFollowsTable,
  usersTable,
} from "@workspace/db/schema";
import { db } from "@workspace/db";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { toOwnUser } from "../utils/user-view.js";

export class InvalidAccountPasswordError extends Error {}

/** Account lifecycle operations that must be deliberate and auditable. */
export class AccountService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisRepository: RedisRepository,
  ) {}

  async exportAccount(userId: string): Promise<Record<string, unknown> | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;

    const [posts, comments, following, followers, reports, shields] = await Promise.all([
      db.select().from(postsTable).where(eq(postsTable.authorId, userId)),
      db.select().from(commentsTable).where(eq(commentsTable.authorId, userId)),
      db.select().from(userFollowsTable).where(eq(userFollowsTable.followerId, userId)),
      db.select().from(userFollowsTable).where(eq(userFollowsTable.followingId, userId)),
      db.select().from(reportsTable).where(eq(reportsTable.reporterId, userId)),
      db.select({ id: contactShieldsTable.id, type: contactShieldsTable.identifierType, createdAt: contactShieldsTable.createdAt })
        .from(contactShieldsTable)
        .where(eq(contactShieldsTable.ownerId, userId)),
    ]);

    return {
      format: "yor-talks-account-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      account: toOwnUser(user),
      content: { posts, comments },
      relationships: { following, followers },
      reports,
      contactShields: shields,
    };
  }

  async deleteAccount(userId: string, password: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new InvalidAccountPasswordError("Password confirmation failed");
    }

    return db.transaction(async tx => {
      const [locked] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).for('update');
      if (!locked) return false;
      // Reject a password changed between confirmation and acquiring the lock.
      if (locked.passwordHash !== user.passwordHash) throw new InvalidAccountPasswordError('Credentials changed; confirm the current password');
      await tx.update(ledgerTransactionsTable).set({
        creditAccountId: sql`CASE WHEN ${ledgerTransactionsTable.creditAccountId}=${userId} THEN NULL ELSE ${ledgerTransactionsTable.creditAccountId} END`,
        debitAccountId: sql`CASE WHEN ${ledgerTransactionsTable.debitAccountId}=${userId} THEN NULL ELSE ${ledgerTransactionsTable.debitAccountId} END`,
      }).where(or(eq(ledgerTransactionsTable.creditAccountId, userId), eq(ledgerTransactionsTable.debitAccountId, userId)));
      await tx.update(invitesTable).set({ inviteeId: null }).where(eq(invitesTable.inviteeId, userId));
      // Retain provider/event references; erase only this party's personal fields.
      await tx.execute(sql`UPDATE marketplace_orders SET shipping_name='Deleted account',shipping_address='',shipping_phone=NULL WHERE buyer_id=${userId}`);
      await tx.execute(sql`UPDATE payment_orders SET message='' WHERE payer_id=${userId}`);
      await tx.execute(sql`UPDATE marketplace_orders o SET product_snapshot=jsonb_build_object('id',p.id,'title',p.title)
        FROM products p WHERE p.id=o.product_id AND p.seller_id=${userId}`);
      await tx.execute(sql`UPDATE entitlements SET status='revoked' WHERE entity_type='subscription'
        AND entity_id IN (SELECT id::text FROM subscriptions WHERE creator_id=${userId} OR subscriber_id=${userId})`);
      await tx.execute(sql`UPDATE subscriptions SET status='cancelled' WHERE creator_id=${userId} OR subscriber_id=${userId}`);
      // Preserve ambiguous legacy media references for ownership review instead
      // of deleting another person's provider asset based only on a supplied URL.
      await tx.execute(sql`INSERT INTO media_cleanup_holds(deletion_id,source_type,source_id,references_json)
        SELECT ${userId}::uuid,'post',id,images FROM posts WHERE author_id=${userId} AND images<>'[]'::jsonb
        UNION ALL SELECT ${userId}::uuid,'avatar',id,to_jsonb(avatar_url) FROM users WHERE id=${userId} AND avatar_url IS NOT NULL
        UNION ALL SELECT ${userId}::uuid,'story',id,to_jsonb(media_url) FROM stories WHERE author_id=${userId} AND media_url IS NOT NULL
        UNION ALL SELECT ${userId}::uuid,'video',id,jsonb_build_array(video_url,thumbnail_url) FROM videos WHERE author_id=${userId}`);
      await tx.execute(sql`UPDATE users SET follower_count=greatest(0,coalesce(follower_count,0)-1)
        WHERE id IN (SELECT following_id FROM user_follows WHERE follower_id=${userId})`);
      await tx.execute(sql`UPDATE users SET following_count=greatest(0,coalesce(following_count,0)-1)
        WHERE id IN (SELECT follower_id FROM user_follows WHERE following_id=${userId})`);
      await tx.execute(sql`INSERT INTO background_jobs(id,kind,dedup_key,payload)
        VALUES(${randomUUID()},'account_cleanup',${`account:${userId}`},${JSON.stringify({ userId })}::jsonb) ON CONFLICT(dedup_key) DO NOTHING`);
      // FK SET NULL preserves retained financial records; ordinary owned social
      // content cascades. Missing user rows invalidate HTTP, refresh and sockets.
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
      return true;
    });
  }
}
