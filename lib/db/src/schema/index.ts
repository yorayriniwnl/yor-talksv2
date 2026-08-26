import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid, index, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  googleSubject: text("google_subject").unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"),
  accountTypes: jsonb("account_types").notNull().default(["user"]), // Phase 9: Multi-role capability (creator, business, advertiser)
  permissions: jsonb("permissions").notNull().default([]),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
      settings: jsonb("settings").notNull().default({}),
  emailVerified: boolean("email_verified").default(false),
  passwordResetRequired: boolean("password_reset_required").default(false),
  lastLoginAt: timestamp("last_login_at", { mode: "string" }),
  devices: jsonb("devices").default([]),
  blockedUsers: jsonb("blocked_users").default([]),
  mutedUsers: jsonb("muted_users").default([]),
  privacy: jsonb("privacy").default({}),
  totpSecret: text("totp_secret"),
  contactIdentityDigest: text("contact_identity_digest"),
  location: text("location"),
  country: text("country"),
  language: text("language"),
  timeZone: text("time_zone"),
  website: text("website"),
  creatorCategory: text("creator_category"),
  subgenres: jsonb("subgenres").default([]),
  verified: boolean("verified").default(false),
  creatorType: text("creator_type"),
  accountType: text("account_type").default("personal"),
  followerCount: integer("follower_count").default(0),
  followingCount: integer("following_count").default(0),
  postCount: integer("post_count").default(0),
  reelCount: integer("reel_count").default(0),
  engagementScore: integer("engagement_score").default(0),
  reputationScore: integer("reputation_score").default(0),
  accountStatus: text("account_status").default("active"),
  activityStatus: text("activity_status").default("offline"),
  lastActiveTimestamp: timestamp("last_active_timestamp", { mode: "string" }),
});

export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey(),
  authorId: uuid("author_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  images: jsonb("images").notNull().default([]),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  bookmarksCount: integer("bookmarks_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  repostCount: integer("repost_count").notNull().default(0),
  reactions: jsonb("reactions").default({}),
  tags: jsonb("tags").default([]),
  mentions: jsonb("mentions").default([]),
  score: integer("score").default(0),
  postType: text("post_type").default("text"),
  visibility: text("visibility").default("public"),
  language: text("language"),
  contentCategory: text("content_category").notNull().default("other"),
  contentQualityScore: integer("content_quality_score").default(0),
  trendingScore: integer("trending_score").default(0),
  views: integer("views").default(0),
  engagementRate: integer("engagement_rate").default(0),
  contentRating: text("content_rating").notNull().default("regular"),
}, (table) => ({
  authorIdx: index("post_author_idx").on(table.authorId),
  scoreIdx: index("post_score_idx").on(table.score, table.createdAt),
  createdAtIdx: index("post_created_at_idx").on(table.createdAt)
}));


