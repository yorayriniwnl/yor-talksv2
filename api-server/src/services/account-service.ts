import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { createHash, randomUUID } from 'node:crypto';
import {
  invitesTable, ledgerTransactionsTable, messagesTable, usersTable,
  postsTable, commentsTable, storiesTable, storyViewsTable, storyReactionsTable,
  postLikesTable, postBookmarksTable, postRepostsTable, postPollVotesTable,
  storyPollVotesTable, videoBookmarksTable, productSavesTable, eventRsvpsTable,
  communityMembersTable, broadcastChannelMembersTable, userFollowsTable,
  userFavoriteCreatorsTable, userCloseFriendsTable, subscriptionsTable,
  reportsTable, contactShieldsTable, paymentOrdersTable, marketplaceOrdersTable,
} from "@workspace/db/schema";
import { db } from "@workspace/db";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { toOwnUser } from "../utils/user-view.js";
import { AccountExportNotFoundError, streamAccountExport } from "./account-export.js";

export class InvalidAccountPasswordError extends Error {}

/** Account lifecycle operations that must be deliberate and auditable. */
export class AccountService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisRepository: RedisRepository,
  ) {}

  streamAccountExport(userId: string, options?: { pageSize?: number; signal?: AbortSignal }): AsyncGenerator<string> {
    return streamAccountExport(userId, options);
  }

  /** Compatibility helper for internal callers. HTTP downloads consume the generator directly. */
  async exportAccount(userId: string): Promise<Record<string, unknown> | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;
    const messageExportedAt = new Date().toISOString();
    const exportBoundary = new Date();

    const [posts, comments, stories, sentMessages, receivedMessages, storyViews, storyReactions, likes, bookmarks, reposts,
      postPollVotes, storyPollVotes, videoBookmarks, productSaves, eventRsvps, communityMemberships,
      channelMemberships, following, followers, favorites, closeFriends, subscriptions, reports, shields,
      financialHistory, paymentOrders, marketplaceOrders] = await Promise.all([
      db.select().from(postsTable).where(eq(postsTable.authorId, userId)),
      db.select().from(commentsTable).where(eq(commentsTable.authorId, userId)),
      db.select().from(storiesTable).where(eq(storiesTable.authorId, userId)),
      db.select().from(messagesTable).where(and(
        eq(messagesTable.senderId, userId),
        isNull(messagesTable.deletedAt),
        or(isNull(messagesTable.expiresAt), gt(messagesTable.expiresAt, messageExportedAt)),
      )),
      db.select().from(messagesTable).where(and(
        eq(messagesTable.recipientId, userId),
        isNull(messagesTable.deletedAt),
        or(isNull(messagesTable.expiresAt), gt(messagesTable.expiresAt, messageExportedAt)),
      )),
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

    const visibleMessages = (messages: typeof sentMessages) => messages.filter((message) => {
      if (message.deletedAt) return false;
      if (message.expiresAt == null) return true;
      const expiresAt = Date.parse(message.expiresAt);
      return Number.isFinite(expiresAt) && expiresAt > Date.now();
    });

    return {
      format: "yor-talks-account-export",
      version: 1,
      exportedAt: exportBoundary.toISOString(),
      account: toOwnUser(user),
      content: { posts, comments, stories, sentMessages: visibleMessages(sentMessages), receivedMessages: visibleMessages(receivedMessages) },
      interactions: { storyViews, storyReactions, likes, bookmarks, reposts, postPollVotes, storyPollVotes, videoBookmarks, productSaves, eventRsvps },
      relationships: { following, followers, favorites, closeFriends, communityMemberships, channelMemberships, subscriptions },
      reports,
      contactShields: shields,
      financialHistory,
      paymentOrders,
      marketplaceOrders,
    };
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

      // The archive already attributes a waitlist address only after email
      // verification. Apply that same ownership rule when erasing the account;
      // an unverified signup must not remove somebody else's waitlist record.
      if (locked.emailVerified) {
        await tx.execute(sql`DELETE FROM waitlist WHERE lower(email)=lower(${locked.email})`);
      }

      // Preserve the latest restrictive guardian decision before account
      // deletion nulls its user reference; older grants must never resurface.
      await tx.execute(sql`WITH affected_subjects AS MATERIALIZED (
        SELECT DISTINCT user_id FROM guardian_authorizations WHERE guardian_user_id=${userId} AND user_id IS NOT NULL
      ), bumped AS (
        INSERT INTO eligibility_revisions(user_id,revision)
        SELECT user_id,1 FROM affected_subjects
        ON CONFLICT(user_id) DO UPDATE SET revision=eligibility_revisions.revision+1,updated_at=clock_timestamp()
        RETURNING user_id,revision
      )
      UPDATE guardian_authorizations g SET status='revoked',withdrawn_at=clock_timestamp(),subject_revision=b.revision
      FROM bumped b WHERE g.guardian_user_id=${userId} AND g.user_id=b.user_id`);
      await tx.execute(sql`WITH bumped AS (
        UPDATE eligibility_enrollments e SET revision=revision+1
        WHERE e.id IN (SELECT DISTINCT enrollment_id FROM guardian_authorizations WHERE guardian_user_id=${userId} AND enrollment_id IS NOT NULL)
        RETURNING id,revision
      )
      UPDATE guardian_authorizations g SET status='revoked',withdrawn_at=clock_timestamp(),subject_revision=b.revision
      FROM bumped b WHERE g.guardian_user_id=${userId} AND g.enrollment_id=b.id`);

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
        VALUES(${randomUUID()},'account_cleanup',${`account:${userId}`},${JSON.stringify({
          userId,
          emailHash: createHash('sha256').update(locked.email.trim().toLowerCase()).digest('hex'),
        })}::jsonb)
        ON CONFLICT(dedup_key) DO NOTHING`);

      // The normalized membership FK cascades on account deletion, but the
      // legacy JSON participant index has no FK. Keep it free of deleted IDs
      // in the same transaction so stale identities cannot leak on reads.
      await tx.execute(sql`
        UPDATE conversations
        SET participant_ids = (
          SELECT COALESCE(jsonb_agg(member.value), '[]'::jsonb)
          FROM jsonb_array_elements_text(COALESCE(participant_ids, '[]'::jsonb)) AS member(value)
          WHERE member.value <> ${userId}
        )
        WHERE COALESCE(participant_ids, '[]'::jsonb) ? ${userId}
      `);


      // Group membership remains authoritative when a legacy participant leaves.
      // Retarget both compatibility columns before the user's FK is removed.
      await tx.execute(sql`UPDATE conversations c SET
        participant_a=(SELECT cm.user_id FROM conversation_members cm
          WHERE cm.conversation_id=c.id AND cm.user_id<>${userId}
          ORDER BY cm.user_id LIMIT 1),
        participant_b=(SELECT cm.user_id FROM conversation_members cm
          WHERE cm.conversation_id=c.id AND cm.user_id<>${userId}
          ORDER BY cm.user_id DESC LIMIT 1)
        WHERE c.is_group=true AND EXISTS(
          SELECT 1 FROM conversation_members cm
          WHERE cm.conversation_id=c.id AND cm.user_id=${userId}
        )`);
      // Membership cascades after deletion; elect a replacement admin first.
      await tx.execute(sql`UPDATE conversation_members cm SET role='admin'
        WHERE cm.user_id=(SELECT survivor.user_id FROM conversation_members survivor
          WHERE survivor.conversation_id=cm.conversation_id AND survivor.user_id<>${userId}
          ORDER BY survivor.joined_at,survivor.user_id LIMIT 1)
        AND cm.conversation_id IN (SELECT conversation_id FROM conversation_members
          WHERE user_id=${userId} AND role='admin')
        AND NOT EXISTS (SELECT 1 FROM conversation_members remaining
          WHERE remaining.conversation_id=cm.conversation_id
          AND remaining.user_id<>${userId} AND remaining.role='admin')`);
      // Group invitations created against the old roster cannot remain pending.
      await tx.execute(sql`UPDATE conversation_invitations i SET
        state='revoked',
        member_ids_at_invite=coalesce((
          SELECT jsonb_agg(item.value ORDER BY item.ordinality)
          FROM jsonb_array_elements_text(coalesce(i.member_ids_at_invite,'[]'::jsonb))
            WITH ORDINALITY item(value,ordinality)
          WHERE item.value<>${userId}),'[]'::jsonb),
        guardian_required_user_ids=coalesce((
          SELECT jsonb_agg(item.value ORDER BY item.ordinality)
          FROM jsonb_array_elements_text(coalesce(i.guardian_required_user_ids,'[]'::jsonb))
            WITH ORDINALITY item(value,ordinality)
          WHERE item.value<>${userId}),'[]'::jsonb)
        WHERE i.conversation_id IN (SELECT conversation_id FROM conversation_members
          WHERE user_id=${userId})`);
      // The legacy message recipient is not the group authorization boundary.
      // Preserve shared history, replacing only obsolete recipient metadata.
      await tx.execute(sql`UPDATE messages m SET recipient_id=(
        SELECT cm.user_id FROM conversation_members cm
        WHERE cm.conversation_id=m.conversation_id AND cm.user_id<>${userId}
        ORDER BY CASE WHEN cm.user_id=m.sender_id THEN 1 ELSE 0 END,cm.user_id LIMIT 1)
        WHERE m.recipient_id=${userId} AND EXISTS(
          SELECT 1 FROM conversations c WHERE c.id=m.conversation_id AND c.is_group=true)`);
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
