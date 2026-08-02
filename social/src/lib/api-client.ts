// Real API client for the backend built in api-server/. Every function here
// hits an endpoint that's actually implemented and verified end-to-end.
// Vite's dev server proxies /api to the backend (see social/vite.config.ts),
// so these are same-origin relative calls in both dev and any deployment
// that serves the built frontend behind the same reverse proxy as the API.

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const TOKEN_STORAGE_KEY = 'yortalks-tokens';

export function getStoredTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: Tokens | null): void {
  if (tokens) {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
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
  const current = getStoredTokens();
  if (!current) return null;
  // Coalesce concurrent refreshes (e.g. several components hitting a 401 at once)
  // into a single request instead of racing multiple refresh calls.
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
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

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const tokens = getStoredTokens();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (tokens) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401 && !isRetry && tokens) {
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

// ---- Auth ----
export interface AuthTokens { accessToken: string; refreshToken: string; expiresAt: string }
export interface BackendUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  avatarUrl: string | null;
  role: string;
  followers: string[];
  following: string[];
  emailVerified: boolean;
  createdAt: string;
  blockedUsers?: string[];
  mutedUsers?: string[];
  privacy?: { profileVisibility: 'public' | 'private' | 'followers'; messageRequests: boolean; allowDmFromStrangers: boolean };
}

export const api = {
  register: (payload: { username: string; email: string; password: string; fullName: string }) =>
    request<{ user: BackendUser; tokens: AuthTokens }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload: { identifier: string; password: string }) =>
    request<{ user: BackendUser; tokens: AuthTokens }>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  logout: () => {
    const tokens = getStoredTokens();
    return request<null>('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: tokens?.refreshToken }) });
  },

  requestPasswordReset: (email: string) =>
    request<{ devResetToken?: string } | null>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),

  confirmPasswordReset: (token: string, newPassword: string) =>
    request<null>('/auth/reset-password/confirm', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

  resendVerificationEmail: () => request<{ devVerificationToken?: string } | null>('/auth/verify-email/resend', { method: 'POST' }),

  // ---- Users ----
  getCurrentUser: () => request<BackendUser>('/users/me'),
  getProfile: (userId: string) => request<BackendUser>(`/users/${userId}`),
  updateProfile: (payload: { fullName?: string; bio?: string; avatarUrl?: string }) =>
    request<BackendUser>('/users/me', { method: 'PUT', body: JSON.stringify(payload) }),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return request<BackendUser>('/users/me/avatar', { method: 'POST', body: form });
  },
  searchUsers: (q: string) => request<BackendUser[]>(`/users/search?q=${encodeURIComponent(q)}`),
  followUser: (userId: string) => request<{ follower: BackendUser; target: BackendUser }>(`/users/${userId}/follow`, { method: 'POST' }),
  unfollowUser: (userId: string) => request<{ follower: BackendUser; target: BackendUser }>(`/users/${userId}/unfollow`, { method: 'POST' }),
  getFollowers: (userId: string) => request<BackendUser[]>(`/users/${userId}/followers`),
  getFollowing: (userId: string) => request<BackendUser[]>(`/users/${userId}/following`),
  updateSettings: (payload: { theme?: 'light' | 'dark'; notificationsEnabled?: boolean; privateAccount?: boolean }) =>
    request<BackendUser>('/users/me/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  updatePrivacy: (payload: { profileVisibility?: 'public' | 'private' | 'followers'; messageRequests?: boolean; allowDmFromStrangers?: boolean }) =>
    request<{ profileVisibility: 'public' | 'private' | 'followers'; messageRequests: boolean; allowDmFromStrangers: boolean }>('/users/me/privacy', { method: 'PUT', body: JSON.stringify(payload) }),
  blockUser: (userId: string) => request<{ blockedUsers: string[] }>(`/users/${userId}/block`, { method: 'POST' }),
  unblockUser: (userId: string) => request<{ blockedUsers: string[] }>(`/users/${userId}/unblock`, { method: 'POST' }),
  muteUser: (userId: string) => request<{ mutedUsers: string[] }>(`/users/${userId}/mute`, { method: 'POST' }),
  unmuteUser: (userId: string) => request<{ mutedUsers: string[] }>(`/users/${userId}/unmute`, { method: 'POST' }),

  // ---- Posts / feed ----
  getFeed: (page = 1, pageSize = 20) => request<BackendPost[]>(`/feed?page=${page}&pageSize=${pageSize}`),
  getTrendingFeed: (page = 1, pageSize = 20) => request<BackendPost[]>(`/feed/trending?page=${page}&pageSize=${pageSize}`),
  getUserFeed: (userId: string, page = 1, pageSize = 20) => request<BackendPost[]>(`/users/${userId}/feed?page=${page}&pageSize=${pageSize}`),
  createPost: (payload: { content: string; images?: string[] }) => request<BackendPost>('/posts', { method: 'POST', body: JSON.stringify(payload) }),
  getPost: (postId: string) => request<BackendPost>(`/posts/${postId}`),
  editPost: (postId: string, content: string) => request<BackendPost>(`/posts/${postId}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  deletePost: (postId: string) => request<null>(`/posts/${postId}`, { method: 'DELETE' }),
  likePost: (postId: string) => request<BackendPost>(`/posts/${postId}/like`, { method: 'POST' }),
  unlikePost: (postId: string) => request<BackendPost>(`/posts/${postId}/unlike`, { method: 'POST' }),
  bookmarkPost: (postId: string) => request<BackendPost>(`/posts/${postId}/bookmark`, { method: 'POST' }),
  sharePost: (postId: string) => request<BackendPost>(`/posts/${postId}/share`, { method: 'POST' }),
  commentOnPost: (postId: string, content: string) => request<BackendPost>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  uploadPostImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return request<{ url: string }>('/posts/upload-image', { method: 'POST', body: form });
  },

  // ---- Communities ----
  getCommunities: () => request<BackendCommunity[]>('/communities'),
  getCommunity: (idOrSlug: string) => request<BackendCommunity>(`/communities/${idOrSlug}`),
  createCommunity: (payload: { name: string; slug: string; description?: string }) =>
    request<BackendCommunity>('/communities', { method: 'POST', body: JSON.stringify(payload) }),
  joinCommunity: (id: string) => request<BackendCommunity>(`/communities/${id}/join`, { method: 'POST' }),
  leaveCommunity: (id: string) => request<BackendCommunity>(`/communities/${id}/leave`, { method: 'POST' }),

  // ---- Stories ----
  getStories: () => request<BackendStory[]>('/stories'),
  createStory: (payload: { mediaUrl: string; type: string; textContent?: string; backgroundGradient?: string; isHighlight?: boolean; highlightTitle?: string }) =>
    request<BackendStory>('/stories', { method: 'POST', body: JSON.stringify(payload) }),
  viewStory: (id: string) => request<BackendStory>(`/stories/${id}/view`, { method: 'POST' }),
  reactToStory: (id: string, emoji: string) => request<BackendStory>(`/stories/${id}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }),

  // ---- Messages ----
  sendMessage: (recipientId: string, content: string) => request<BackendMessage>('/messages', { method: 'POST', body: JSON.stringify({ recipientId, content }) }),
  getConversations: () => request<{ conversation: BackendConversation; lastMessage: BackendMessage | null }[]>('/conversations'),
  getConversationMessages: (conversationId: string) => request<BackendMessage[]>(`/conversations/${conversationId}/messages`),

  // ---- Notifications ----
  getNotifications: () => request<BackendNotification[]>('/notifications'),
  markNotificationRead: (notificationId: string) => request<BackendNotification>(`/notifications/${notificationId}/read`, { method: 'POST' }),

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
  deleteProduct: (id: string) => request<null>(`/products/${id}`, { method: 'DELETE' }),

  // ---- Articles ----
  getArticles: () => request<BackendArticle[]>('/articles'),
  getArticle: (id: string) => request<BackendArticle>(`/articles/${id}`),
  createArticle: (payload: { title: string; excerpt: string; content: string; coverUrl: string; readTime?: number; collection?: string }) =>
    request<BackendArticle>('/articles', { method: 'POST', body: JSON.stringify(payload) }),
  clapArticle: (id: string, count = 1) => request<BackendArticle>(`/articles/${id}/clap`, { method: 'POST', body: JSON.stringify({ count }) }),

  // ---- Videos ----
  getVideos: () => request<BackendVideo[]>('/videos'),
  getVideo: (id: string) => request<BackendVideo>(`/videos/${id}`),
  createVideo: (payload: { title: string; videoUrl: string; thumbnailUrl: string; type: 'short' | 'standard' }) =>
    request<BackendVideo>('/videos', { method: 'POST', body: JSON.stringify(payload) }),
  likeVideo: (id: string) => request<BackendVideo>(`/videos/${id}/like`, { method: 'POST' }),

  // ---- Live streams ----
  // Metadata/scheduling only — no real WebRTC/media pipeline is wired up.
  getStreams: () => request<BackendLiveStream[]>('/streams'),
  getStream: (id: string) => request<BackendLiveStream>(`/streams/${id}`),
  createStream: (payload: { title: string; coverUrl: string; kind: 'video' | 'audio'; startsAt: string; category: string }) =>
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
}

export interface BackendPost {
  id: string;
  authorId: string;
  content: string;
  images: string[];
  createdAt: string;
  likedBy: string[];
  comments: { id: string; authorId: string; content: string; createdAt: string }[];
  bookmarkedBy: string[];
  shareCount: number;
}

export interface BackendCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  ownerId: string;
  moderators: string[];
  memberIds: string[];
  createdAt: string;
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
  collection?: string | null;
}

export interface BackendVideo {
  id: string;
  authorId: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  views: number;
  likes: number;
  createdAt: string;
  type: string;
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
