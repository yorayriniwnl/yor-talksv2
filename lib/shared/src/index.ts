/**
 * Yor Talks - Shared Domain Model (Phase 10)
 * These interfaces are designed to be consumed across:
 * - Web (React / Vite)
 * - API Server (Node / Express)
 * - Future Native Clients (React Native / Swift / Kotlin via codegen)
 */

export interface PlatformUser {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  fullName: string;
  bio: string;
  avatarUrl?: string | null;
  role: string;
  accountTypes: string[]; // 'user', 'creator', 'business', 'admin'
  isVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformBusinessProfile {
  id: string;
  ownerId: string;
  name: string;
  logoUrl?: string | null;
  industry: string;
  isVerified: boolean;
  website?: string | null;
  contactEmail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformPost {
  id: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  // Hydrated fields
  author?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

export interface PlatformTopic {
  id: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: string[];
  metadata?: any;
}
