import bcrypt from "bcryptjs";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { randomUUID } from 'node:crypto';
import {
  commentsTable,
  conversationsTable,
  conversationMembersTable,
  communityMembersTable,
  contactShieldsTable,
  eventRsvpsTable,
  broadcastChannelMembersTable,
  invitesTable,
  ledgerTransactionsTable,
  marketplaceOrdersTable,
  messagesTable,
  paymentOrdersTable,
  postsTable,
  postBookmarksTable,
  postLikesTable,
  postPollVotesTable,
  postRepostsTable,
  productSavesTable,
  reportsTable,
  storiesTable,
  storyPollVotesTable,
  storyReactionsTable,
  storyViewsTable,
  subscriptionsTable,
  userCloseFriendsTable,
  userFavoriteCreatorsTable,
  userFollowsTable,
  videoBookmarksTable,
  usersTable,
} from "@workspace/db/schema";
import { db } from "@workspace/db";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { toOwnUser } from "../utils/user-view.js";
import { currentMessageCondition, conversationMembershipCondition } from '../repositories/message-visibility.js';
import { currentMessageResponse } from './media-response.js';

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

    const [posts, comments, stories, sentMessages, receivedMessages, storyViews, storyReactions, likes, bookmarks, reposts,
      postPollVotes, storyPollVotes, videoBookmarks, productSaves, eventRsvps, communityMemberships,
      channelMemberships, following, followers, favorites, closeFriends, subscriptions, reports, shields,
      financialHistory, paymentOrders, marketplaceOrders] = await Promise.all([
      db.select().from(postsTable).where(eq(postsTable.authorId, userId)),
      db.select().from(commentsTable).where(eq(commentsTable.authorId, userId)),
      db.select().from(storiesTable).where(eq(storiesTable.authorId, userId)),
      db.select().from(messagesTable).where(and(eq(messagesTable.senderId, userId), currentMessageCondition(), conversationMembershipCondition(userId))),
      db.select().from(messagesTable).where(and(ne(messagesTable.senderId, userId), currentMessageCondition(), conversationMembershipCondition(userId))),
      db.select().from(storyViewsTable).where(eq(storyViewsTable.userId, userId)),
      db.select().from(storyReactionsTable).where(eq(storyReactionsTable.userId, userId)),
      db.select().from(postLikesTable).where(eq(postLikesTable.userId, userId)),
      db.select().from(postBookmarksTable).where(eq(postBookmarksTable.userId, userId)),
      db.select().from(postRepostsTable).where(eq(postRepostsTable.userId, userId)),
      db.select().from(postPollVotesTable).where(eq(postPollVotesTable.userId, userId)),
      db.select().from(storyPollVotesTable).where(eq(storyPollVotesTable.userId, userId)),
      db.select().from(videoBookmarksTable).where(eq(videoBookmarksTable.userId, userId)),
      db.select().from(productSavesTable).where(eq(productSavesTable.userId, userId)),
      db.select().from(eventRsvpsTable).where(eq(eventRsvpsTable.userId, userId)),
      db.select().from(communityMembersTable).where(eq(communityMembersTable.userId, userId)),
      db.select().from(broadcastChannelMembersTable).where(eq(broadcastChannelMembersTable.userId, userId)),
      db.select().from(userFollowsTable).where(eq(userFollowsTable.followerId, userId)),
      db.select().from(userFollowsTable).where(eq(userFollowsTable.followingId, userId)),
      db.select().from(userFavoriteCreatorsTable).where(eq(userFavoriteCreatorsTable.userId, userId)),
      db.select().from(userCloseFriendsTable).where(eq(userCloseFriendsTable.userId, userId)),
      db.select().from(subscriptionsTable).where(or(eq(subscriptionsTable.subscriberId, userId), eq(subscriptionsTable.creatorId, userId))),
      db.select().from(reportsTable).where(eq(reportsTable.reporterId, userId)),
      db.select({ id: contactShieldsTable.id, type: contactShieldsTable.identifierType, createdAt: contactShieldsTable.createdAt })
        .from(contactShieldsTable)
        .where(eq(contactShieldsTable.ownerId, userId)),
      db.select({ id: ledgerTransactionsTable.id, amountMinor: ledgerTransactionsTable.amountMinor,
        currency: ledgerTransactionsTable.currency, referenceId: ledgerTransactionsTable.referenceId,
        status: ledgerTransactionsTable.status, createdAt: ledgerTransactionsTable.createdAt })
        .from(ledgerTransactionsTable)
        .where(or(eq(ledgerTransactionsTable.creditAccountId, userId), eq(ledgerTransactionsTable.debitAccountId, userId))),
      db.select({ id: paymentOrdersTable.id, creatorId: paymentOrdersTable.creatorId, streamId: paymentOrdersTable.streamId,
        provider: paymentOrdersTable.provider, providerOrderId: paymentOrdersTable.providerOrderId,
        providerPaymentId: paymentOrdersTable.providerPaymentId, amountMinor: paymentOrdersTable.amountMinor,
        currency: paymentOrdersTable.currency, status: paymentOrdersTable.status,
        createdAt: paymentOrdersTable.createdAt, paidAt: paymentOrdersTable.paidAt })
        .from(paymentOrdersTable).where(or(eq(paymentOrdersTable.payerId, userId), eq(paymentOrdersTable.creatorId, userId))),
      db.select({ id: marketplaceOrdersTable.id, productId: marketplaceOrdersTable.productId,
        buyerId: marketplaceOrdersTable.buyerId, sellerId: marketplaceOrdersTable.sellerId,
        provider: marketplaceOrdersTable.provider, providerOrderId: marketplaceOrdersTable.providerOrderId,
        providerPaymentId: marketplaceOrdersTable.providerPaymentId, amountMinor: marketplaceOrdersTable.amountMinor,
        currency: marketplaceOrdersTable.currency, status: marketplaceOrdersTable.status,
        shippingName: marketplaceOrdersTable.shippingName, shippingAddress: marketplaceOrdersTable.shippingAddress,
        shippingPhone: marketplaceOrdersTable.shippingPhone, createdAt: marketplaceOrdersTable.createdAt,
        paidAt: marketplaceOrdersTable.paidAt, fulfilledAt: marketplaceOrdersTable.fulfilledAt })
        .from(marketplaceOrdersTable).where(or(eq(marketplaceOrdersTable.buyerId, userId), eq(marketplaceOrdersTable.sellerId, userId))),
    ]);

    return currentMessageResponse({
      format: "yor-talks-account-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      account: toOwnUser(user),
      content: { posts, comments, stories, sentMessages, receivedMessages },
      interactions: { storyViews, storyReactions, likes, bookmarks, reposts, postPollVotes, storyPollVotes, videoBookmarks, productSaves, eventRsvps },
      relationships: { following, followers, favorites, closeFriends, communityMemberships, channelMemberships, subscriptions },
      reports,
      contactShields: shields,
      financialHistory,
      paymentOrders,
      marketplaceOrders,
    },userId);
  }

  async deleteAccount(userId: string, password: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new InvalidAccountPasswordError("Password confirmation failed");
    }

    const deleted = await db.transaction(async tx => {
      const [locked] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).for('update');
      if (!locked) return false;
      if (locked.passwordHash !== user.passwordHash) {
        throw new InvalidAccountPasswordError('Credentials changed; confirm the current password');
      }

      // Direct threads retain the established erasure behavior. Group legacy
      // columns are retired by the migration, so this cannot remove groups.
      await tx.delete(conversationsTable).where(and(eq(conversationsTable.isGroup, false),
        or(eq(conversationsTable.participantA, userId), eq(conversationsTable.participantB, userId))));
      // Memberships remain authoritative; scrub the compatibility projection
      // and deterministically promote a survivor when the departing admin was
      // the group's only admin. Everything commits with cleanup enqueue.
      await tx.execute(sql`UPDATE conversations c SET participant_ids=coalesce((SELECT jsonb_agg(v)
        FROM jsonb_array_elements_text(coalesce(c.participant_ids,'[]'::jsonb)) v WHERE v<>${userId}), '[]'::jsonb)
        WHERE c.is_group=true AND c.participant_ids ? ${userId}`);
      await tx.execute(sql`UPDATE conversation_members cm SET role='admin' WHERE cm.user_id=(
        SELECT survivor.user_id FROM conversation_members survivor WHERE survivor.conversation_id=cm.conversation_id
        AND survivor.user_id<>${userId} ORDER BY survivor.joined_at,survivor.user_id LIMIT 1)
        AND cm.conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id=${userId} AND role='admin')
        AND NOT EXISTS(SELECT 1 FROM conversation_members admin WHERE admin.conversation_id=cm.conversation_id AND admin.role='admin' AND admin.user_id<>${userId})`);
      // Reactions are shared history but account identifiers need not survive
      // erasure. Removing one member must not replace other members' reactions.
      await tx.execute(sql`UPDATE messages m SET reactions=coalesce((SELECT jsonb_object_agg(key,filtered.users)
        FROM jsonb_each(coalesce(m.reactions,'{}'::jsonb)) entry
        CROSS JOIN LATERAL (SELECT coalesce(jsonb_agg(value),'[]'::jsonb) users FROM jsonb_array_elements(entry.value) value
          WHERE value<>to_jsonb(${userId}::text)) filtered),'{}'::jsonb)
        WHERE m.reactions::text LIKE ${`%${userId}%`}`);

      await tx.update(ledgerTransactionsTable).set({
        creditAccountId: sql`CASE WHEN ${ledgerTransactionsTable.creditAccountId}=${userId} THEN NULL ELSE ${ledgerTransactionsTable.creditAccountId} END`,
        debitAccountId: sql`CASE WHEN ${ledgerTransactionsTable.debitAccountId}=${userId} THEN NULL ELSE ${ledgerTransactionsTable.debitAccountId} END`,
      }).where(or(eq(ledgerTransactionsTable.creditAccountId, userId), eq(ledgerTransactionsTable.debitAccountId, userId)));
      await tx.update(invitesTable).set({ inviteeId: null }).where(eq(invitesTable.inviteeId, userId));

      await tx.execute(sql`UPDATE marketplace_orders SET shipping_name='Deleted account',shipping_address='',shipping_phone=NULL WHERE buyer_id=${userId}`);
      await tx.execute(sql`UPDATE payment_orders SET message='' WHERE payer_id=${userId}`);
      await tx.execute(sql`UPDATE marketplace_orders o SET product_snapshot=jsonb_build_object('id',p.id,'title',p.title)
        FROM products p WHERE p.id=o.product_id AND p.seller_id=${userId}`);
      await tx.execute(sql`UPDATE entitlements SET status='revoked' WHERE entity_type='subscription'
        AND entity_id IN (SELECT id::text FROM subscriptions WHERE creator_id=${userId} OR subscriber_id=${userId})`);
      await tx.execute(sql`UPDATE subscriptions SET status='cancelled' WHERE creator_id=${userId} OR subscriber_id=${userId}`);

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
        VALUES(${randomUUID()},'account_cleanup',${`account:${userId}`},${JSON.stringify({ userId })}::jsonb)
        ON CONFLICT(dedup_key) DO NOTHING`);

      await tx.delete(usersTable).where(eq(usersTable.id, userId));
      return true;
    });
    if (!deleted) return false;

    // Invalidate ordinary active sessions immediately after the durable
    // transaction commits. The queued account_cleanup job remains the retry
    // path for Redis outages, login approvals, and any sessions missed here.
    await this.redisRepository.keys(`session:${userId}:*`)
      .then((keys) => Promise.all(keys.map((key) => this.redisRepository.del(key))));
    return true;
  }
}