export const commentsTable = pgTable("comments", {
  id: uuid("id").primaryKey(),
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid("author_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  parentId: uuid("parent_id"), // Self-referencing for nested replies
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  mediaDuration: integer("media_duration"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  likedBy: jsonb("liked_by").notNull().default([]),
  reactions: jsonb("reactions").default({}),
  isPinned: boolean("is_pinned").default(false),
  repliesCount: integer("replies_count").default(0),
}, (table) => ({
  postIdx: index("comment_post_idx").on(table.postId),
  authorIdx: index("comment_author_idx").on(table.authorId),
  parentIdx: index("comment_parent_idx").on(table.parentId)
}));

export const profileCommentsTable = pgTable("profile_comments", {
  id: uuid("id").primaryKey(),
  profileId: uuid("profile_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  authorId: uuid("author_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  profileIdx: index("profile_comments_profile_idx").on(t.profileId, t.createdAt),
  authorIdx: index("profile_comments_author_idx").on(t.authorId),
}));

export const profileShowcasesTable = pgTable("profile_showcases", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull().default("custom"),
  title: text("title").notNull(),
  contentId: uuid("content_id"),
  customText: text("custom_text"),
  customImageUrl: text("custom_image_url"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index("profile_showcases_user_idx").on(t.userId, t.createdAt),
}));

export const conversationsTable = pgTable("conversations", {
  id: uuid("id").primaryKey(),
  participantA: uuid("participant_a").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  participantB: uuid("participant_b").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  participantIds: jsonb("participant_ids").default([]),
  isGroup: boolean("is_group").default(false),
  title: text("title"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  partAIdx: index("conv_part_a_idx").on(table.participantA),
  partBIdx: index("conv_part_b_idx").on(table.participantB)
}));

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey(),
  conversationId: uuid("conversation_id").references(() => conversationsTable.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid("sender_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  recipientId: uuid("recipient_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  seenAt: timestamp("seen_at", { mode: "string" }),
  replyToId: uuid("reply_to_id").references((): any => messagesTable.id),
  forwardedFromId: uuid("forwarded_from_id").references((): any => messagesTable.id),
  reactions: jsonb("reactions").default({}),
  editedAt: timestamp("edited_at", { mode: "string" }),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
  pinned: boolean("pinned").default(false),
}, (table) => ({
  convIdx: index("msg_conv_idx").on(table.conversationId),
  senderIdx: index("msg_sender_idx").on(table.senderId),
  recipientIdx: index("msg_recipient_idx").on(table.recipientId),
}));

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey(),
  recipientId: uuid("recipient_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(),
  duration: integer("duration").default(0),
  subgenre: text("subgenre"),
  hashtags: jsonb("hashtags").default([]),
  mentions: jsonb("mentions").default([]),
  comments: jsonb("comments").default([]),
  shareCount: integer("share_count").default(0),
  bookmarkedBy: jsonb("bookmarked_by").default([]),
  completionRate: integer("completion_rate").default(0),
  averageWatchTime: integer("average_watch_time").default(0),
  engagementScore: integer("engagement_score").default(0),
  trendingScore: integer("trending_score").default(0),
  recommendationScore: integer("recommendation_score").default(0),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: uuid("related_id"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  readAt: timestamp("read_at", { mode: "string" }),
  channel: text("channel").default("in_app"),
  metadata: jsonb("metadata").default({}),
}, (table) => ({
  recipIdx: index("notif_recip_idx").on(table.recipientId)
}));

export const communitiesTable = pgTable("communities", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  ownerId: uuid("owner_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  moderators: jsonb("moderators").notNull().default([]),
  memberIds: jsonb("member_ids").notNull().default([]),
  pendingRequests: jsonb("pending_requests").notNull().default([]),
  roles: jsonb("roles").default({}),
  inviteLinks: jsonb("invite_links").default({}),
  announcements: jsonb("announcements").default([]),
  genre: text("genre"),
  rules: jsonb("rules").default([]),
  postsCount: integer("posts_count").default(0),
  eventsCount: integer("events_count").default(0),
  activityScore: integer("activity_score").default(0),
  trendingScore: integer("trending_score").default(0),
  contentRating: text("content_rating").notNull().default("regular"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index("community_owner_idx").on(table.ownerId)
}));

export const storiesTable = pgTable("stories", {
  id: uuid("id").primaryKey(),
  authorId: uuid("author_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  mediaUrl: text("media_url").notNull(),
  type: text("type").notNull(),
  textContent: text("text_content"),
  backgroundGradient: text("background_gradient"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
  viewerIds: jsonb("viewer_ids").notNull().default([]),
  reactions: jsonb("reactions").notNull().default([]),
  isHighlight: boolean("is_highlight").notNull().default(false),
  highlightTitle: text("highlight_title"),
  contentCategory: text("content_category").notNull().default("other"),
  contentRating: text("content_rating").notNull().default("regular"),
}, (table) => ({
  authorIdx: index("story_author_idx").on(table.authorId)
}));

export const eventsTable = pgTable("events", {
  id: uuid("id").primaryKey(),
  hostId: uuid("host_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  coverUrl: text("cover_url").notNull(),
  category: text("category").notNull(),
  startsAt: timestamp("starts_at", { mode: "string" }).notNull(),
  location: text("location").notNull(),
  isOnline: boolean("is_online").notNull().default(false),
  attendeeIds: jsonb("attendee_ids").notNull().default([]),
  interestedIds: jsonb("interested_ids").notNull().default([]),
  rsvpStatus: text("rsvp_status"),
  contentRating: text("content_rating").notNull().default("regular"),
}, (table) => ({
  hostIdx: index("event_host_idx").on(table.hostId)
}));

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey(),
  sellerId: uuid("seller_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
  images: jsonb("images").notNull().default([]),
  category: text("category").notNull(),
  condition: text("condition").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  savedBy: jsonb("saved_by").notNull().default([]),
  availability: text("availability").notNull().default("active"),
  contentRating: text("content_rating").notNull().default("regular"),
}, (table) => ({
  sellerIdx: index("product_seller_idx").on(table.sellerId)
}));

export const articlesTable = pgTable("articles", {
  id: uuid("id").primaryKey(),
  authorId: uuid("author_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  coverUrl: text("cover_url").notNull(),
  readTime: integer("read_time").notNull().default(0),
  claps: integer("claps").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  collection: text("collection"),
  contentCategory: text("content_category").notNull().default("other"),
  contentRating: text("content_rating").notNull().default("regular"),
}, (table) => ({
  authorIdx: index("article_author_idx").on(table.authorId)
}));

export const videosTable = pgTable("videos", {
  id: uuid("id").primaryKey(),
  authorId: uuid("author_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  title: text("title").notNull(),
  views: integer("views").notNull().default(0),
  likedBy: jsonb("liked_by").notNull().default([]),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  type: text("type").notNull(),
  contentCategory: text("content_category").notNull().default("other"),
  contentRating: text("content_rating").notNull().default("regular"),
}, (table) => ({
  authorIdx: index("video_author_idx").on(table.authorId)
}));

export const videoCommentsTable = pgTable("video_comments", {
  id: uuid("id").primaryKey(),
  videoId: uuid("video_id").references(() => videosTable.id, { onDelete: "cascade" }).notNull(),
  authorId: uuid("author_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  mediaDuration: integer("media_duration"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  likedBy: jsonb("liked_by").notNull().default([]),
}, (table) => ({
  videoIdx: index("video_comment_video_idx").on(table.videoId, table.createdAt),
  authorIdx: index("video_comment_author_idx").on(table.authorId),
}));

export const videoBookmarksTable = pgTable("video_bookmarks", {
  videoId: uuid("video_id").references(() => videosTable.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.videoId, table.userId] }),
  userIdx: index("video_bookmark_user_idx").on(table.userId, table.createdAt),
  videoIdx: index("video_bookmark_video_idx").on(table.videoId),
}));

export const liveStreamsTable = pgTable("live_streams", {
  id: uuid("id").primaryKey(),
  hostId: uuid("host_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  coverUrl: text("cover_url").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  viewers: integer("viewers").notNull().default(0),
  startsAt: timestamp("starts_at", { mode: "string" }).notNull(),
  category: text("category").notNull(),
  guestIds: jsonb("guest_ids").notNull().default([]),
  contentRating: text("content_rating").notNull().default("regular"),
}, (table) => ({
  hostIdx: index("livestream_host_idx").on(table.hostId)
}));

export const marketplaceOrdersTable = pgTable("marketplace_orders", {
  id: uuid("id").primaryKey(),
  productId: uuid("product_id").references(() => productsTable.id, { onDelete: "restrict" }).notNull(),
  buyerId: uuid("buyer_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  sellerId: uuid("seller_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull().default("razorpay"),
  providerOrderId: text("provider_order_id").notNull().unique(),
  providerPaymentId: text("provider_payment_id"),
  providerSignature: text("provider_signature"),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("provider_pending"),
  shippingName: text("shipping_name").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingPhone: text("shipping_phone"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { mode: "string" }),
  fulfilledAt: timestamp("fulfilled_at", { mode: "string" }),
  reservationExpiresAt: timestamp("reservation_expires_at", { mode: "string" }),
}, (t) => ({
  productIdx: index("marketplace_order_product_idx").on(t.productId),
  buyerIdx: index("marketplace_order_buyer_idx").on(t.buyerId, t.createdAt),
  sellerIdx: index("marketplace_order_seller_idx").on(t.sellerId, t.createdAt),
}));

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { mode: "string" }),
}, (t) => ({
  userEndpointIdx: uniqueIndex("push_subscriptions_user_endpoint_idx").on(t.userId, t.endpoint),
  userIdx: index("push_subscriptions_user_idx").on(t.userId),
}));

export const storyPollsTable = pgTable("story_polls", {
  id: uuid("id").primaryKey(),
  storyId: uuid("story_id").references(() => storiesTable.id, { onDelete: "cascade" }).notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  storyIdx: uniqueIndex("story_polls_story_idx").on(t.storyId),
}));

export const storyPollOptionsTable = pgTable("story_poll_options", {
  id: uuid("id").primaryKey(),
  pollId: uuid("poll_id").references(() => storyPollsTable.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  position: integer("position").notNull(),
  voteCount: integer("vote_count").notNull().default(0),
}, (t) => ({
  pollPositionIdx: uniqueIndex("story_poll_options_poll_position_idx").on(t.pollId, t.position),
  pollIdx: index("story_poll_options_poll_idx").on(t.pollId),
}));

export const storyPollVotesTable = pgTable("story_poll_votes", {
  pollId: uuid("poll_id").references(() => storyPollsTable.id, { onDelete: "cascade" }).notNull(),
  optionId: uuid("option_id").references(() => storyPollOptionsTable.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.pollId, t.userId] }),
  optionIdx: index("story_poll_votes_option_idx").on(t.optionId),
}));

