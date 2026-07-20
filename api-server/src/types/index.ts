export type UserRole = "user" | "moderator" | "admin";

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
  followers: string[];
  following: string[];
  settings: UserSettings;
  emailVerified?: boolean;
  passwordResetRequired?: boolean;
  lastLoginAt?: string | null;
  devices?: string[];
  blockedUsers?: string[];
  mutedUsers?: string[];
  privacy?: PrivacySettings;
}

export interface UserSettings {
  theme: "light" | "dark";
  notificationsEnabled: boolean;
  privateAccount: boolean;
  allowMentions?: boolean;
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
  likedBy: string[];
  comments: CommentRecord[];
  bookmarkedBy: string[];
  shareCount: number;
  reactions?: Record<string, string[]>;
  tags?: string[];
  mentions?: string[];
  score?: number;
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
