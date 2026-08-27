export type UserRole = "user" | "moderator" | "admin";
import type { ContentRating } from "../utils/content-safety.js";

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  googleSubject?: string | null;
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
  accountStatus?: string | null;
  activityStatus?: string | null;
  lastActiveTimestamp?: string | null;
  reputationScore?: number | null;
  engagementScore?: number | null;
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
  repostCount?: number;
  contentCategory?: string;
  contentRating?: ContentRating;
  reactions?: Record<string, string[]>;
  tags?: string[];
  mentions?: string[];
  score?: number;
  /** Legacy compatibility fields; likes, bookmarks, and comments are relational. */
  likedBy?: string[];
  bookmarkedBy?: string[];
  comments?: CommentRecord[];
  poll?: PostPoll;
}

export interface FollowRequestRecord {
  id: string;
  requesterId: string;
  targetId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface PostPollOption {
  id: string;
  text: string;
  position: number;
  votes: number;
}

export interface PostPoll {
  id: string;
  question: string;
  options: PostPollOption[];
  totalVotes: number;
  votedOptionId?: string;
}

export interface CommentRecord {
  id: string;
  authorId: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "gif" | "audio" | null;
  mediaDuration?: number | null;
  createdAt: string;
  replies: ReplyRecord[];
  reactions?: Record<string, string[]>;
  likes?: number;
  likedByMe?: boolean;
  repliesCount?: number;
  parentId?: string | null;
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

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
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

export interface CommunityDiscussion extends CommunityAnnouncement {
  authorId: string;
  tag: string;
  repliesCount: number;
  likes: number;
  likedBy?: string[];
  contentRating?: ContentRating;
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
  contentRating?: ContentRating;
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
  contentRating?: ContentRating;
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
  availability?: "active" | "reserved" | "sold";
  contentRating?: ContentRating;
}

export interface MarketplaceOrderRecord {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  provider: string;
  providerOrderId: string;
  providerPaymentId?: string | null;
  providerSignature?: string | null;
  amountMinor: number;
  currency: string;
  status: "provider_pending" | "created" | "paid" | "fulfilled" | "cancelled" | "failed";
  shippingName: string;
  shippingAddress: string;
  shippingPhone?: string | null;
  createdAt: string;
  paidAt?: string | null;
  fulfilledAt?: string | null;
}

export interface ProfileCommentRecord {
  id: string;
  profileId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  contentRating?: ContentRating;
}

export interface ProfileShowcaseRecord {
  id: string;
  userId: string;
  type: "achievement" | "post" | "custom";
  title: string;
  contentId?: string | null;
  customText?: string | null;
  customImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
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
  contentCategory?: string;
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
  likedByMe?: boolean;
  savedByMe?: boolean;
  createdAt: string;
  type: string;
  contentCategory?: string;
  contentRating?: ContentRating;
}

export interface VideoCommentRecord {
  id: string;
  videoId: string;
  authorId: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "gif" | "audio" | null;
  mediaDuration?: number | null;
  createdAt: string;
  likedBy?: string[];
  likes?: number;
  likedByMe?: boolean;
  author?: { id: string; username: string; fullName: string; avatarUrl: string | null };
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

export interface StoryPollOption {
  id: string;
  text: string;
  position: number;
  votes: number;
}

export interface StoryPoll {
  id: string;
  question: string;
  options: StoryPollOption[];
  totalVotes: number;
  votedOptionId?: string;
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
  contentCategory?: string;
  contentRating?: ContentRating;
  poll?: StoryPoll;
}

export type NoteAudience = "followers" | "public";

export interface NoteRecord {
  id: string;
  authorId: string;
  content: string;
  audience: NoteAudience;
  contentCategory?: string;
  contentRating?: ContentRating;
  createdAt: string;
  expiresAt: string;
}