export const paymentOrdersTable = pgTable("payment_orders", {
  id: uuid("id").primaryKey(),
  payerId: uuid("payer_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  creatorId: uuid("creator_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  streamId: uuid("stream_id").references(() => liveStreamsTable.id, { onDelete: "set null" }),
  provider: text("provider").notNull().default("razorpay"),
  providerOrderId: text("provider_order_id").notNull().unique(),
  providerPaymentId: text("provider_payment_id"),
  providerSignature: text("provider_signature"),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("created"),
  message: text("message").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { mode: "string" }),
}, (table) => ({
  payerIdx: index("payment_order_payer_idx").on(table.payerId),
  creatorIdx: index("payment_order_creator_idx").on(table.creatorId),
  streamIdx: index("payment_order_stream_idx").on(table.streamId),
}));



export const postLikesTable = pgTable("post_likes", {
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.userId] }),
  userIdx: index("post_likes_user_idx").on(t.userId)
}));

export const postBookmarksTable = pgTable("post_bookmarks", {
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.userId] }),
  userIdx: index("post_bookmarks_user_idx").on(t.userId)
}));

/** A first-class repost is distinct from a link share: it is a durable
 * relationship that can be shown in a user's profile and counted safely. */
export const postRepostsTable = pgTable("post_reposts", {
  id: uuid("id").primaryKey(),
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  userPostIdx: uniqueIndex("post_reposts_user_post_idx").on(t.userId, t.postId),
  postIdx: index("post_reposts_post_idx").on(t.postId, t.createdAt),
  userIdx: index("post_reposts_user_idx").on(t.userId, t.createdAt),
}));

