import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import {
  ledgerTransactionsTable, messagesTable, usersTable,
  postsTable, commentsTable, storiesTable, storyViewsTable, storyReactionsTable,
  postLikesTable, postBookmarksTable, postRepostsTable, postPollVotesTable,
  storyPollVotesTable, videoBookmarksTable, productSavesTable, eventRsvpsTable,
  communityMembersTable, broadcastChannelMembersTable, userFollowsTable,
  userFavoriteCreatorsTable, userCloseFriendsTable, subscriptionsTable,
  reportsTable, contactShieldsTable, paymentOrdersTable, marketplaceOrdersTable,
} from "@workspace/db/schema";
import { db } from "@workspace/db";
import { eraseAccountData } from "@workspace/db/account-erasure";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { toOwnUser } from "../utils/user-view.js";
import { streamAccountExport } from "./account-export.js";

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

      await eraseAccountData(statement => tx.execute(statement), locked);
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
