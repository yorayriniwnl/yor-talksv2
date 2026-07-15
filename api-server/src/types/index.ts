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
}

export interface UserSettings {
  theme: "light" | "dark";
  notificationsEnabled: boolean;
  privateAccount: boolean;
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
}

export interface CommentRecord {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  replies: ReplyRecord[];
}

export interface ReplyRecord {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
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
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  seenAt: string | null;
}

export interface ConversationRecord {
  id: string;
  participantA: string;
  participantB: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  refreshToken: string;
  createdAt: string;
}
