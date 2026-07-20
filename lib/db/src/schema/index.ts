import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";

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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  followers: jsonb("followers").notNull().default([]),
  following: jsonb("following").notNull().default([]),
  settings: jsonb("settings").notNull().default({}),
  emailVerified: boolean("email_verified").default(false),
  passwordResetRequired: boolean("password_reset_required").default(false),
  lastLoginAt: timestamp("last_login_at"),
  devices: jsonb("devices").default([]),
  blockedUsers: jsonb("blocked_users").default([]),
  mutedUsers: jsonb("muted_users").default([]),
  privacy: jsonb("privacy").default({}),
});

export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey(),
  authorId: uuid("author_id").notNull(),
  content: text("content").notNull(),
  images: jsonb("images").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  likedBy: jsonb("liked_by").notNull().default([]),
  comments: jsonb("comments").notNull().default([]),
  bookmarkedBy: jsonb("bookmarked_by").notNull().default([]),
  shareCount: integer("share_count").notNull().default(0),
  reactions: jsonb("reactions").default({}),
  tags: jsonb("tags").default([]),
  mentions: jsonb("mentions").default([]),
  score: integer("score").default(0),
});

export const conversationsTable = pgTable("conversations", {
  id: uuid("id").primaryKey(),
  participantA: uuid("participant_a").notNull(),
  participantB: uuid("participant_b").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  participantIds: jsonb("participant_ids").default([]),
  isGroup: boolean("is_group").default(false),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey(),
  conversationId: uuid("conversation_id").notNull(),
  senderId: uuid("sender_id").notNull(),
  recipientId: uuid("recipient_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  seenAt: timestamp("seen_at"),
  replyToId: uuid("reply_to_id"),
  forwardedFromId: uuid("forwarded_from_id"),
  reactions: jsonb("reactions").default({}),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
  pinned: boolean("pinned").default(false),
});

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey(),
  recipientId: uuid("recipient_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: uuid("related_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
  channel: text("channel").default("in_app"),
  metadata: jsonb("metadata").default({}),
});

export const communitiesTable = pgTable("communities", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  ownerId: uuid("owner_id").notNull(),
  moderators: jsonb("moderators").notNull().default([]),
  memberIds: jsonb("member_ids").notNull().default([]),
  pendingRequests: jsonb("pending_requests").notNull().default([]),
  roles: jsonb("roles").default({}),
  inviteLinks: jsonb("invite_links").default({}),
  announcements: jsonb("announcements").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const insertPostSchema = createInsertSchema(postsTable);
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;

export const insertConversationSchema = createInsertSchema(conversationsTable);
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;

export const insertMessageSchema = createInsertSchema(messagesTable);
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notificationsTable);
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;

export const insertCommunitySchema = createInsertSchema(communitiesTable);
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communitiesTable.$inferSelect;