export const postPollsTable = pgTable("post_polls", {
  id: uuid("id").primaryKey(),
  postId: uuid("post_id").references(() => postsTable.id, { onDelete: "cascade" }).notNull(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  postIdx: uniqueIndex("post_polls_post_idx").on(t.postId),
}));

export const postPollOptionsTable = pgTable("post_poll_options", {
  id: uuid("id").primaryKey(),
  pollId: uuid("poll_id").references(() => postPollsTable.id, { onDelete: "cascade" }).notNull(),
  text: text("text").notNull(),
  position: integer("position").notNull(),
  voteCount: integer("vote_count").notNull().default(0),
}, (t) => ({
  pollPositionIdx: uniqueIndex("post_poll_options_poll_position_idx").on(t.pollId, t.position),
  pollIdx: index("post_poll_options_poll_idx").on(t.pollId),
}));

export const postPollVotesTable = pgTable("post_poll_votes", {
  pollId: uuid("poll_id").references(() => postPollsTable.id, { onDelete: "cascade" }).notNull(),
  optionId: uuid("option_id").references(() => postPollOptionsTable.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.pollId, t.userId] }),
  optionIdx: index("post_poll_votes_option_idx").on(t.optionId),
  userIdx: index("post_poll_votes_user_idx").on(t.userId),
}));

export const userFollowsTable = pgTable("user_follows", {
  followerId: uuid("follower_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  followingId: uuid("following_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.followerId, t.followingId] }),
  followingIdx: index("user_follows_following_idx").on(t.followingId)
}));

export const followRequestsTable = pgTable("follow_requests", {
  id: uuid("id").primaryKey(),
  requesterId: uuid("requester_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  targetId: uuid("target_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  requesterTargetIdx: uniqueIndex("follow_requests_requester_target_idx").on(t.requesterId, t.targetId),
  targetStatusIdx: index("follow_requests_target_status_idx").on(t.targetId, t.status, t.createdAt),
  requesterStatusIdx: index("follow_requests_requester_status_idx").on(t.requesterId, t.status),
}));

export const reelViewsTable = pgTable("reel_views", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: 'cascade' }), // Nullable for anonymous
  reelId: uuid("reel_id").references(() => videosTable.id, { onDelete: 'cascade' }).notNull(),
  startedAt: timestamp("started_at", { mode: "string" }).notNull().defaultNow(),
  watchedMs: integer("watched_ms").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  rewatched: boolean("rewatched").notNull().default(false),
}, (t) => ({
  reelIdx: index("reel_views_reel_idx").on(t.reelId),
  userIdx: index("reel_views_user_idx").on(t.userId)
}));


