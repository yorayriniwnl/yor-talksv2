// Real API client for the backend built in api-server/. Every function here
// hits an endpoint that's actually implemented and verified end-to-end.
// Vite's dev server proxies /api to the backend (see social/vite.config.ts),
// so these are same-origin relative calls in both dev and any deployment
// that serves the built frontend behind the same reverse proxy as the API.

export interface Tokens {
  accessToken: string;
  /** Refresh tokens are HttpOnly cookies and are never available to JS. */
  refreshToken?: string;
  expiresAt?: string;
}

export type AuthTokens = Tokens;

export type TwoFactorChallenge = {
  requiresTwoFactor: true;
  challengeId: string;
  matchingNumber: number;
  expiresAt: string;
};
export type PendingTwoFactorChallenge = Omit<TwoFactorChallenge, 'requiresTwoFactor'>;
export type TwoFactorChallengeStatus = {
  challengeId: string;
  status: 'pending' | 'approved' | 'expired';
  expiresAt: string;
};
export type AuthLoginResult = { user: BackendUser; tokens: AuthTokens } | TwoFactorChallenge;

const TOKEN_STORAGE_KEY = 'yortalks-tokens';
export type ContentRating = 'child_safe' | 'regular' | 'mature';
export type { ContentCategory } from './content-category';
import type { ContentCategory } from './content-category';
let memoryAccessToken: string | null = null;

export function getStoredTokens(): Tokens | null {
  if (memoryAccessToken) return { accessToken: memoryAccessToken };
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const legacy = JSON.parse(raw) as Partial<Tokens>;
    // Migrate legacy browser storage by retaining only the short-lived access
    // token. The refresh credential is now supplied by an HttpOnly cookie.
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (typeof legacy.accessToken !== 'string' || !legacy.accessToken) return null;
    memoryAccessToken = legacy.accessToken;
    return { accessToken: memoryAccessToken };
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: Tokens | null): void {
  if (tokens) {
    memoryAccessToken = tokens.accessToken;
  } else {
    memoryAccessToken = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export interface PaginatedResponse<T> {
  data: T;
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
  meta: Record<string, unknown>;
}

let refreshInFlight: Promise<Tokens | null> | null = null;

async function tryRefresh(): Promise<Tokens | null> {
  // Coalesce concurrent refreshes (e.g. several components hitting a 401 at once)
  // into a single request instead of racing multiple refresh calls.
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (!res.ok) return null;
        const json = (await res.json()) as ApiEnvelope<Tokens>;
        return json.success ? json.data : null;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function refreshSession(): Promise<Tokens | null> {
  const refreshed = await tryRefresh();
  if (refreshed) setStoredTokens(refreshed);
  return refreshed;
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const tokens = getStoredTokens();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (tokens) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      setStoredTokens(refreshed);
      return request<T>(path, options, true);
    }
    setStoredTokens(null);
  }

  let json: ApiEnvelope<T> | null = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }

  if (!res.ok || !json?.success) {
    throw new ApiError(json?.errors?.[0] || json?.message || `Request failed (${res.status})`, res.status);
  }
  return json.data;
}

export interface PaginatedResult<T> {
  data: T;
  nextCursor?: string;
  hasMore?: boolean;
}

async function requestPaginated<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<PaginatedResult<T>> {
  const tokens = getStoredTokens();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (tokens) headers['Authorization'] = `Bearer ${tokens.accessToken}`;

  const res = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });
  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      setStoredTokens(refreshed);
      return requestPaginated<T>(path, options, true);
    }
    setStoredTokens(null);
  }

  let json: any = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok || !json?.success) {
    throw new ApiError(json?.errors?.[0] || json?.message || `Request failed (${res.status})`, res.status);
  }

  const data = (Array.isArray(json.data) ? json.data : json.data?.items ?? json.data ?? []) as T;
  const nextCursor = json.meta?.nextCursor ?? json.data?.nextCursor ?? null;
  const hasMore = Boolean(json.meta?.hasMore ?? json.data?.hasMore ?? nextCursor);

  return { data, nextCursor, hasMore };
}

