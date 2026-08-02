import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"),
  permissions: jsonb("permissions").notNull().default([]),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  followers: jsonb("followers").notNull().default([]),
  following: jsonb("following").notNull().default([]),
  settings: jsonb("settings").notNull().default({}),
  emailVerified: boolean("email_verified").default(false),
  passwordResetRequired: boolean("password_reset_required").default(false),
  lastLoginAt: timestamp("last_login_at", { mode: "string" }),
  devices: jsonb("devices").default([]),
  blockedUsers: jsonb("blocked_users").default([]),
  mutedUsers: jsonb("muted_users").default([]),
  privacy: jsonb("privacy").default({}),
  totpSecret: text("totp_secret"),
});

export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey(),
  authorId: uuid("author_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  content: text("content").notNull(),
  images: jsonb("images").notNull().default([]),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  likedBy: jsonb("liked_by").notNull().default([]),
  comments: jsonb("comments").notNull().default([]),
  bookmarkedBy: jsonb("bookmarked_by").notNull().default([]),
  shareCount: integer("share_count").notNull().default(0),
  reactions: jsonb("reactions").default({}),
  tags: jsonb("tags").default([]),
  mentions: jsonb("mentions").default([]),
  score: integer("score").default(0),
}, (table) => ({
  authorIdx: index("post_author_idx").on(table.authorId)
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
}, (table) => ({
  hostIdx: index("event_host_idx").on(table.hostId)
}));

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey(),
  sellerId: uuid("seller_id").references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  images: jsonb("images").notNull().default([]),
  category: text("category").notNull(),
  condition: text("condition").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  savedBy: jsonb("saved_by").notNull().default([]),
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
}, (table) => ({
  authorIdx: index("video_author_idx").on(table.authorId)
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
}, (table) => ({
  hostIdx: index("livestream_host_idx").on(table.hostId)
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

export const insertLiveStreamSchema = createInsertSchema(liveStreamsTable);
export type InsertLiveStream = typeof liveStreamsTable.$inferInsert;
export type LiveStream = typeof liveStreamsTable.$inferSelect;