// ==========================================
// PHASE 4 & 9: Real-time, Analytics & Economy
// ==========================================

export const conversationMembersTable = pgTable("conversation_members", {
  conversationId: uuid("conversation_id").references(() => conversationsTable.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  joinedAt: timestamp("joined_at", { mode: "string" }).notNull().defaultNow(),
  role: text("role").default("member"),
  lastReadAt: timestamp("last_read_at", { mode: "string" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.conversationId, t.userId] }),
  userIdx: index("conv_member_user_idx").on(t.userId)
}));

export const messageReadsTable = pgTable("message_reads", {
  messageId: uuid("message_id").references(() => messagesTable.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  readAt: timestamp("read_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.messageId, t.userId] }),
}));

export const creatorAnalyticsDailyTable = pgTable("creator_analytics_daily", {
  id: uuid("id").primaryKey(),
  creatorId: uuid("creator_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  date: timestamp("date", { mode: "string" }).notNull(),
  profileViews: integer("profile_views").notNull().default(0),
  newFollowers: integer("new_followers").notNull().default(0),
  totalPostViews: integer("total_post_views").notNull().default(0),
  totalReelViews: integer("total_reel_views").notNull().default(0),
  totalEngagement: integer("total_engagement").notNull().default(0),
  estimatedEarnings: integer("estimated_earnings").notNull().default(0), // in minor units
}, (t) => ({
  creatorDateIdx: uniqueIndex("analytics_creator_date_unique_idx").on(t.creatorId, t.date),
}));

export const creatorProfileViewEventsTable = pgTable("creator_profile_view_events", {
  id: uuid("id").primaryKey(),
  creatorId: uuid("creator_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  viewerId: uuid("viewer_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  viewDate: timestamp("view_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  creatorDateIdx: index("profile_view_creator_date_idx").on(t.creatorId, t.viewDate),
  uniqueViewerDay: uniqueIndex("profile_view_creator_viewer_day_idx").on(t.creatorId, t.viewerId, t.viewDate),
}));

export const ledgerTransactionsTable = pgTable("ledger_transactions", {
  id: uuid("id").primaryKey(),
  creditAccountId: uuid("credit_account_id").references(() => usersTable.id), // Nullable for external/system
  debitAccountId: uuid("debit_account_id").references(() => usersTable.id), // Nullable for external/system
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull().default("INR"),
  referenceId: text("reference_id").notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  creditIdx: index("ledger_credit_idx").on(t.creditAccountId),
  debitIdx: index("ledger_debit_idx").on(t.debitAccountId),
  refIdx: index("ledger_ref_idx").on(t.referenceId),
}));

export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey(),
  subscriberId: uuid("subscriber_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid("creator_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  tier: text("tier").notNull().default("basic"),
  status: text("status").notNull().default("active"),
  priceMinor: integer("price_minor").notNull(),
  currency: text("currency").notNull().default("INR"),
  startedAt: timestamp("started_at", { mode: "string" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "string" }),
}, (t) => ({
  subCreatorIdx: index("sub_creator_idx").on(t.creatorId),
  subSubscriberIdx: index("sub_subscriber_idx").on(t.subscriberId),
}));

export const entitlementsTable = pgTable("entitlements", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  entityType: text("entity_type").notNull(), // 'subscription', 'course', 'event'
  entityId: text("entity_id").notNull(),
  status: text("status").notNull().default("active"),
  grantedAt: timestamp("granted_at", { mode: "string" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "string" }),
}, (t) => ({
  userEntityIdx: index("entitlement_user_entity_idx").on(t.userId, t.entityType, t.entityId),
}));

/** A provider order is kept separate from the membership itself so an
 * unverified checkout can never grant access and retries remain idempotent. */
export const subscriptionOrdersTable = pgTable("subscription_orders", {
  id: uuid("id").primaryKey(),
  subscriptionId: uuid("subscription_id").references(() => subscriptionsTable.id, { onDelete: "cascade" }).notNull(),
  subscriberId: uuid("subscriber_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  creatorId: uuid("creator_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull().default("razorpay"),
  providerOrderId: text("provider_order_id").notNull().unique(),
  providerPaymentId: text("provider_payment_id"),
  providerSignature: text("provider_signature"),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("created"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { mode: "string" }),
}, (t) => ({
  subscriptionIdx: index("subscription_order_subscription_idx").on(t.subscriptionId),
  subscriberIdx: index("subscription_order_subscriber_idx").on(t.subscriberId),
  creatorIdx: index("subscription_order_creator_idx").on(t.creatorId),
}));


// ==================== PHASE 6: DISTINCTIVE YOR IDENTITY & PROJECTS ====================

export const topicsTable = pgTable("topics", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  nameIdx: index("topic_name_idx").on(t.name),
}));