// ---- Auth ----
export interface BackendUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  role: string;
  followers?: string[];
  following?: string[];
  followerCount?: number;
  followingCount?: number;
  emailVerified: boolean;
  createdAt: string;
  blockedUsers?: string[];
  mutedUsers?: string[];
  twoFactorEnabled?: boolean;
  settings?: { notificationsEnabled?: boolean; privateAccount?: boolean; theme?: 'light' | 'dark'; contentFilter?: ContentRating };
  privacy?: { profileVisibility: 'public' | 'private' | 'followers'; messageRequests: boolean; allowDmFromStrangers: boolean };
}

export interface BackendFollowRequest {
  id: string;
  requesterId: string;
  targetId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  requester: BackendUser;
}

export type CreatorWorkspaceKind = 'draft' | 'scheduled' | 'collection' | 'collaboration' | 'quest' | 'preference';

export interface CreatorWorkspaceItem {
  id: string;
  ownerId: string;
  kind: CreatorWorkspaceKind;
  itemKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorAnalyticsDaily {
  id: string;
  creatorId: string;
  date: string;
  profileViews: number;
  newFollowers: number;
  totalPostViews: number;
  totalReelViews: number;
  totalEngagement: number;
  estimatedEarnings: number;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  entityType: 'post' | 'user' | 'comment' | 'message';
  entityId: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
}

export interface ContactShield {
  id: string;
  type: 'email' | 'phone';
  createdAt: string;
}

export interface BackendProject {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  visibility: 'public' | 'private';
  lookingForCollaborators: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  request: <T>(path: string, options: RequestInit = {}) => request<T>(path, options),
  refreshSession,
  register: (payload: { username: string; email: string; password: string; fullName: string }) =>
    request<{ user: BackendUser; verificationRequired: boolean; devVerificationToken?: string }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { identifier: string; password: string; totpCode?: string; challengeId?: string }) =>
    request<AuthLoginResult>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  loginWithGoogle: (payload: { credential: string; totpCode?: string; challengeId?: string }) =>
    request<AuthLoginResult>('/auth/google', { method: 'POST', body: JSON.stringify(payload) }),
  requestEmailOtp: (email: string) =>
    request<null>('/auth/email-otp/send', { method: 'POST', body: JSON.stringify({ email }) }),
  loginWithEmailOtp: (payload: { email: string; code: string; totpCode?: string; challengeId?: string }) =>
    request<AuthLoginResult>('/auth/email-otp/verify', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () => {
    return request<null>('/auth/logout', { method: 'POST' });
  },

  requestPasswordReset: (email: string) =>
    request<{ devResetToken?: string } | null>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),

