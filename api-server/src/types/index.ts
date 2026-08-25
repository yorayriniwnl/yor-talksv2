export type UserRole = "user" | "moderator" | "admin";
import type { ContentRating } from "../utils/content-safety.js";

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  role: UserRole;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  /** Legacy compatibility fields; follow relationships live in user_follows. */
  followers?: string[];
  following?: string[];
  followerCount?: number;
  followingCount?: number;
  accountTypes?: string[];
  settings: UserSettings;
  emailVerified?: boolean;
  passwordResetRequired?: boolean;
  lastLoginAt?: string | null;
  devices?: string[];
  blockedUsers?: string[];
  mutedUsers?: string[];
  privacy?: PrivacySettings;
  totpSecret?: string | null;
  contactIdentityDigest?: string | null;
}

export interface UserSettings {
  theme: "light" | "dark";
  notificationsEnabled: boolean;
  privateAccount: boolean;
  allowMentions?: boolean;
  /** Highest content rating this viewer wants to see. */
  contentFilter?: ContentRating;
}

export interface PrivacySettings {
  profileVisibility: "public" | "private" | "followers";
  messageRequests: boolean;
  allowDmFromStrangers: boolean;
}

export interface PostRecord {
  id: string;
  authorId: string;
  content: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  shareCount: number;
  contentRating?: ContentRating;
  reactions?: Record<string, string[]>;
  tags?: string[];
  mentions?: string[];
  score?: number;
  /** Legacy compatibility fields; likes, bookmarks, and comments are relational. */
  likedBy?: string[];
  bookmarkedBy?: string[];
  comments?: CommentRecord[];
}

export interface CommentRecord {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  replies: ReplyRecord[];
  reactions?: Record<string, string[]>;
}

export interface ReplyRecord {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  reactions?: Record<string, string[]>;
}

export interface NotificationRecord {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedId: string | null;
  createdAt: string;
  readAt: string | null;
  channel?: "in_app" | "email" | "push";
  metadata?: Record<string, unknown>;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  seenAt: string | null;
  replyToId?: string | null;
  forwardedFromId?: string | null;
  reactions?: Record<string, string[]>;
  editedAt?: string | null;
  deletedAt?: string | null;
  pinned?: boolean;
}

export interface ConversationRecord {
  id: string;
  participantA: string;
  participantB: string;
  updatedAt: string;
  participantIds?: string[];
  isGroup?: boolean;
  title?: string | null;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  /** Kept in the service layer; controllers only serialize the access token. */
  refreshToken: string;
  expiresAt?: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  refreshToken: string;
  createdAt: string;
  deviceLabel?: string;
  lastUsedAt: string;
  revokedAt?: string | null;
}

export interface CommunityRole {
  name: string;
  permissions: string[];
}

export interface CommunityAnnouncement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface CommunityRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  moderators: string[];
  memberIds: string[];
  pendingRequests: string[];
  roles?: Record<string, CommunityRole>;
  inviteLinks?: Record<string, string>;
  announcements?: CommunityAnnouncement[];
  createdAt: string;
  updatedAt: string;
}

export interface EventRecord {
  id: string;
  hostId: string;
  title: string;
  description: string;
  coverUrl: string;
  category: string;
  startsAt: string;
  location: string;
  isOnline: boolean;
  attendeeIds: string[];
  interestedIds: string[];
  // Not usable as-is: this is a single column on the event row, so it can't
  // represent different RSVP status per viewer. attendeeIds/interestedIds
  // are the real per-user source of truth — a viewer's status is derived by
  // checking membership in those, the same way community membership works.
  rsvpStatus?: string | null;
}

export interface ProductRecord {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: string;
  createdAt: string;
  savedBy: string[];
}

export interface ArticleRecord {
  id: string;
  authorId: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  readTime: number;
  claps: number;
  createdAt: string;
  contentRating?: ContentRating;
  collection?: string | null;
}

export interface VideoRecord {
  id: string;
  authorId: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  views: number;
  likesCount?: number;
  likedBy?: string[];
  createdAt: string;
  type: string;
  contentRating?: ContentRating;
}

export interface LiveStreamRecord {
  id: string;
  hostId: string;
  title: string;
  coverUrl: string;
  kind: string;
  status: string;
  viewers: number;
  startsAt: string;
  category: string;
  guestIds: string[];
  contentRating?: ContentRating;
}

export interface StoryReaction {
  userId: string;
  emoji: string;
}

export interface StoryRecord {
  id: string;
  authorId: string;
  mediaUrl: string;
  type: string;
  textContent?: string | null;
  backgroundGradient?: string | null;
  createdAt: string;
  expiresAt: string;
  viewerIds: string[];
  reactions: StoryReaction[];
  isHighlight: boolean;
  highlightTitle?: string | null;
  contentRating?: ContentRating;
}