export const userTopicsTable = pgTable("user_topics", {
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: 'cascade' }).notNull(),
  affinityScore: integer("affinity_score").notNull().default(1), // 1-100 score of interest/expertise
  type: text("type").notNull().default("interest"), // 'interest', 'expertise'
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.topicId, t.type] }),
  userTopicIdx: index("user_topic_idx").on(t.userId),
}));

export const contentTopicsTable = pgTable("content_topics", {
  entityId: uuid("entity_id").notNull(), // can be post, video, article
  entityType: text("entity_type").notNull(), // 'post', 'video', 'article'
  topicId: uuid("topic_id").references(() => topicsTable.id, { onDelete: 'cascade' }).notNull(),
  confidence: integer("confidence").notNull().default(100), // AI extraction confidence
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.entityId, t.entityType, t.topicId] }),
  topicEntityIdx: index("topic_entity_idx").on(t.topicId),
}));

export const projectsTable = pgTable("projects", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planning"), // 'planning', 'active', 'completed', 'cancelled'
  visibility: text("visibility").notNull().default("public"), // 'public', 'private'
  lookingForCollaborators: boolean("looking_for_collaborators").default(false),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("project_owner_idx").on(t.ownerId),
}));

export const projectCollaboratorsTable = pgTable("project_collaborators", {
  projectId: uuid("project_id").references(() => projectsTable.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  role: text("role").notNull().default("collaborator"), // 'admin', 'collaborator', 'advisor'
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'rejected'
  joinedAt: timestamp("joined_at", { mode: "string" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.projectId, t.userId] }),
}));

export const insertProjectSchema = createInsertSchema(projectsTable);
export type InsertProject = typeof projectsTable.$inferInsert;
export type Project = typeof projectsTable.$inferSelect;

export const insertTopicSchema = createInsertSchema(topicsTable);
export type InsertTopic = typeof topicsTable.$inferInsert;
export type Topic = typeof topicsTable.$inferSelect;


// ==================== PHASE 7: GROWTH & TRUST SCALING ====================