  confirmPasswordReset: (token: string, newPassword: string) =>
    request<null>('/auth/reset-password/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

  setupTwoFactor: () => request<{ secret: string; otpauthUrl: string }>('/auth/2fa/setup', { method: 'POST' }),
  confirmTwoFactor: (code: string) => request<null>('/auth/2fa/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
  disableTwoFactor: (code: string) => request<null>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
  listTwoFactorChallenges: () => request<PendingTwoFactorChallenge[]>('/auth/2fa/challenges'),
  getTwoFactorChallengeStatus: (challengeId: string) =>
    request<TwoFactorChallengeStatus>(`/auth/2fa/challenges/${encodeURIComponent(challengeId)}`),
  approveTwoFactorChallenge: (challengeId: string, matchingNumber: number) =>
    request<null>(`/auth/2fa/challenges/${encodeURIComponent(challengeId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ matchingNumber }),
    }),
  denyTwoFactorChallenge: (challengeId: string) =>
    request<null>(`/auth/2fa/challenges/${encodeURIComponent(challengeId)}/deny`, { method: 'POST' }),
  completeTwoFactorLogin: (challengeId: string) =>
    request<{ user: BackendUser; tokens: AuthTokens }>(`/auth/2fa/challenges/${encodeURIComponent(challengeId)}/complete`, { method: 'POST' }),

  resendVerificationEmail: () => request<{ devVerificationToken?: string } | null>('/auth/verify-email/resend', { method: 'POST' }),
  resendPublicVerificationEmail: (email: string) => request<null>('/auth/verify-email/resend-public', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyEmail: (token: string) => request<{ user: BackendUser }>(`/auth/verify-email/${encodeURIComponent(token)}`),

  // ---- Users ----
  getCurrentUser: () => request<BackendUser>('/users/me'),
  exportMyData: () => request<Record<string, unknown>>('/users/me/export'),
  deleteAccount: (password: string) => request<null>('/users/me', { method: 'DELETE', body: JSON.stringify({ confirmation: 'DELETE', password }) }),
  getProfile: (userId: string) => request<BackendUser>(`/users/${userId}`),
  getProfileByUsername: (username: string) => request<BackendUser>(`/users/by-username/${encodeURIComponent(username)}`),
  updateProfile: (payload: { fullName?: string; bio?: string; avatarUrl?: string }) =>
    request<BackendUser>('/users/me', { method: 'PUT', body: JSON.stringify(payload) }),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return request<BackendUser>('/users/me/avatar', { method: 'POST', body: form });
  },
  searchUsers: (q: string) => request<BackendUser[]>(`/users/search?q=${encodeURIComponent(q)}`),
  followUser: (userId: string) => request<{ follower: BackendUser; target: BackendUser; status: 'accepted' | 'pending' }>(`/users/${userId}/follow`, { method: 'POST' }),
  unfollowUser: (userId: string) => request<{ follower: BackendUser; target: BackendUser }>(`/users/${userId}/unfollow`, { method: 'POST' }),
  getFollowers: (userId: string) => request<BackendUser[]>(`/users/${userId}/followers`),
  getFollowing: (userId: string) => request<BackendUser[]>(`/users/${userId}/following`),
  getFollowRequests: () => request<BackendFollowRequest[]>('/users/me/follow-requests'),
  acceptFollowRequest: (requestId: string) => request<{ request: BackendFollowRequest; follower: BackendUser; target: BackendUser }>(`/users/me/follow-requests/${encodeURIComponent(requestId)}/accept`, { method: 'POST' }),
  rejectFollowRequest: (requestId: string) => request<BackendFollowRequest>(`/users/me/follow-requests/${encodeURIComponent(requestId)}/reject`, { method: 'POST' }),
  updateSettings: (payload: { theme?: 'light' | 'dark'; notificationsEnabled?: boolean; privateAccount?: boolean; contentFilter?: ContentRating }) =>
    request<BackendUser>('/users/me/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  updatePrivacy: (payload: { profileVisibility?: 'public' | 'private' | 'followers'; messageRequests?: boolean; allowDmFromStrangers?: boolean }) =>
    request<{ profileVisibility: 'public' | 'private' | 'followers'; messageRequests: boolean; allowDmFromStrangers: boolean }>('/users/me/privacy', { method: 'PUT', body: JSON.stringify(payload) }),
  submitReport: (payload: { entityType: 'post' | 'user' | 'comment' | 'message'; entityId: string; reason: 'spam' | 'harassment' | 'nsfw' | 'illegal' | 'hate_speech' | 'privacy_violation' | 'copyright' | 'other'; details?: string }) =>
    request<null>('/reports', { method: 'POST', body: JSON.stringify(payload) }),
  blockUser: (userId: string) => request<{ blockedUsers: string[] }>(`/users/${userId}/block`, { method: 'POST' }),
  unblockUser: (userId: string) => request<{ blockedUsers: string[] }>(`/users/${userId}/unblock`, { method: 'POST' }),
  muteUser: (userId: string) => request<{ mutedUsers: string[] }>(`/users/${userId}/mute`, { method: 'POST' }),
  unmuteUser: (userId: string) => request<{ mutedUsers: string[] }>(`/users/${userId}/unmute`, { method: 'POST' }),
  getContactShields: () => request<ContactShield[]>('/users/me/contact-shields'),
  addContactShields: (contacts: Array<{ type: 'email' | 'phone'; value: string }>) =>
    request<ContactShield[]>('/users/me/contact-shields', { method: 'POST', body: JSON.stringify({ contacts }) }),
  removeContactShield: (shieldId: string) =>
    request<null>(`/users/me/contact-shields/${shieldId}`, { method: 'DELETE' }),

  // ---- Creator workspace ----
  getCreatorWorkspace: (kind?: CreatorWorkspaceKind) =>
    request<CreatorWorkspaceItem[]>(`/creator/workspace${kind ? `?kind=${encodeURIComponent(kind)}` : ''}`),
  saveCreatorWorkspaceItem: (payload: { kind: CreatorWorkspaceKind; itemKey: string; payload: Record<string, unknown> }) =>
    request<CreatorWorkspaceItem>('/creator/workspace', { method: 'PUT', body: JSON.stringify(payload) }),
  deleteCreatorWorkspaceItem: (kind: CreatorWorkspaceKind, itemKey: string) =>
    request<null>(`/creator/workspace/${encodeURIComponent(kind)}/${encodeURIComponent(itemKey)}`, { method: 'DELETE' }),
  getCreatorAnalytics: () => request<CreatorAnalyticsDaily[]>('/economy/analytics'),
  getModerationQueue: () => request<ModerationReport[]>('/reports/queue'),
  updateReportStatus: (reportId: string, status: ModerationReport['status']) =>
    request<ModerationReport>(`/reports/${encodeURIComponent(reportId)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ---- Posts / feed ----
  getFeed: (cursor?: string, limit = 20) => requestPaginated<BackendPost[]>(`/feed?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),
  getTrendingFeed: (_page = 1, pageSize = 20) => request<BackendPost[]>(`/feed/trending?limit=${pageSize}`),
  getUserFeed: (userId: string, _page = 1, pageSize = 20) => request<BackendPost[]>(`/users/${userId}/feed?limit=${pageSize}`),
  createPost: (payload: { content: string; images?: string[]; contentCategory: ContentCategory; contentRating?: ContentRating; poll?: { question: string; options: Array<{ text: string }> } }) => request<BackendPost>('/posts', { method: 'POST', body: JSON.stringify(payload) }),
  getPost: (postId: string) => request<BackendPost>(`/posts/${postId}`),
  editPost: (postId: string, content: string) => request<BackendPost>(`/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  deletePost: (postId: string) => request<null>(`/posts/${postId}`, { method: 'DELETE' }),
  likePost: (postId: string) => request<BackendPost>(`/posts/${postId}/like`, { method: 'POST' }),
  unlikePost: (postId: string) => request<BackendPost>(`/posts/${postId}/unlike`, { method: 'POST' }),
  bookmarkPost: (postId: string) => request<BackendPost>(`/posts/${postId}/bookmark`, { method: 'POST' }),
  sharePost: (postId: string) => request<BackendPost>(`/posts/${postId}/share`, { method: 'POST' }),
  repostPost: (postId: string, note?: string) => request<BackendPost>(`/posts/${postId}/repost`, { method: 'POST', body: JSON.stringify(note ? { note } : {}) }),
  unrepostPost: (postId: string) => request<BackendPost>(`/posts/${postId}/repost`, { method: 'DELETE' }),
  votePostPoll: (postId: string, optionId: string) => request<BackendPost>(`/posts/${postId}/poll/vote`, { method: 'POST', body: JSON.stringify({ optionId }) }),
  commentOnPost: (postId: string, payload: { content?: string; mediaUrl?: string; mediaType?: 'image' | 'gif' | 'audio'; mediaDuration?: number }) => request<{ post: BackendPost; comment: BackendComment }>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  getPostComments: (postId: string) => request<BackendComment[]>(`/posts/${postId}/comments`),
  uploadPostImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return request<{ url: string }>('/posts/upload-image', { method: 'POST', body: form });
  },
  uploadMedia: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ id: string; url: string; thumbnailUrl: string; mimeType: string; size: number }>('/media/upload', { method: 'POST', body: form });
  },

  // ---- Communities ----
  getCommunities: () => request<BackendCommunity[]>('/communities'),
  getCommunity: (idOrSlug: string) => request<BackendCommunity>(`/communities/${idOrSlug}`),
  createCommunity: (payload: { name: string; slug: string; description?: string }) =>
    request<BackendCommunity>('/communities', { method: 'POST', body: JSON.stringify(payload) }),
  joinCommunity: (id: string) => request<BackendCommunity>(`/communities/${id}/join`, { method: 'POST' }),
  leaveCommunity: (id: string) => request<BackendCommunity>(`/communities/${id}/leave`, { method: 'POST' }),
  getCommunityDiscussions: (id: string) => request<BackendCommunityDiscussion[]>(`/communities/${encodeURIComponent(id)}/discussions`),
  createCommunityDiscussion: (id: string, payload: { title: string; content?: string; tag: string }) =>
    request<BackendCommunityDiscussion>(`/communities/${encodeURIComponent(id)}/discussions`, { method: 'POST', body: JSON.stringify(payload) }),
  likeCommunityDiscussion: (communityId: string, discussionId: string) =>
    request<BackendCommunityDiscussion>(`/communities/${encodeURIComponent(communityId)}/discussions/${encodeURIComponent(discussionId)}/like`, { method: 'POST' }),

  // ---- Projects / dreams ----
  getProjects: () => request<{ projects: BackendProject[] }>('/projects').then((result) => result.projects),
  createProject: (payload: { title: string; description?: string; visibility?: 'public' | 'private'; lookingForCollaborators?: boolean }) =>
    request<BackendProject>('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  inviteProjectCollaborator: (projectId: string, userId: string, role?: 'collaborator' | 'advisor') =>
    request<null>(`/projects/${projectId}/collaborators`, { method: 'POST', body: JSON.stringify({ userId, role }) }),

  // ---- Stories ----
  getStories: () => request<BackendStory[]>('/stories'),
  createStory: (payload: { mediaUrl: string; type: string; textContent?: string; backgroundGradient?: string; isHighlight?: boolean; highlightTitle?: string; contentCategory: ContentCategory; contentRating?: ContentRating; poll?: { question: string; options: Array<{ text: string }> } }) =>
    request<BackendStory>('/stories', { method: 'POST', body: JSON.stringify(payload) }),
  viewStory: (id: string) => request<BackendStory>(`/stories/${id}/view`, { method: 'POST' }),
  reactToStory: (id: string, emoji: string) => request<BackendStory>(`/stories/${id}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }),
  voteStoryPoll: (id: string, optionId: string) => request<BackendStory>(`/stories/${id}/poll/vote`, { method: 'POST', body: JSON.stringify({ optionId }) }),

  // ---- Economy ----
  getCreatorWallet: () => request<{ balanceMinor: number; currency: string }>('/economy/wallet'),
  createTipOrder: (payload: { creatorId: string; streamId?: string; amountMinor: number; message?: string }) =>
    request<{ orderId: string; amountMinor: number; currency: string; keyId: string }>('/economy/orders', { method: 'POST', body: JSON.stringify(payload) }),
  verifyTipPayment: (orderId: string, payload: { paymentId: string; signature: string }) =>
    request<{ transactionId: string; status: 'paid' }>(`/economy/orders/${encodeURIComponent(orderId)}/verify`, { method: 'POST', body: JSON.stringify(payload) }),
  sendSuperchat: (payload: { streamId: string; creatorId: string; amountMinor: number; message: string }) =>
    request<{ transactionId: string }>('/economy/superchat', { method: 'POST', body: JSON.stringify(payload) }),

  // ---- Messages ----
  sendMessage: (recipientId: string, content: string, replyToId?: string) => request<BackendMessage>('/messages', { method: 'POST', body: JSON.stringify({ recipientId, content, ...(replyToId ? { replyToId } : {}) }) }),
  getConversations: () => request<{ conversation: BackendConversation; lastMessage: BackendMessage | null }[]>('/conversations'),
  getConversationMessages: (conversationId: string) => request<BackendMessage[]>(`/conversations/${conversationId}/messages`),

  // ---- Notifications ----
  getNotifications: () => request<BackendNotification[]>('/notifications'),
  markNotificationRead: (notificationId: string) => request<BackendNotification>(`/notifications/${notificationId}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request<null>('/notifications/read-all', { method: 'POST' }),
  getPushPublicKey: () => request<{ publicKey: string }>('/notifications/push/public-key'),
  savePushSubscription: (subscription: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }) =>
    request<{ id: string }>('/notifications/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
  removePushSubscription: (endpoint: string) =>
    request<null>('/notifications/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint }) }),

  // ---- Search ----
  search: (q: string) => request<{ users: BackendUser[]; posts: BackendPost[] }>(`/search?q=${encodeURIComponent(q)}`),

  // ---- Events ----
  getEvents: () => request<BackendEvent[]>('/events'),
  getEvent: (id: string) => request<BackendEvent>(`/events/${id}`),
  createEvent: (payload: { title: string; description?: string; coverUrl: string; category: string; startsAt: string; location: string; isOnline?: boolean }) =>
    request<BackendEvent>('/events', { method: 'POST', body: JSON.stringify(payload) }),
  rsvpEvent: (id: string, status: 'going' | 'interested' | null) =>
    request<BackendEvent>(`/events/${id}/rsvp`, { method: 'POST', body: JSON.stringify({ status }) }),
  deleteEvent: (id: string) => request<null>(`/events/${id}`, { method: 'DELETE' }),

  // ---- Products ----
  getProducts: () => request<BackendProduct[]>('/products'),
  getProduct: (id: string) => request<BackendProduct>(`/products/${id}`),
  createProduct: (payload: { title: string; description: string; price: number; images: string[]; category: string; condition: 'new' | 'like-new' | 'used' }) =>
    request<BackendProduct>('/products', { method: 'POST', body: JSON.stringify(payload) }),
  saveProduct: (id: string) => request<BackendProduct>(`/products/${id}/save`, { method: 'POST' }),
  deleteProduct: (id: string) => request<null>(`/products/${id}`, { method: 'DELETE' }),

  // ---- Articles ----
  getArticles: () => request<BackendArticle[]>('/articles'),
  getArticle: (id: string) => request<BackendArticle>(`/articles/${id}`),
  createArticle: (payload: { title: string; excerpt: string; content: string; coverUrl: string; readTime?: number; collection?: string; contentCategory: ContentCategory; contentRating?: ContentRating }) =>
    request<BackendArticle>('/articles', { method: 'POST', body: JSON.stringify(payload) }),
  clapArticle: (id: string, count = 1) => request<BackendArticle>(`/articles/${id}/clap`, { method: 'POST', body: JSON.stringify({ count }) }),

  // ---- Videos ----
  getVideos: () => request<BackendVideo[]>('/videos'),
  getVideo: (id: string) => request<BackendVideo>(`/videos/${id}`),
  createVideo: (payload: { title: string; videoUrl: string; thumbnailUrl: string; type: 'short' | 'standard'; contentCategory: ContentCategory; contentRating?: ContentRating }) =>
    request<BackendVideo>('/videos', { method: 'POST', body: JSON.stringify(payload) }),
  likeVideo: (id: string) => request<BackendVideo>(`/videos/${id}/like`, { method: 'POST' }),

  // ---- Live streams ----
  getStreams: () => request<BackendLiveStream[]>('/streams'),
  getStream: (id: string) => request<BackendLiveStream>(`/streams/${id}`),
  getStreamToken: (id: string) => request<{ token: string; wsUrl: string; roomName: string }>(`/streams/${id}/token`),
  createStream: (payload: { title: string; coverUrl: string; kind: 'video' | 'audio'; startsAt: string; category: ContentCategory; contentRating?: ContentRating }) =>
    request<BackendLiveStream>('/streams', { method: 'POST', body: JSON.stringify(payload) }),
  setStreamStatus: (id: string, status: 'scheduled' | 'live' | 'ended') =>
    request<BackendLiveStream>(`/streams/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

export interface BackendStory {
  id: string;
  authorId: string;
  mediaUrl: string;
  type: string;
  textContent: string | null;
  backgroundGradient: string | null;
  createdAt: string;
  expiresAt: string;
  viewerIds: string[];
  reactions: { userId: string; emoji: string }[];
  isHighlight: boolean;
  highlightTitle: string | null;
  contentCategory?: ContentCategory;
  contentRating?: ContentRating;
  poll?: {
    id: string;
    question: string;
    options: { id: string; text: string; position: number; votes: number }[];
    totalVotes: number;
    votedOptionId?: string;
  };
}

export interface BackendPost {
  id: string;
  authorId: string;
  content: string;
  images: string[];
  createdAt: string;
  likedBy?: string[];
  comments?: { id: string; authorId: string; content: string; createdAt: string }[];
  bookmarkedBy?: string[];
  likesCount?: number;
  commentsCount?: number;
  bookmarksCount?: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  shareCount: number;
  repostCount?: number;
  repostedByMe?: boolean;
  poll?: {
    id: string;
    question: string;
    options: { id: string; text: string; position: number; votes: number }[];
    totalVotes: number;
    votedOptionId?: string;
  };
  contentCategory?: ContentCategory;
  contentRating?: ContentRating;
}

export interface BackendComment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'gif' | 'audio' | null;
  mediaDuration?: number | null;
  author?: { id: string; username: string; fullName: string; avatarUrl: string | null };
}

export interface BackendCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  moderators: string[];
  memberIds: string[];
  memberCount?: number;
  isMember?: boolean;
  createdAt: string;
}

export interface BackendCommunityDiscussion {
  id: string;
  title: string;
  content: string;
  tag: string;
  repliesCount: number;
  likes: number;
  createdAt: string;
  likedByMe?: boolean;
  author: { id: string; username: string; fullName: string; avatarUrl: string | null };
}

export interface BackendEvent {
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
  attendeeCount?: number;
  interestedCount?: number;
}

export interface BackendProduct {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: string;
  createdAt: string;
  savedByMe?: boolean;
}

export interface BackendArticle {
  id: string;
  authorId: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  readTime: number;
  claps: number;
  createdAt: string;
  contentCategory?: ContentCategory;
  collection?: string | null;
  contentRating?: ContentRating;
}

export interface BackendVideo {
  id: string;
  authorId: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  views: number;
  likes: number;
  likedByMe?: boolean;
  createdAt: string;
  type: string;
  contentCategory?: ContentCategory;
  contentRating?: ContentRating;
}

export interface BackendLiveStream {
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

export interface BackendConversation {
  id: string;
  participantA: string;
  participantB: string;
  participantIds: string[];
  isGroup: boolean;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  seenAt: string | null;
  editedAt: string | null;
  deletedAt: string | null;
  replyToId?: string | null;
}

export interface BackendNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedId: string | null;
  createdAt: string;
  readAt: string | null;
  metadata?: { actorId?: string };
}
