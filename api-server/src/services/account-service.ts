import bcrypt from "bcryptjs";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { randomUUID } from 'node:crypto';
import {
  articlesTable,
  broadcastChannelsTable,
  broadcastChannelMessagesTable,
  businessMembersTable,
  businessProfilesTable,
  communitiesTable,
  commentsTable,
  conversationsTable,
  conversationMembersTable,
  communityMembersTable,
  contactShieldsTable,
  creatorAnalyticsDailyTable,
  creatorProfileViewEventsTable,
  creatorWorkspaceItemsTable,
  entitlementsTable,
  eventsTable,
  eventRsvpsTable,
  broadcastChannelMembersTable,
  followRequestsTable,
  highlightsTable,
  highlightItemsTable,
  invitesTable,
  ledgerTransactionsTable,
  liveStreamsTable,
  marketplaceOrdersTable,
  mediaAssetsTable,
  messagesTable,
  messagePreviewEventsTable,
  messageReadsTable,
  notificationsTable,
  postPollOptionsTable,
  postPollsTable,
  paymentOrdersTable,
  postsTable,
  postBookmarksTable,
  postLikesTable,
  profileCommentsTable,
  profilePostPinsTable,
  profileShowcasesTable,
  postPollVotesTable,
  postRepostsTable,
  productAnalyticsEventsTable,
  productsTable,
  productSavesTable,
  projectCollaboratorsTable,
  projectsTable,
  pushSubscriptionsTable,
  reelViewsTable,
  reportsTable,
  storyAudienceExclusionsTable,
  storyAudienceMembersTable,
  storyPollOptionsTable,
  storyPollsTable,
  storiesTable,
  storyPollVotesTable,
  storyReactionsTable,
  storyViewsTable,
  subscriptionsTable,
  subscriptionOrdersTable,
  userNotesTable,
  userCloseFriendsTable,
  userFavoriteCreatorsTable,
  userFollowsTable,
  userTopicsTable,
  videoCommentsTable,
  videoBookmarksTable,
  videosTable,
  usersTable,
} from "@workspace/db/schema";
import { db } from "@workspace/db";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { toOwnUser } from "../utils/user-view.js";
import { visibleMessagePredicate } from "../utils/message-visibility.js";
import { conversationMembershipCondition } from "../repositories/message-visibility.js";
import { currentMessageResponse } from "./media-response.js";

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
    const exportBoundary = new Date();

    const [posts, comments, stories, profileComments, profileShowcases, profilePostPins, broadcastChannelMessages,
      highlights, highlightItems, notes, hostedEvents, products, articles, videos, videoComments, liveStreams,
      postPolls, postPollOptions, storyPolls, storyPollOptions, sentMessages, receivedMessages, storyViews,
      storyReactions, likes, bookmarks, reposts, postPollVotes, storyPollVotes, videoBookmarks, productSaves,
      eventRsvps, followRequests, reelViews, messageReads, messagePreviews, userTopics, storyAudienceMembers,
      storyAudienceExclusions, profileViews, analyticsEvents, notifications, communityMemberships,
      channelMemberships, following, followers, favorites, closeFriends, subscriptions, ownedCommunities,
      ownedChannels, businessProfiles, businessMemberships, ownedProjects, projectCollaborations,
      creatorWorkspaceItems, invites, pushDevices, mediaAssets, entitlements, creatorAnalytics, reports,
      shields, financialHistory, paymentOrders, subscriptionOrders, marketplaceOrders] = await Promise.all([
      db.select().from(postsTable).where(eq(postsTable.authorId, userId)),
      db.select().from(commentsTable).where(eq(commentsTable.authorId, userId)),
      db.select().from(storiesTable).where(eq(storiesTable.authorId, userId)),
      db.select().from(profileCommentsTable).where(eq(profileCommentsTable.authorId, userId)),
      db.select().from(profileShowcasesTable).where(eq(profileShowcasesTable.userId, userId)),
      db.select().from(profilePostPinsTable).where(eq(profilePostPinsTable.userId, userId)),
      db.select({ id: broadcastChannelMessagesTable.id, channelId: broadcastChannelMessagesTable.channelId,
        authorId: broadcastChannelMessagesTable.authorId, content: broadcastChannelMessagesTable.content,
        contentCategory: broadcastChannelMessagesTable.contentCategory, contentRating: broadcastChannelMessagesTable.contentRating,
        createdAt: broadcastChannelMessagesTable.createdAt })
        .from(broadcastChannelMessagesTable).where(eq(broadcastChannelMessagesTable.authorId, userId)),
      db.select().from(highlightsTable).where(eq(highlightsTable.ownerId, userId)),
      db.select({ highlightId: highlightItemsTable.highlightId, storyId: highlightItemsTable.storyId,
        position: highlightItemsTable.position, createdAt: highlightItemsTable.createdAt })
        .from(highlightItemsTable).innerJoin(highlightsTable, eq(highlightsTable.id, highlightItemsTable.highlightId))
        .where(eq(highlightsTable.ownerId, userId)),
      db.select().from(userNotesTable).where(eq(userNotesTable.authorId, userId)),
      db.select().from(eventsTable).where(eq(eventsTable.hostId, userId)),
      db.select().from(productsTable).where(eq(productsTable.sellerId, userId)),
      db.select().from(articlesTable).where(eq(articlesTable.authorId, userId)),
      db.select({ id: videosTable.id, authorId: videosTable.authorId, videoUrl: videosTable.videoUrl,
        thumbnailUrl: videosTable.thumbnailUrl, title: videosTable.title, views: videosTable.views,
        createdAt: videosTable.createdAt, type: videosTable.type, contentCategory: videosTable.contentCategory,
        contentRating: videosTable.contentRating }).from(videosTable).where(eq(videosTable.authorId, userId)),
      db.select({ id: videoCommentsTable.id, videoId: videoCommentsTable.videoId, authorId: videoCommentsTable.authorId,
        content: videoCommentsTable.content, mediaUrl: videoCommentsTable.mediaUrl, mediaType: videoCommentsTable.mediaType,
        mediaDuration: videoCommentsTable.mediaDuration, createdAt: videoCommentsTable.createdAt,
        updatedAt: videoCommentsTable.updatedAt }).from(videoCommentsTable).where(eq(videoCommentsTable.authorId, userId)),
      db.select({ id: liveStreamsTable.id, hostId: liveStreamsTable.hostId, title: liveStreamsTable.title,
        coverUrl: liveStreamsTable.coverUrl, kind: liveStreamsTable.kind, status: liveStreamsTable.status,
        viewers: liveStreamsTable.viewers, startsAt: liveStreamsTable.startsAt, category: liveStreamsTable.category,
        contentRating: liveStreamsTable.contentRating }).from(liveStreamsTable).where(eq(liveStreamsTable.hostId, userId)),
      db.select({ id: postPollsTable.id, postId: postPollsTable.postId, question: postPollsTable.question,
        createdAt: postPollsTable.createdAt }).from(postPollsTable)
        .innerJoin(postsTable, eq(postsTable.id, postPollsTable.postId)).where(eq(postsTable.authorId, userId)),
      db.select({ id: postPollOptionsTable.id, pollId: postPollOptionsTable.pollId, text: postPollOptionsTable.text,
        position: postPollOptionsTable.position, voteCount: postPollOptionsTable.voteCount }).from(postPollOptionsTable)
        .innerJoin(postPollsTable, eq(postPollsTable.id, postPollOptionsTable.pollId))
        .innerJoin(postsTable, eq(postsTable.id, postPollsTable.postId)).where(eq(postsTable.authorId, userId)),
      db.select({ id: storyPollsTable.id, storyId: storyPollsTable.storyId, question: storyPollsTable.question,
        createdAt: storyPollsTable.createdAt }).from(storyPollsTable)
        .innerJoin(storiesTable, eq(storiesTable.id, storyPollsTable.storyId)).where(eq(storiesTable.authorId, userId)),
      db.select({ id: storyPollOptionsTable.id, pollId: storyPollOptionsTable.pollId, text: storyPollOptionsTable.text,
        position: storyPollOptionsTable.position, voteCount: storyPollOptionsTable.voteCount }).from(storyPollOptionsTable)
        .innerJoin(storyPollsTable, eq(storyPollsTable.id, storyPollOptionsTable.pollId))
        .innerJoin(storiesTable, eq(storiesTable.id, storyPollsTable.storyId)).where(eq(storiesTable.authorId, userId)),
      db.select().from(messagesTable).where(and(eq(messagesTable.senderId, userId), visibleMessagePredicate(exportBoundary), conversationMembershipCondition(userId))),
      db.select().from(messagesTable).where(and(ne(messagesTable.senderId, userId), visibleMessagePredicate(exportBoundary), conversationMembershipCondition(userId))),
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
      db.select().from(followRequestsTable).where(or(eq(followRequestsTable.requesterId, userId), eq(followRequestsTable.targetId, userId))),
      db.select().from(reelViewsTable).where(eq(reelViewsTable.userId, userId)),
      db.select({ messageId: messageReadsTable.messageId, readAt: messageReadsTable.readAt }).from(messageReadsTable)
        .innerJoin(messagesTable, eq(messagesTable.id, messageReadsTable.messageId))
        .where(and(eq(messageReadsTable.userId, userId), visibleMessagePredicate(exportBoundary), conversationMembershipCondition(userId))),
      db.select({ messageId: messagePreviewEventsTable.messageId, previewedAt: messagePreviewEventsTable.previewedAt }).from(messagePreviewEventsTable)
        .innerJoin(messagesTable, eq(messagesTable.id, messagePreviewEventsTable.messageId))
        .where(and(eq(messagePreviewEventsTable.userId, userId), visibleMessagePredicate(exportBoundary), conversationMembershipCondition(userId))),
      db.select().from(userTopicsTable).where(eq(userTopicsTable.userId, userId)),
      db.select({ storyId: storyAudienceMembersTable.storyId, userId: storyAudienceMembersTable.userId,
        createdAt: storyAudienceMembersTable.createdAt }).from(storyAudienceMembersTable)
        .innerJoin(storiesTable, eq(storiesTable.id, storyAudienceMembersTable.storyId)).where(eq(storiesTable.authorId, userId)),
      db.select({ storyId: storyAudienceExclusionsTable.storyId, userId: storyAudienceExclusionsTable.userId,
        createdAt: storyAudienceExclusionsTable.createdAt }).from(storyAudienceExclusionsTable)
        .innerJoin(storiesTable, eq(storiesTable.id, storyAudienceExclusionsTable.storyId)).where(eq(storiesTable.authorId, userId)),
      db.select({ creatorId: creatorProfileViewEventsTable.creatorId, viewDate: creatorProfileViewEventsTable.viewDate,
        createdAt: creatorProfileViewEventsTable.createdAt }).from(creatorProfileViewEventsTable)
        .where(eq(creatorProfileViewEventsTable.viewerId, userId)),
      db.select({ id: productAnalyticsEventsTable.id, schemaVersion: productAnalyticsEventsTable.schemaVersion,
        eventName: productAnalyticsEventsTable.eventName, occurredAt: productAnalyticsEventsTable.occurredAt,
        properties: productAnalyticsEventsTable.properties, receivedAt: productAnalyticsEventsTable.receivedAt })
        .from(productAnalyticsEventsTable).where(eq(productAnalyticsEventsTable.actorId, userId)),
      db.select({ id: notificationsTable.id, type: notificationsTable.type, title: notificationsTable.title,
        message: notificationsTable.message, relatedId: notificationsTable.relatedId, createdAt: notificationsTable.createdAt,
        readAt: notificationsTable.readAt, channel: notificationsTable.channel }).from(notificationsTable)
        .where(eq(notificationsTable.recipientId, userId)),
      db.select().from(communityMembersTable).where(eq(communityMembersTable.userId, userId)),
      db.select().from(broadcastChannelMembersTable).where(eq(broadcastChannelMembersTable.userId, userId)),
      db.select().from(userFollowsTable).where(eq(userFollowsTable.followerId, userId)),
      db.select().from(userFollowsTable).where(eq(userFollowsTable.followingId, userId)),
      db.select().from(userFavoriteCreatorsTable).where(eq(userFavoriteCreatorsTable.userId, userId)),
      db.select().from(userCloseFriendsTable).where(eq(userCloseFriendsTable.userId, userId)),
      db.select().from(subscriptionsTable).where(or(eq(subscriptionsTable.subscriberId, userId), eq(subscriptionsTable.creatorId, userId))),
      db.select({ id: communitiesTable.id, name: communitiesTable.name, slug: communitiesTable.slug,
        description: communitiesTable.description, coverUrl: communitiesTable.coverUrl, genre: communitiesTable.genre,
        rules: communitiesTable.rules, contentRating: communitiesTable.contentRating,
        createdAt: communitiesTable.createdAt, updatedAt: communitiesTable.updatedAt })
        .from(communitiesTable).where(eq(communitiesTable.ownerId, userId)),
      db.select().from(broadcastChannelsTable).where(eq(broadcastChannelsTable.ownerId, userId)),
      db.select().from(businessProfilesTable).where(eq(businessProfilesTable.ownerId, userId)),
      db.select().from(businessMembersTable).where(eq(businessMembersTable.userId, userId)),
      db.select().from(projectsTable).where(eq(projectsTable.ownerId, userId)),
      db.select().from(projectCollaboratorsTable).where(eq(projectCollaboratorsTable.userId, userId)),
      db.select().from(creatorWorkspaceItemsTable).where(eq(creatorWorkspaceItemsTable.ownerId, userId)),
      db.select({ id: invitesTable.id, status: invitesTable.status, createdAt: invitesTable.createdAt,
        claimedAt: invitesTable.claimedAt }).from(invitesTable).where(eq(invitesTable.inviterId, userId)),
      db.select({ id: pushSubscriptionsTable.id, userAgent: pushSubscriptionsTable.userAgent,
        createdAt: pushSubscriptionsTable.createdAt, lastUsedAt: pushSubscriptionsTable.lastUsedAt })
        .from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId)),
      db.select({ id: mediaAssetsTable.id, purpose: mediaAssetsTable.purpose, status: mediaAssetsTable.status,
        resourceType: mediaAssetsTable.resourceType, declaredMime: mediaAssetsTable.declaredMime,
        declaredBytes: mediaAssetsTable.declaredBytes, verifiedMime: mediaAssetsTable.verifiedMime,
        verifiedBytes: mediaAssetsTable.verifiedBytes, width: mediaAssetsTable.width, height: mediaAssetsTable.height,
        durationSeconds: mediaAssetsTable.durationSeconds, deletionStatus: mediaAssetsTable.deletionStatus,
        createdAt: mediaAssetsTable.createdAt, finalizedAt: mediaAssetsTable.finalizedAt })
        .from(mediaAssetsTable).where(eq(mediaAssetsTable.ownerId, userId)),
      db.select().from(entitlementsTable).where(eq(entitlementsTable.userId, userId)),
      db.select().from(creatorAnalyticsDailyTable).where(eq(creatorAnalyticsDailyTable.creatorId, userId)),
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
      db.select({ id: subscriptionOrdersTable.id, subscriptionId: subscriptionOrdersTable.subscriptionId,
        subscriberId: subscriptionOrdersTable.subscriberId, creatorId: subscriptionOrdersTable.creatorId,
        provider: subscriptionOrdersTable.provider, providerOrderId: subscriptionOrdersTable.providerOrderId,
        providerPaymentId: subscriptionOrdersTable.providerPaymentId, amountMinor: subscriptionOrdersTable.amountMinor,
        currency: subscriptionOrdersTable.currency, status: subscriptionOrdersTable.status,
        createdAt: subscriptionOrdersTable.createdAt, paidAt: subscriptionOrdersTable.paidAt })
        .from(subscriptionOrdersTable).where(or(eq(subscriptionOrdersTable.subscriberId, userId), eq(subscriptionOrdersTable.creatorId, userId))),
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
      version: 2,
      exportedAt: exportBoundary.toISOString(),
      account: toOwnUser(user),
      content: { posts, comments, stories, profileComments, profileShowcases, profilePostPins, broadcastChannelMessages,
        highlights, highlightItems, notes, events: hostedEvents, products, articles, videos, videoComments, liveStreams,
        postPolls, postPollOptions, storyPolls, storyPollOptions, sentMessages, receivedMessages },
      interactions: { storyViews, storyReactions, likes, bookmarks, reposts, postPollVotes, storyPollVotes, videoBookmarks,
        productSaves, eventRsvps, followRequests, reelViews, messageReads, messagePreviews, userTopics,
        storyAudienceMembers, storyAudienceExclusions, profileViews, analyticsEvents, notifications },
      relationships: { following, followers, favorites, closeFriends, communityMemberships, channelMemberships, subscriptions },
      accountData: { communities: ownedCommunities, broadcastChannels: ownedChannels, businessProfiles, businessMemberships,
        projects: ownedProjects, projectCollaborations, creatorWorkspaceItems, invites, pushDevices, mediaAssets, entitlements },
      insights: { creatorAnalytics },
      reports,
      contactShields: shields,
      financialHistory,
      paymentOrders,
      subscriptionOrders,
      marketplaceOrders: marketplaceOrders.map(order => order.buyerId === userId ? order : {
        ...order, shippingName: null, shippingAddress: null, shippingPhone: null,
      }),
    },userId,exportBoundary);
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