export const waitlistTable = pgTable("waitlist", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, invited, joined
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const creatorWorkspaceItemsTable = pgTable("creator_workspace_items", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  kind: text("kind").notNull(),
  itemKey: text("item_key").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => ({
  ownerKindIdx: index("creator_workspace_owner_kind_idx").on(table.ownerId, table.kind),
  uniqueItem: uniqueIndex("creator_workspace_owner_kind_key_idx").on(table.ownerId, table.kind, table.itemKey),
}));

export const invitesTable = pgTable("invites", {
  id: uuid("id").primaryKey(),
  inviterId: uuid("inviter_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  inviteeId: uuid("invitee_id").references(() => usersTable.id), // Null until claimed
  code: text("code").notNull().unique(),
  status: text("status").notNull().default("active"), // active, claimed, revoked
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  claimedAt: timestamp("claimed_at", { mode: "string" }),
});

export const reportsTable = pgTable("reports", {
  id: uuid("id").primaryKey(),
  reporterId: uuid("reporter_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  entityType: text("entity_type").notNull(), // 'post', 'user', 'comment', 'message'
  entityId: text("entity_id").notNull(),
  reason: text("reason").notNull(), // 'spam', 'harassment', 'nsfw', 'illegal'
  details: text("details"),
  status: text("status").notNull().default("pending"), // 'pending', 'reviewed', 'resolved', 'dismissed'
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { mode: "string" }),
});

export const grievanceTicketsTable = pgTable("grievance_tickets", {
  id: uuid("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(),
  category: text("category").notNull(),
  reportedUrl: text("reported_url").notNull(),
  reporterName: text("reporter_name").notNull(),
  reporterEmail: text("reporter_email").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("received"),
  slaDeadline: timestamp("sla_deadline", { mode: "string" }).notNull(),
  officerNote: text("officer_note"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => ({
  ticketIdx: index("grievance_ticket_idx").on(table.ticketId),
  statusIdx: index("grievance_status_idx").on(table.status, table.createdAt),
}));

/**
 * Contact Shield stores only server-keyed digests of selected contact
 * identifiers. Raw address-book values and contact names are never persisted.
 */
export const contactShieldsTable = pgTable("contact_shields", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  identifierType: text("identifier_type").notNull(),
  identifierDigest: text("identifier_digest").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index("contact_shields_owner_idx").on(table.ownerId),
  digestIdx: index("contact_shields_digest_idx").on(table.identifierType, table.identifierDigest),
  uniqueIdentifier: uniqueIndex("contact_shields_owner_identifier_idx").on(table.ownerId, table.identifierType, table.identifierDigest),
}));


// ==================== PHASE 9: ECONOMIC ECOSYSTEM & BUSINESS PROFILES ====================

export const businessProfilesTable = pgTable("business_profiles", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  industry: text("industry").notNull(), // e.g. 'Retail', 'Tech', 'Agency'
  isVerified: boolean("is_verified").default(false),
  website: text("website"),
  contactEmail: text("contact_email"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  ownerIdx: index("business_owner_idx").on(t.ownerId),
}));

export const businessMembersTable = pgTable("business_members", {
  businessId: uuid("business_id").references(() => businessProfilesTable.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  role: text("role").notNull().default("employee"), // 'admin', 'manager', 'employee'
  joinedAt: timestamp("joined_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.businessId, t.userId] }),
  userIdx: index("business_member_user_idx").on(t.userId),
}));

export const insertBusinessProfileSchema = createInsertSchema(businessProfilesTable);
export type InsertBusinessProfile = typeof businessProfilesTable.$inferInsert;
export type BusinessProfile = typeof businessProfilesTable.$inferSelect;

export const commentsRelations = relations(commentsTable, ({ one, many }) => ({
  post: one(postsTable, { fields: [commentsTable.postId], references: [postsTable.id] }),
  author: one(usersTable, { fields: [commentsTable.authorId], references: [usersTable.id] }),
  parent: one(commentsTable, { fields: [commentsTable.parentId], references: [commentsTable.id], relationName: "replies" }),
  replies: many(commentsTable, { relationName: "replies" })
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable),
  sentMessages: many(messagesTable, { relationName: 'sentMessages' }),
  receivedMessages: many(messagesTable, { relationName: 'receivedMessages' }),
  communities: many(communitiesTable),
  events: many(eventsTable),
  products: many(productsTable),
  articles: many(articlesTable),
  videos: many(videosTable),
  stories: many(storiesTable),
  liveStreams: many(liveStreamsTable),
  notifications: many(notificationsTable)
}));

export const postsRelations = relations(postsTable, ({ one }) => ({
  author: one(usersTable, { fields: [postsTable.authorId], references: [usersTable.id] })
}));

export const conversationsRelations = relations(conversationsTable, ({ many, one }) => ({
  messages: many(messagesTable),
  participantA: one(usersTable, { fields: [conversationsTable.participantA], references: [usersTable.id] }),
  participantB: one(usersTable, { fields: [conversationsTable.participantB], references: [usersTable.id] })
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  conversation: one(conversationsTable, { fields: [messagesTable.conversationId], references: [conversationsTable.id] }),
  sender: one(usersTable, { fields: [messagesTable.senderId], references: [usersTable.id], relationName: 'sentMessages' }),
  recipient: one(usersTable, { fields: [messagesTable.recipientId], references: [usersTable.id], relationName: 'receivedMessages' })
}));

export const communitiesRelations = relations(communitiesTable, ({ one }) => ({
  owner: one(usersTable, { fields: [communitiesTable.ownerId], references: [usersTable.id] })
}));

export const eventsRelations = relations(eventsTable, ({ one }) => ({
  host: one(usersTable, { fields: [eventsTable.hostId], references: [usersTable.id] })
}));

export const productsRelations = relations(productsTable, ({ one }) => ({
  seller: one(usersTable, { fields: [productsTable.sellerId], references: [usersTable.id] })
}));

export const articlesRelations = relations(articlesTable, ({ one }) => ({
  author: one(usersTable, { fields: [articlesTable.authorId], references: [usersTable.id] })
}));

export const videosRelations = relations(videosTable, ({ one }) => ({
  author: one(usersTable, { fields: [videosTable.authorId], references: [usersTable.id] })
}));

export const storiesRelations = relations(storiesTable, ({ one }) => ({
  author: one(usersTable, { fields: [storiesTable.authorId], references: [usersTable.id] })
}));

export const liveStreamsRelations = relations(liveStreamsTable, ({ one }) => ({
  host: one(usersTable, { fields: [liveStreamsTable.hostId], references: [usersTable.id] })
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  recipient: one(usersTable, { fields: [notificationsTable.recipientId], references: [usersTable.id] })
}));

export const insertUserSchema = createInsertSchema(usersTable);
export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const insertPostSchema = createInsertSchema(postsTable);
export type InsertPost = typeof postsTable.$inferInsert;
export type Post = typeof postsTable.$inferSelect;

export const insertConversationSchema = createInsertSchema(conversationsTable);
export type InsertConversation = typeof conversationsTable.$inferInsert;
export type Conversation = typeof conversationsTable.$inferSelect;

export const insertMessageSchema = createInsertSchema(messagesTable);
export type InsertMessage = typeof messagesTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notificationsTable);
export type InsertNotification = typeof notificationsTable.$inferInsert;
export type Notification = typeof notificationsTable.$inferSelect;

export const insertCommunitySchema = createInsertSchema(communitiesTable);
export type InsertCommunity = typeof communitiesTable.$inferInsert;
export type Community = typeof communitiesTable.$inferSelect;

export const insertStorySchema = createInsertSchema(storiesTable);
export type InsertStory = typeof storiesTable.$inferInsert;
export type Story = typeof storiesTable.$inferSelect;

export const insertEventSchema = createInsertSchema(eventsTable);
export type InsertEvent = typeof eventsTable.$inferInsert;
export type Event = typeof eventsTable.$inferSelect;

export const insertProductSchema = createInsertSchema(productsTable);
export type InsertProduct = typeof productsTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;

export const insertArticleSchema = createInsertSchema(articlesTable);
export type InsertArticle = typeof articlesTable.$inferInsert;
export type Article = typeof articlesTable.$inferSelect;

export const insertVideoSchema = createInsertSchema(videosTable);
export type InsertVideo = typeof videosTable.$inferInsert;
export type Video = typeof videosTable.$inferSelect;
export const insertVideoCommentSchema = createInsertSchema(videoCommentsTable);
export type InsertVideoComment = typeof videoCommentsTable.$inferInsert;
export type VideoComment = typeof videoCommentsTable.$inferSelect;

export const insertLiveStreamSchema = createInsertSchema(liveStreamsTable);
export type InsertLiveStream = typeof liveStreamsTable.$inferInsert;
export type LiveStream = typeof liveStreamsTable.$inferSelect;

export const insertPaymentOrderSchema = createInsertSchema(paymentOrdersTable);
export type InsertPaymentOrder = typeof paymentOrdersTable.$inferInsert;
export type PaymentOrder = typeof paymentOrdersTable.$inferSelect;


export const insertCommentSchema = createInsertSchema(commentsTable);
export type InsertComment = typeof commentsTable.$inferInsert;
export type Comment = typeof commentsTable.$inferSelect;


export const insertConversationMemberSchema = createInsertSchema(conversationMembersTable);
export type InsertConversationMember = typeof conversationMembersTable.$inferInsert;
export type ConversationMember = typeof conversationMembersTable.$inferSelect;

export const insertCreatorAnalyticsDailySchema = createInsertSchema(creatorAnalyticsDailyTable);
export type InsertCreatorAnalyticsDaily = typeof creatorAnalyticsDailyTable.$inferInsert;
export type CreatorAnalyticsDaily = typeof creatorAnalyticsDailyTable.$inferSelect;
export const insertCreatorWorkspaceItemSchema = createInsertSchema(creatorWorkspaceItemsTable);
export type InsertCreatorWorkspaceItem = typeof creatorWorkspaceItemsTable.$inferInsert;
export type CreatorWorkspaceItem = typeof creatorWorkspaceItemsTable.$inferSelect;

export const insertLedgerTransactionSchema = createInsertSchema(ledgerTransactionsTable);
export type InsertLedgerTransaction = typeof ledgerTransactionsTable.$inferInsert;
export type LedgerTransaction = typeof ledgerTransactionsTable.$inferSelect;

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable);
export type InsertSubscription = typeof subscriptionsTable.$inferInsert;
export type Subscription = typeof subscriptionsTable.$inferSelect;

export const insertEntitlementSchema = createInsertSchema(entitlementsTable);
export type InsertEntitlement = typeof entitlementsTable.$inferInsert;
export type Entitlement = typeof entitlementsTable.$inferSelect;
