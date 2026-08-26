

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import {
  api,
  ApiError,
  getStoredTokens,
  setStoredTokens,
  type BackendUser,
  type BackendFollowRequest,
  type BackendProfileComment,
  type BackendShowcase,
  type BackendStory,
  type BackendEvent,
  type BackendPost,
  type BackendCommunity,
  type BackendNotification,
  type BackendConversation,
  type BackendMessage,
  type BackendProduct,
  type BackendArticle,
  type BackendVideo,
  type BackendLiveStream,
  type AuthTokens,
  type TwoFactorChallenge
} from '@/lib/api-client';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { DEFAULT_CONTENT_CATEGORY, type ContentCategory } from '@/lib/content-category';
import { connectSocket, disconnectSocket } from '@/lib/socket-client';
import { DEFAULT_WORLD_PREFERENCES, type WorldPreferences } from '@/lib/world-preferences';

// ── Types ────────────────────────────────────────────────────────────────
export type User = {
  id: string;
  username: string;
  role?: string;
  email?: string;
  emailVerified?: boolean;
  displayName: string;
  avatarUrl: string;
  coverUrl?: string;
  bio?: string;
  verified?: boolean;
  followers: number;
  following: number;
  followingIds?: string[];
  pendingFollowIds?: string[];
  blockedUserIds?: string[];
  mutedUserIds?: string[];
  twoFactorEnabled?: boolean;
  notificationsEnabled?: boolean;
  contentFilter?: ContentRating;
};

export type ProfileComment = {
  id: string;
  authorId: string;
  targetUserId: string;
  content: string;
  createdAt: string;
};

export type Showcase = {
  id: string;
  userId: string;
  type: 'achievement' | 'post' | 'custom';
  title: string;
  contentId?: string;
  customText?: string;
  customImageUrl?: string;
};

export type Post = {
  id: string;
  authorId: string;
  content: string;
  media?: string[];
  likes: number;
  comments: number;
  shares: number;
  reposts: number;
  resonanceScore: number;
  x: number;
  y: number;
  createdAt: string;
  likedByMe?: boolean;
  savedByMe?: boolean;
  repostedByMe?: boolean;
  contentCategory: string;
  contentRating: ContentRating;
  poll?: {
    question: string;
    options: { id: string; text: string; votes: number }[];
    totalVotes: number;
    votedOptionId?: string;
  };
};

export type Story = {
  id: string;
  authorId: string;
  mediaUrl: string;
  type: 'image' | 'video' | 'text' | 'voice';
  textContent?: string;
  backgroundGradient?: string;
  viewed: boolean;
  createdAt: string;
  expiresAt: string;
  viewerIds: string[];
  reactions: { userId: string; emoji: string }[];
  poll?: {
    question: string;
    options: { id: string; text: string; votes: number }[];
    totalVotes: number;
    votedOptionId?: string;
  };
  isHighlight?: boolean;
  highlightTitle?: string;
  contentCategory: string;
  contentRating: ContentRating;
};

type StoryPollInput = {
  question: string;
  options: { text: string }[];
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  read: boolean;
  replyToId?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  reactions?: Record<string, string[]>;
  pinned?: boolean;
};

export type Conversation = {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  updatedAt: string;
};

export type Community = {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  members: number;
  isMember: boolean;
  visibility: 'public' | 'private' | 'invite-only';
  category: string;
  trending?: boolean;
};

export type Article = {
  id: string;
  authorId: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  readTime: number;
  claps: number;
  createdAt: string;
  savedByMe?: boolean;
  collection?: string;
  contentCategory: string;
  contentRating: ContentRating;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  actorId?: string;
  targetId?: string | null;
  read: boolean;
  createdAt: string;
};

export type Video = {
  id: string;
  authorId: string;
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  views: number;
  likes: number;
  createdAt: string;
  type: 'short' | 'standard';
  contentCategory: string;
  contentRating: ContentRating;
};

export type LiveStream = {
  id: string;
  hostId: string;
  title: string;
  coverUrl: string;
  kind: 'video' | 'audio';
  status: 'live' | 'scheduled' | 'ended';
  viewers: number;
  startsAt: string;
  category: string;
  guestIds: string[];
  contentRating: ContentRating;
};

export type EventItem = {
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
  rsvpStatus?: 'going' | 'interested' | null;
};

export type Product = {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: 'new' | 'like-new' | 'used';
  savedByMe?: boolean;
  createdAt: string;
  availability?: 'active' | 'reserved' | 'sold';
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  goal: number;
  xp: number;
};

export type AIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type PrivacySettings = {
  profileVisibility: 'public' | 'followers' | 'private';
  allowDmFromStrangers: boolean;
  messageRequests: boolean;
  twoFactorEnabled: boolean;
};

export type FollowRequest = {
  id: string;
  requesterId: string;
  targetId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  requester: User;
};

// ── Mappers: real API responses → the UI shapes above ──────────────────
function mapUser(u: BackendUser): User {
  return {
    id: u.id,
    username: u.username || 'user',
    role: u.role,
    email: u.email,
    emailVerified: Boolean(u.emailVerified),
    displayName: u.fullName || u.username || 'User',
    avatarUrl: u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`,
    bio: u.bio || '',
    verified: Boolean(u.role === 'admin' || (u as any).verified),
    followers: Array.isArray(u.followers) ? u.followers.length : (u.followerCount ?? 0),
    following: Array.isArray(u.following) ? u.following.length : (u.followingCount ?? 0),
    followingIds: Array.isArray(u.following) ? u.following : [],
    pendingFollowIds: [],
    blockedUserIds: Array.isArray(u.blockedUsers) ? u.blockedUsers : [],
    mutedUserIds: Array.isArray(u.mutedUsers) ? u.mutedUsers : [],
    twoFactorEnabled: Boolean(u.twoFactorEnabled),
    notificationsEnabled: u.settings?.notificationsEnabled !== false,
    contentFilter: u.settings?.contentFilter ?? DEFAULT_CONTENT_RATING,
  };
}

function mapStory(s: BackendStory, currentUserId?: string): Story {
  const viewerIds = Array.isArray(s.viewerIds) ? s.viewerIds : [];
  return {
    id: s.id,
    authorId: s.authorId,
    mediaUrl: s.mediaUrl,
    type: (s.type as Story['type']) || 'image',
    textContent: s.textContent ?? undefined,
    backgroundGradient: s.backgroundGradient ?? undefined,
    viewed: currentUserId ? viewerIds.includes(currentUserId) : false,
    createdAt: s.createdAt || new Date().toISOString(),
    expiresAt: s.expiresAt || new Date(Date.now() + 86400000).toISOString(),
    viewerIds,
    reactions: Array.isArray(s.reactions) ? s.reactions : [],
    poll: s.poll ? {
      question: s.poll.question,
      options: s.poll.options.map((option) => ({ id: option.id, text: option.text, votes: option.votes })),
      totalVotes: s.poll.totalVotes,
      votedOptionId: s.poll.votedOptionId,
    } : undefined,
    isHighlight: Boolean(s.isHighlight),
    highlightTitle: s.highlightTitle ?? undefined,
    contentCategory: s.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
    contentRating: s.contentRating ?? DEFAULT_CONTENT_RATING,
  };
}

function getSpatialData(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  const rand = () => {
    h = Math.imul(741103597, h);
    return ((h >>> 0) / 4294967296);
  };
  return {
    x: (rand() * 4000) - 2000,
    y: (rand() * 2000) - 1000,
    resonanceScore: 0.1 + (rand() * 0.9)
  };
}

function mapPost(p: BackendPost, currentUserId?: string): Post {
  const spatial = getSpatialData(p.id);
  const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
  const bookmarkedBy = Array.isArray(p.bookmarkedBy) ? p.bookmarkedBy : [];
  const comments = Array.isArray(p.comments) ? p.comments : [];

  return {
    id: p.id,
    authorId: p.authorId,
    content: p.content || '',
    media: p.images && p.images.length ? p.images : undefined,
    likes: (p as any).likesCount ?? (Array.isArray((p as any).likes) ? (p as any).likes.length : ((p as any).likes || 0)),
    comments: (p as any).commentsCount ?? (Array.isArray((p as any).comments) ? (p as any).comments.length : ((p as any).comments || 0)),
    shares: (p as any).shareCount ?? (p as any).shares ?? 0,
    reposts: p.repostCount ?? 0,
    resonanceScore: spatial.resonanceScore,
    x: spatial.x,
    y: spatial.y,
    createdAt: p.createdAt || new Date().toISOString(),
    likedByMe: !!(p as any).likedByMe,
    savedByMe: !!(p as any).savedByMe,
    repostedByMe: !!p.repostedByMe,
    contentCategory: p.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
    contentRating: p.contentRating ?? DEFAULT_CONTENT_RATING,
    poll: p.poll ? {
      question: p.poll.question,
      options: p.poll.options.map((option) => ({ id: option.id, text: option.text, votes: option.votes })),
      totalVotes: p.poll.totalVotes,
      votedOptionId: p.poll.votedOptionId,
    } : undefined,
  };
}

export function mapBackendPost(p: BackendPost, currentUserId?: string): Post {
  return mapPost(p, currentUserId);
}

function mapCommunity(c: BackendCommunity, currentUserId?: string): Community {
  const memberIds = Array.isArray(c.memberIds) ? c.memberIds : [];
  return {
    id: c.id,
    name: c.name || 'Community',
    description: c.description || '',
    coverUrl: `https://picsum.photos/seed/${c.id}/600/300`,
    members: c.memberCount ?? memberIds.length,
    isMember: c.isMember ?? Boolean(currentUserId && memberIds.includes(currentUserId)),
    visibility: 'public',
    category: 'General',
  };
}

function mapMessage(m: BackendMessage): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content || '',
    createdAt: m.createdAt || new Date().toISOString(),
    read: Boolean(m.seenAt !== null && m.seenAt !== undefined),
    replyToId: m.replyToId ?? null,
    editedAt: m.editedAt ?? null,
    deletedAt: m.deletedAt ?? null,
    reactions: m.reactions ?? {},
    pinned: Boolean(m.pinned),
  };
}

function mapConversation(c: BackendConversation, lastMessage: BackendMessage | null): Conversation {
  return {
    id: c.id,
    participantIds: Array.isArray(c.participantIds) ? c.participantIds : [c.participantA, c.participantB].filter(Boolean),
    lastMessage: lastMessage ? mapMessage(lastMessage) : undefined,
    updatedAt: c.updatedAt || new Date().toISOString(),
  };
}

function mapProduct(p: BackendProduct): Product {
  return {
    id: p.id,
    sellerId: p.sellerId,
    title: p.title || 'Product',
    description: p.description || '',
    price: p.price ?? 0,
    images: Array.isArray(p.images) ? p.images : [],
    category: p.category || 'General',
    condition: (p.condition as Product['condition']) || 'new',
    savedByMe: Boolean(p.savedByMe),
    createdAt: p.createdAt || new Date().toISOString(),
    availability: p.availability ?? 'active',
  };
}

function mapArticle(a: BackendArticle): Article {
  const readTimeNum = typeof a.readTime === 'number' ? a.readTime : (parseInt(String(a.readTime), 10) || 3);
  return {
    id: a.id,
    authorId: a.authorId,
    title: a.title || 'Untitled Article',
    excerpt: a.excerpt || '',
    content: a.content || '',
    coverUrl: a.coverUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop',
    readTime: readTimeNum,
    claps: a.claps ?? 0,
    createdAt: a.createdAt || new Date().toISOString(),
    collection: a.collection ?? undefined,
    contentCategory: a.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
    contentRating: a.contentRating ?? DEFAULT_CONTENT_RATING,
  };
}

function mapVideo(v: BackendVideo): Video {
  return {
    id: v.id,
    authorId: v.authorId,
    videoUrl: v.videoUrl || '',
    thumbnailUrl: v.thumbnailUrl || '',
    title: v.title || 'Untitled Video',
    views: v.views ?? 0,
    likes: Array.isArray((v as any).likedBy) ? (v as any).likedBy.length : (v.likes ?? 0),
    createdAt: v.createdAt || new Date().toISOString(),
    type: (v.type as Video['type']) || 'standard',
    contentCategory: v.contentCategory ?? DEFAULT_CONTENT_CATEGORY,
    contentRating: v.contentRating ?? DEFAULT_CONTENT_RATING,
  };
}

function mapLiveStream(s: BackendLiveStream): LiveStream {
  return {
    id: s.id,
    hostId: s.hostId,
    title: s.title || 'Live Stream',
    coverUrl: s.coverUrl || '',
    kind: ((s.kind as any) === 'audio' ? 'audio' : 'video') as LiveStream['kind'],
    status: (s.status as LiveStream['status']) || 'live',
    viewers: s.viewers ?? 0,
    startsAt: s.startsAt || new Date().toISOString(),
    category: s.category || 'General',
    guestIds: Array.isArray(s.guestIds) ? s.guestIds : [],
    contentRating: s.contentRating ?? DEFAULT_CONTENT_RATING,
  };
}

function mapEvent(e: BackendEvent, currentUserId?: string): EventItem {
  const attendeeIds = Array.isArray(e.attendeeIds) ? e.attendeeIds : [];
  const interestedIds = Array.isArray(e.interestedIds) ? e.interestedIds : [];

  return {
    id: e.id,
    hostId: e.hostId,
    title: e.title || 'Event',
    description: e.description || '',
    coverUrl: e.coverUrl,
    category: e.category || 'General',
    startsAt: e.startsAt || new Date().toISOString(),
    location: e.location || 'Online',
    isOnline: Boolean(e.isOnline),
    attendeeIds: attendeeIds.length > 0 ? attendeeIds : Array.from({ length: e.attendeeCount ?? 0 }, () => ''),
    interestedIds: interestedIds.length > 0 ? interestedIds : Array.from({ length: e.interestedCount ?? 0 }, () => ''),
    rsvpStatus: currentUserId && attendeeIds.includes(currentUserId) ? 'going' : currentUserId && interestedIds.includes(currentUserId) ? 'interested' : null,
  };
}

function mapNotification(n: BackendNotification): Notification {
  return {
    id: n.id,
    type: n.type,
    title: n.title || 'Notification',
    message: n.message || '',
    actorId: n.metadata?.actorId,
    targetId: n.relatedId,
    read: Boolean(n.readAt !== null && n.readAt !== undefined),
    createdAt: n.createdAt || new Date().toISOString(),
  };
}

function mapFollowRequest(request: BackendFollowRequest): FollowRequest {
  return {
    id: request.id,
    requesterId: request.requesterId,
    targetId: request.targetId,
    status: request.status,
    createdAt: request.createdAt,
    requester: mapUser(request.requester),
  };
}

function mapProfileComment(comment: BackendProfileComment): ProfileComment {
  return {
    id: comment.id,
    authorId: comment.author.id,
    targetUserId: comment.targetUserId,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

function mapShowcase(showcase: BackendShowcase): Showcase {
  return {
    id: showcase.id,
    userId: showcase.userId,
    type: showcase.type,
    title: showcase.title,
    contentId: showcase.contentId ?? undefined,
    customText: showcase.customText ?? undefined,
    customImageUrl: showcase.customImageUrl ?? undefined,
  };
}





interface AppState {
  currentUser: User | null;
  worldPreferences: WorldPreferences;
  tokens: AuthTokens | null;
  isInitializing: boolean;
  feedCursor: string | null;
  hasMoreFeed: boolean;
  authError: string | null;
  users: Record<string, User>;
  posts: Post[];
  stories: Story[];
  communities: Community[];
  liveStreams: LiveStream[];
  events: EventItem[];
  products: Product[];
  articles: Article[];
  videos: Video[];
  achievements: Achievement[];
  notifications: Notification[];
  followRequests: FollowRequest[];
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  aiMessages: AIMessage[];
  privacy: PrivacySettings;
  profileComments: Record<string, ProfileComment[]>;
  showcases: Record<string, Showcase[]>;

  login: (identifier: string, password: string, totpCode?: string, challengeId?: string) => Promise<TwoFactorChallenge | null>;
  loginWithGoogle: (credential: string, totpCode?: string, challengeId?: string) => Promise<TwoFactorChallenge | null>;
  loginWithEmailOtp: (email: string, code: string, totpCode?: string, challengeId?: string) => Promise<TwoFactorChallenge | null>;
  completeTwoFactorLogin: (challengeId: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  initialize: () => Promise<void>;
  loadWorldPreferences: () => Promise<void>;

  loadStories: () => Promise<void>;
  loadFeed: () => Promise<void>;
  loadMoreFeed: () => Promise<void>;
  loadSavedPosts: () => Promise<void>;
  loadUserFeed: (userId: string) => Promise<void>;
  loadPost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  addPost: (content: string, media?: string[], poll?: Post['poll'], contentRating?: ContentRating, contentCategory?: ContentCategory) => Promise<void>;
  updateProfile?: (updates: { displayName?: string; bio?: string; avatarUrl?: string }) => void;
  toggleSavePost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;

  loadCommunities: () => Promise<void>;
  createCommunity: (name: string, slug: string, description: string) => Promise<void>;
  toggleCommunityMembership: (communityId: string) => Promise<void>;

  loadNotifications: () => Promise<void>;
  loadFollowRequests: () => Promise<void>;
  acceptFollowRequest: (requestId: string) => Promise<void>;
  rejectFollowRequest: (requestId: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  addProfileComment: (targetUserId: string, content: string) => Promise<void>;
  deleteProfileComment: (commentId: string, targetUserId: string) => Promise<void>;
  addShowcase: (showcase: Omit<Showcase, 'id'>) => Promise<void>;
  removeShowcase: (showcaseId: string, userId: string) => Promise<void>;
  loadProfileInteractions: (userId: string) => Promise<void>;

  loadConversations: () => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  sendDirectMessage: (recipientId: string, content: string, replyToId?: string) => Promise<void>;
  editDirectMessage: (messageId: string, content: string) => Promise<void>;
  deleteDirectMessage: (messageId: string) => Promise<void>;
  reactToDirectMessage: (messageId: string, reaction: string) => Promise<void>;
  pinDirectMessage: (messageId: string) => Promise<void>;

  loadUserProfile: (userId: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;

  votePoll: (postId: string, optionId: string) => Promise<void>;
  loadEvents: () => Promise<void>;
  createEvent: (input: { title: string; description: string; coverUrl: string; category: string; startsAt: string; location: string; isOnline: boolean }) => Promise<void>;
  toggleEventRsvp: (eventId: string, status: 'going' | 'interested') => Promise<void>;

  loadProducts: () => Promise<void>;
  createProduct: (input: { title: string; description: string; price: number; images: string[]; category: string; condition: 'new' | 'like-new' | 'used' }) => Promise<void>;

  loadArticles: () => Promise<void>;
  createArticle: (input: { title: string; excerpt: string; content: string; coverUrl: string; readTime?: number; collection?: string; contentCategory: ContentCategory; contentRating?: ContentRating }) => Promise<void>;
  clapArticle: (articleId: string) => Promise<void>;

  loadVideos: () => Promise<void>;
  createVideo: (input: { title: string; videoUrl: string; thumbnailUrl: string; type: 'short' | 'standard'; contentCategory: ContentCategory; contentRating?: ContentRating }) => Promise<void>;
  likeVideo: (videoId: string) => Promise<void>;

  addStory: (story: Pick<Story, 'type' | 'mediaUrl' | 'textContent' | 'backgroundGradient'> & { isHighlight?: boolean; highlightTitle?: string; poll?: StoryPollInput; contentCategory: ContentCategory; contentRating?: ContentRating }) => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;
  reactToStory: (storyId: string, emoji: string) => Promise<void>;
  voteStoryPoll: (storyId: string, optionId: string) => Promise<void>;

  loadStreams: () => Promise<void>;
  createStream: (input: { title: string; coverUrl: string; kind: 'video' | 'audio'; startsAt: string; category: ContentCategory; contentRating?: ContentRating }) => Promise<void>;
  setStreamStatus: (streamId: string, status: 'scheduled' | 'live' | 'ended') => Promise<void>;
  updateContentFilter: (contentFilter: ContentRating) => Promise<void>;
  toggleSaveProduct: (productId: string) => Promise<void>;
  sendAIMessage: (content: string) => Promise<void>;
  updatePrivacy: (patch: Partial<PrivacySettings>) => Promise<void>;
  toggleBlockUser: (userId: string) => Promise<void>;
  toggleMuteUser: (userId: string) => Promise<void>;
  setTwoFactorEnabled: (enabled: boolean) => void;
  updateWorldPreferences: (patch: Partial<WorldPreferences>) => void;
  switchAccount: (userId: string) => void;
}

function hydrateSessionData(get: () => AppState): void {
  // These datasets power independent surfaces. Loading them in the background
  // lets the authenticated shell render as soon as identity is restored; one
  // slow optional service must never hold every route behind a skeleton.
  void Promise.allSettled([
    get().loadFeed(),
    get().loadCommunities(),
    get().loadNotifications(),
    get().loadFollowRequests(),
    get().loadConversations(),
    get().loadStories(),
    get().loadWorldPreferences(),
  ]);
}

let realtimePollingTimer: number | null = null;

function stopRealtime(): void {
  disconnectSocket();
  if (realtimePollingTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(realtimePollingTimer);
    realtimePollingTimer = null;
  }
}

function setupRealtime(
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState,
) {
  if (typeof window !== 'undefined' && realtimePollingTimer === null) {
    realtimePollingTimer = window.setInterval(() => {
      if (!get().currentUser) return;
      void get().loadNotifications();
      void get().loadConversations();
    }, 15_000);
  }
  const socket = connectSocket();
  if (!socket) return;
  socket.off('message:receive');
  socket.off('message:update');
  socket.off('notification:new');
  socket.on('message:receive', (raw: BackendMessage) => {
    const mapped = mapMessage(raw);
    set((state) => {
      const existing = state.messagesByConversation[mapped.conversationId] ?? [];
      const conversations = state.conversations.some((c) => c.id === mapped.conversationId)
        ? state.conversations.map((c) => (c.id === mapped.conversationId ? { ...c, lastMessage: mapped, updatedAt: mapped.createdAt } : c))
        : state.conversations;
      return {
        messagesByConversation: { ...state.messagesByConversation, [mapped.conversationId]: [...existing, mapped] },
        conversations,
      };
    });
    if (!get().conversations.some((c) => c.id === mapped.conversationId)) {
      get().loadConversations();
    }
  });
  socket.on('message:update', (raw: BackendMessage) => {
    const mapped = mapMessage(raw);
    set((state) => {
      const existing = state.messagesByConversation[mapped.conversationId] ?? [];
      const messages = mapped.deletedAt
        ? existing.filter((message) => message.id !== mapped.id)
        : existing.some((message) => message.id === mapped.id)
          ? existing.map((message) => message.id === mapped.id ? mapped : message)
          : [...existing, mapped];
      const lastMessage = messages[messages.length - 1];
      return {
        messagesByConversation: { ...state.messagesByConversation, [mapped.conversationId]: messages },
        conversations: state.conversations.map((conversation) => conversation.id === mapped.conversationId
          ? { ...conversation, lastMessage, updatedAt: lastMessage?.createdAt ?? conversation.updatedAt }
          : conversation),
      };
    });
  });
  socket.on('notification:new', (raw: BackendNotification) => {
    const mapped = mapNotification(raw);
    set((state) => (state.notifications.some((n) => n.id === mapped.id) ? state : { notifications: [mapped, ...state.notifications] }));
  });
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      worldPreferences: DEFAULT_WORLD_PREFERENCES,
      tokens: null,
      isInitializing: false,
      authError: null,
      feedCursor: null,
      hasMoreFeed: false,
      users: {},
      posts: [],
      stories: [],
      communities: [],
      liveStreams: [],
      events: [],
      products: [],
      articles: [],
      videos: [],
      achievements: [],
      notifications: [],
      followRequests: [],
      conversations: [],
      messagesByConversation: {},
      aiMessages: [],
      privacy: {
        profileVisibility: 'public',
        allowDmFromStrangers: true,
        messageRequests: true,
        twoFactorEnabled: false,
      },
      profileComments: {},
      showcases: {},

      login: async (identifier, password, totpCode, challengeId) => {
        set({ authError: null });
        try {
          const result = await api.login({ identifier, password, ...(totpCode ? { totpCode } : {}), ...(challengeId ? { challengeId } : {}) });
          if ('requiresTwoFactor' in result) return result;
          setStoredTokens(result.tokens);
          const mapped = mapUser(result.user);
          set((state) => ({ currentUser: mapped, tokens: result.tokens, users: { ...state.users, [mapped.id]: mapped } }));
          setupRealtime(set, get);
          hydrateSessionData(get);
          return null;
        } catch (err) {
          set({ authError: err instanceof ApiError ? err.message : 'Login failed' });
          throw err;
        }
      },

      loginWithGoogle: async (credential, totpCode, challengeId) => {
        set({ authError: null });
        try {
          const result = await api.loginWithGoogle({ credential, ...(totpCode ? { totpCode } : {}), ...(challengeId ? { challengeId } : {}) });
          if ('requiresTwoFactor' in result) return result;
          setStoredTokens(result.tokens);
          const mapped = mapUser(result.user);
          set((state) => ({ currentUser: mapped, tokens: result.tokens, users: { ...state.users, [mapped.id]: mapped } }));
          setupRealtime(set, get);
          hydrateSessionData(get);
          return null;
        } catch (err) {
          set({ authError: err instanceof ApiError ? err.message : 'Google sign-in failed' });
          throw err;
        }
      },

      loginWithEmailOtp: async (email, code, totpCode, challengeId) => {
        set({ authError: null });
        try {
          const result = await api.loginWithEmailOtp({ email, code, ...(totpCode ? { totpCode } : {}), ...(challengeId ? { challengeId } : {}) });
          if ('requiresTwoFactor' in result) return result;
          setStoredTokens(result.tokens);
          const mapped = mapUser(result.user);
          set((state) => ({ currentUser: mapped, tokens: result.tokens, users: { ...state.users, [mapped.id]: mapped } }));
          setupRealtime(set, get);
          hydrateSessionData(get);
          return null;
        } catch (err) {
          set({ authError: err instanceof ApiError ? err.message : 'Email sign-in failed' });
          throw err;
        }
      },

      completeTwoFactorLogin: async (challengeId) => {
        set({ authError: null });
        try {
          const result = await api.completeTwoFactorLogin(challengeId);
          setStoredTokens(result.tokens);
          const mapped = mapUser(result.user);
          set((state) => ({ currentUser: mapped, tokens: result.tokens, users: { ...state.users, [mapped.id]: mapped } }));
          setupRealtime(set, get);
          hydrateSessionData(get);
        } catch (err) {
          set({ authError: err instanceof ApiError ? err.message : 'Could not complete sign-in' });
          throw err;
        }
      },

      register: async (username, email, password, fullName) => {
        set({ authError: null });
        try {
          await api.register({ username, email, password, fullName });
          // Registration is intentionally not an authenticated session. The
          // account must prove ownership of its email address first.
          setStoredTokens(null);
          set({ currentUser: null, tokens: null });
        } catch (err) {
          set({ authError: err instanceof ApiError ? err.message : 'Registration failed' });
          throw err;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {
          // ignore
        }
        stopRealtime();
        setStoredTokens(null);
        set({ currentUser: null, tokens: null });
      },

      switchAccount: () => {
        toast.error('Account switching is disabled. Sign out and authenticate as the other account instead.');
      },

      requestPasswordReset: async (email) => {
        await api.requestPasswordReset(email);
      },

      initialize: async () => {
        stopRealtime();
        set({ isInitializing: true });
        // The access token is intentionally memory-only. Never trust a
        // persisted profile as an authenticated session after a reload.
        set({ currentUser: null, tokens: null });

        // Restore a live session from the short-lived access token, or rotate
        // the HttpOnly refresh cookie after a normal browser reload.
        let tokens = getStoredTokens();
        if (!tokens) {
          tokens = await api.refreshSession();
        }
        if (tokens) {
          try {
            const meResponse = await api.getCurrentUser();
            if (meResponse) {
              const mapped = mapUser(meResponse);
              set((state) => ({
                currentUser: mapped,
                tokens,
                users: { ...state.users, [mapped.id]: mapped },
              }));
              setupRealtime(set, get);
            }
          } catch {
            // Token expired or invalid — remain signed out.
            setStoredTokens(null);
          }
        }

        // If still no user after token check, remain signed out.
        const currentUser = get().currentUser;
        set((state) => ({
          currentUser,
          users: { ...state.users },
        }));

        // Do not block the signed-out entry point on protected social data.
        // Auth should be usable even when the feed or a secondary service is
        // slow, unavailable, or still warming up in the beta environment.
        if (!currentUser) {
          set({ isInitializing: false });
          return;
        }

        setupRealtime(set, get);
        set({ isInitializing: false });
        hydrateSessionData(get);
      },

      loadWorldPreferences: async () => {
        try {
          const items = await api.getCreatorWorkspace();
          const item = items.find((entry) => entry.kind === 'preference' && entry.itemKey === 'world');
          if (!item) return;
          const payload = item.payload as Partial<WorldPreferences>;
          set((state) => ({ worldPreferences: { ...state.worldPreferences, ...payload } }));
        } catch {
          // Local persisted preferences remain the source of truth when offline.
        }
      },

      loadFeed: async () => {
        try {
          const res = await api.getFeed();
          const backendPosts = res.data;
          const currentUserId = get().currentUser?.id;
          set({ posts: backendPosts.map((p) => mapPost(p, currentUserId)), feedCursor: res.nextCursor ?? null, hasMoreFeed: Boolean(res.hasMore) });
          return;
        } catch {
          // Keep the last successful snapshot during a transient outage.
        }
      },

      loadMoreFeed: async () => {
        const state = get();
        if (!state.hasMoreFeed || !state.feedCursor) return;
        try {
          const res = await api.getFeed(state.feedCursor);
          const currentUserId = get().currentUser?.id;
          const nextPosts = res.data.map((post) => mapPost(post, currentUserId));
          const seenIds = new Set(get().posts.map((post) => post.id));
          set((current) => ({
            posts: [...current.posts, ...nextPosts.filter((post) => !seenIds.has(post.id))],
            feedCursor: res.nextCursor ?? null,
            hasMoreFeed: Boolean(res.hasMore),
          }));
        } catch {
          // Preserve the visible feed when a subsequent page is temporarily unavailable.
        }
      },

      loadSavedPosts: async () => {
        try {
          const result = await api.getSavedPosts();
          const currentUserId = get().currentUser?.id;
          const savedPosts = result.data.map((post) => mapPost(post, currentUserId));
          const savedIds = new Set(savedPosts.map((post) => post.id));
          set((state) => ({ posts: [...savedPosts, ...state.posts.filter((post) => !savedIds.has(post.id))] }));
        } catch {
          // Keep the existing feed snapshot if saved posts are temporarily unavailable.
        }
      },

      loadUserFeed: async (userId) => {
        try {
          const backendPosts = await api.getUserFeed(userId, 1, 100);
          const currentUserId = get().currentUser?.id;
          const profilePosts = backendPosts.map((post) => mapPost(post, currentUserId));
          set((state) => ({
            posts: [
              ...state.posts.filter((post) => post.authorId !== userId),
              ...profilePosts,
            ],
          }));
        } catch {
          // The profile can still render its identity if its feed is unavailable.
        }
      },

      loadPost: async (postId) => {
        if (get().posts.some((p) => p.id === postId)) return;
        try {
          const post = await api.getPost(postId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ posts: [...state.posts, mapPost(post, currentUserId)] }));
        } catch {}
      },

      likePost: async (postId) => {
        const post = get().posts.find((p) => p.id === postId);
        if (!post) return;
        set((state) => ({
          posts: state.posts.map((p) => (p.id === postId ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 } : p)),
        }));
        try {
          const updated = post.likedByMe ? await api.unlikePost(postId) : await api.likePost(postId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ posts: state.posts.map((p) => (p.id === postId ? mapPost(updated, currentUserId) : p)) }));
        } catch (error) {
          set((state) => ({
            posts: state.posts.map((p) => (p.id === postId ? { ...p, likedByMe: post.likedByMe, likes: post.likes } : p)),
          }));
          toast.error(error instanceof Error ? error.message : 'Could not update the like');
        }
      },

      updateProfile: (updates) => {
        set((state) => ({
          currentUser: state.currentUser ? { ...state.currentUser, ...updates } : state.currentUser,
          users: state.currentUser ? {
            ...state.users,
            [state.currentUser.id]: { ...state.users[state.currentUser.id], ...updates }
          } : state.users
        }));
      },
      addPost: async (content, media, poll, contentRating = DEFAULT_CONTENT_RATING, contentCategory = DEFAULT_CONTENT_CATEGORY) => {
        const currentUserId = get().currentUser?.id;
        if (!currentUserId) {
          toast.error('Verify your email before posting');
          return;
        }
        try {
          const created = await api.createPost({ content, images: media, contentCategory, contentRating, ...(poll ? { poll: { question: poll.question, options: poll.options.map(({ text }) => ({ text })) } } : {}) });
          set((state) => ({ posts: [mapPost(created, currentUserId), ...state.posts] }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not publish the post');
          throw error;
        }
      },

      toggleSavePost: async (postId) => {
        const post = get().posts.find((p) => p.id === postId);
        if (!post) return;
        try {
          const updated = await api.bookmarkPost(postId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ posts: state.posts.map((p) => (p.id === postId ? mapPost(updated, currentUserId) : p)) }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not update saved posts');
        }
      },

      sharePost: async (postId) => {
        try {
          const updated = await api.sharePost(postId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ posts: state.posts.map((p) => (p.id === postId ? mapPost(updated, currentUserId) : p)) }));
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
          }
          toast.success('Post link copied to clipboard!');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not share this post');
        }
      },

      toggleRepost: async (postId) => {
        const post = get().posts.find((item) => item.id === postId);
        if (!post) return;
        try {
          const updated = post.repostedByMe ? await api.unrepostPost(postId) : await api.repostPost(postId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ posts: state.posts.map((item) => item.id === postId ? mapPost(updated, currentUserId) : item) }));
          toast.success(post.repostedByMe ? 'Repost removed' : 'Post reposted to your profile');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not update repost');
        }
      },

      loadCommunities: async () => {
        try {
          const backendCommunities = await api.getCommunities();
          const currentUserId = get().currentUser?.id;
          set({ communities: backendCommunities.map((c) => mapCommunity(c, currentUserId)) });
          return;
        } catch {
          // Keep the last successful snapshot during a transient outage.
        }
      },

      createCommunity: async (name, slug, description) => {
        const currentUserId = get().currentUser?.id || 'user-roy';
        try {
          const created = await api.createCommunity({ name, slug, description });
          set((state) => ({ communities: [mapCommunity(created, currentUserId), ...state.communities] }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not create the community');
          throw error;
        }
      },

      toggleCommunityMembership: async (communityId) => {
        const community = get().communities.find((c) => c.id === communityId);
        if (!community) return;
        try {
          const updated = community.isMember
            ? await api.leaveCommunity(communityId)
            : await api.joinCommunity(communityId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ communities: state.communities.map((c) => (c.id === communityId ? mapCommunity(updated, currentUserId) : c)) }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not update community membership');
        }
      },

      loadNotifications: async () => {
        try {
          const backendNotifications = await api.getNotifications();
          set({ notifications: backendNotifications.map(mapNotification) });
          return;
        } catch {
          // Keep the last successful notification snapshot during a transient outage.
        }
      },

      markNotificationRead: async (id) => {
        try {
          await api.markNotificationRead(id);
          set((state) => ({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not mark notification as read');
        }
      },

      markAllNotificationsRead: async () => {
        try {
          await api.markAllNotificationsRead();
          set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not mark notifications as read');
        }
      },

      loadConversations: async () => {
        try {
          const results = await api.getConversations();
          set({
            conversations: results.map((r) => mapConversation(r.conversation, r.lastMessage)),
            ...(results.length === 0 ? { messagesByConversation: {} } : {}),
          });
          return;
        } catch {
          // Keep the last successful snapshot during a transient outage.
        }
      },

      loadConversationMessages: async (conversationId) => {
        try {
          const messages = await api.getConversationMessages(conversationId);
          set((state) => ({ messagesByConversation: { ...state.messagesByConversation, [conversationId]: messages.map(mapMessage) } }));
          return;
        } catch {
          // Keep the last successful snapshot during a transient outage.
        }
      },

      sendDirectMessage: async (recipientId, content, replyToId) => {
        try {
          const created = await api.sendMessage(recipientId, content, replyToId);
          const newMsg = mapMessage(created);
          set((state) => {
            const existing = state.messagesByConversation[newMsg.conversationId] ?? [];
            const existingConversation = state.conversations.some((conversation) => conversation.id === newMsg.conversationId);
            const conversations = existingConversation
              ? state.conversations.map((conversation) => conversation.id === newMsg.conversationId ? { ...conversation, lastMessage: newMsg, updatedAt: newMsg.createdAt } : conversation)
              : [{ id: newMsg.conversationId, participantIds: [get().currentUser?.id ?? '', recipientId], lastMessage: newMsg, updatedAt: newMsg.createdAt }, ...state.conversations];
            return { messagesByConversation: { ...state.messagesByConversation, [newMsg.conversationId]: [...existing, newMsg] }, conversations };
          });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not send the message');
          throw error;
        }
      },

      editDirectMessage: async (messageId, content) => {
        const updated = mapMessage(await api.editMessage(messageId, content));
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [updated.conversationId]: (state.messagesByConversation[updated.conversationId] ?? []).map((message) => message.id === messageId ? updated : message),
          },
          conversations: state.conversations.map((conversation) => conversation.id === updated.conversationId && conversation.lastMessage?.id === messageId
            ? { ...conversation, lastMessage: updated }
            : conversation),
        }));
      },

      deleteDirectMessage: async (messageId) => {
        const deleted = mapMessage(await api.deleteMessage(messageId));
        set((state) => {
          const messages = (state.messagesByConversation[deleted.conversationId] ?? []).filter((message) => message.id !== messageId);
          const lastMessage = messages[messages.length - 1];
          return {
            messagesByConversation: { ...state.messagesByConversation, [deleted.conversationId]: messages },
            conversations: state.conversations.map((conversation) => conversation.id === deleted.conversationId
              ? { ...conversation, lastMessage, updatedAt: lastMessage?.createdAt ?? conversation.updatedAt }
              : conversation),
          };
        });
      },

      reactToDirectMessage: async (messageId, reaction) => {
        const updated = mapMessage(await api.reactToMessage(messageId, reaction));
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [updated.conversationId]: (state.messagesByConversation[updated.conversationId] ?? []).map((message) => message.id === messageId ? updated : message),
          },
        }));
      },

      pinDirectMessage: async (messageId) => {
        const updated = mapMessage(await api.pinMessage(messageId));
        set((state) => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [updated.conversationId]: (state.messagesByConversation[updated.conversationId] ?? []).map((message) => message.id === messageId ? updated : message),
          },
        }));
      },

      loadUserProfile: async (userId) => {
        if (get().users[userId]) return;
        try {
          const user = await api.getProfile(userId);
          const mapped = mapUser(user);
          set((state) => ({ users: { ...state.users, [mapped.id]: mapped } }));
        } catch {}
      },

      followUser: async (userId) => {
        const user = get().users[userId];
        if (!user) return;
        try {
          const result = await api.followUser(userId);
          const follower = mapUser(result.follower);
          const target = mapUser(result.target);
          if (result.status === 'pending') {
            set((state) => ({
              users: { ...state.users, [target.id]: target, [follower.id]: follower },
              currentUser: state.currentUser?.id === follower.id
                ? { ...follower, pendingFollowIds: [...new Set([...(state.currentUser.pendingFollowIds || []), userId])] }
                : state.currentUser,
            }));
            toast.info('Follow request sent');
            return;
          }
          set((state) => ({
            users: { ...state.users, [target.id]: target, [follower.id]: follower },
            currentUser: state.currentUser?.id === follower.id ? {
              ...follower,
              followingIds: [...new Set([...(state.currentUser.followingIds || []), userId])],
              pendingFollowIds: (state.currentUser.pendingFollowIds || []).filter((id) => id !== userId),
            } : state.currentUser,
          }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not follow this student');
        }
      },

      unfollowUser: async (userId) => {
        const user = get().users[userId];
        if (!user) return;
        try {
          const result = await api.unfollowUser(userId);
          const follower = mapUser(result.follower);
          const target = mapUser(result.target);
          set((state) => ({
            users: { ...state.users, [target.id]: target, [follower.id]: follower },
            currentUser: state.currentUser?.id === follower.id ? {
              ...follower,
              followingIds: (state.currentUser.followingIds || []).filter((id) => id !== userId),
              pendingFollowIds: (state.currentUser.pendingFollowIds || []).filter((id) => id !== userId),
            } : state.currentUser,
          }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not unfollow this student');
        }
      },

      loadFollowRequests: async () => {
        try {
          const requests = await api.getFollowRequests();
          set({ followRequests: requests.map(mapFollowRequest) });
        } catch {
          // Keep the last successful snapshot during a transient outage.
        }
      },

      acceptFollowRequest: async (requestId) => {
        try {
          const result = await api.acceptFollowRequest(requestId);
          const follower = mapUser(result.follower);
          const target = mapUser(result.target);
          set((state) => ({
            followRequests: state.followRequests.filter((request) => request.id !== requestId),
            users: { ...state.users, [follower.id]: follower, [target.id]: target },
            currentUser: state.currentUser?.id === target.id ? target : state.currentUser,
          }));
          toast.success('Follow request accepted');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not accept follow request');
        }
      },

      rejectFollowRequest: async (requestId) => {
        try {
          await api.rejectFollowRequest(requestId);
          set((state) => ({ followRequests: state.followRequests.filter((request) => request.id !== requestId) }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not decline follow request');
        }
      },

      votePoll: async (postId, optionId) => {
        try {
          const updated = await api.votePostPoll(postId, optionId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ posts: state.posts.map((item) => item.id === postId ? mapPost(updated, currentUserId) : item) }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not record poll vote');
        }
      },

      loadStories: async () => {
        try {
          const backendStories = await api.getStories();
          const currentUserId = get().currentUser?.id;
          if (backendStories && backendStories.length > 0) {
            set({ stories: backendStories.map((s) => mapStory(s, currentUserId)) });
            return;
          }
        } catch {
          // fallback
        }
        set({ stories: [] });
      },

      viewStory: async (storyId) => {
        const uid = get().currentUser?.id || 'user-roy';
        const previous = get().stories.find((story) => story.id === storyId);
        set((state) => ({
          stories: state.stories.map(s =>
            s.id === storyId
              ? { ...s, viewed: true, viewerIds: !s.viewerIds.includes(uid) ? [...s.viewerIds, uid] : s.viewerIds }
              : s
          )
        }));
        try {
          const updated = await api.viewStory(storyId);
          set((state) => ({ stories: state.stories.map((story) => story.id === storyId ? mapStory(updated, uid) : story) }));
        } catch {
          if (previous) set((state) => ({ stories: state.stories.map((story) => story.id === storyId ? previous : story) }));
        }
      },

      reactToStory: async (storyId, emoji) => {
        const uid = get().currentUser?.id || 'user-roy';
        const previous = get().stories.find((story) => story.id === storyId);
        set((state) => ({
          stories: state.stories.map(s =>
            s.id === storyId
              ? { ...s, reactions: [...s.reactions.filter(r => r.userId !== uid), { userId: uid, emoji }] }
              : s
          )
        }));
        try {
          const updated = await api.reactToStory(storyId, emoji);
          set((state) => ({ stories: state.stories.map((story) => story.id === storyId ? mapStory(updated, uid) : story) }));
        } catch {
          if (previous) set((state) => ({ stories: state.stories.map((story) => story.id === storyId ? previous : story) }));
        }
      },

      voteStoryPoll: async (storyId, optionId) => {
        try {
          const updated = await api.voteStoryPoll(storyId, optionId);
          const uid = get().currentUser?.id;
          set((state) => ({ stories: state.stories.map((story) => story.id === storyId ? mapStory(updated, uid) : story) }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not record story poll vote');
        }
      },

      addStory: async (story) => {
        const uid = get().currentUser?.id || 'user-roy';
        const optimisticId = `story-${Date.now()}`;
        const newStory: Story = {
          id: optimisticId,
          authorId: uid,
          mediaUrl: story.mediaUrl,
          type: story.type,
          textContent: story.textContent,
          backgroundGradient: story.backgroundGradient,
          viewed: false,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          viewerIds: [],
          reactions: [],
          isHighlight: Boolean(story.isHighlight),
          highlightTitle: story.highlightTitle,
          poll: story.poll ? {
            question: story.poll.question,
            options: story.poll.options.map((option, index) => ({ id: `optimistic-story-poll-${index}`, ...option, votes: 0 })),
            totalVotes: 0,
          } : undefined,
          contentCategory: story.contentCategory,
          contentRating: story.contentRating ?? DEFAULT_CONTENT_RATING,
        };
        set((state) => ({ stories: [newStory, ...state.stories] }));
        try {
          const created = await api.createStory({
            ...story,
            ...(story.poll ? { poll: { question: story.poll.question, options: story.poll.options.map(({ text }) => ({ text })) } } : {}),
          });
          set((state) => ({ stories: state.stories.map((item) => item.id === optimisticId ? mapStory(created, uid) : item) }));
        } catch (error) {
          set((state) => ({ stories: state.stories.filter((item) => item.id !== optimisticId) }));
          toast.error(error instanceof Error ? error.message : 'Could not publish the story');
          throw error;
        }
      },

      loadEvents: async () => {
        try {
          const backendEvents = await api.getEvents();
          const currentUserId = get().currentUser?.id;
          if (backendEvents && backendEvents.length > 0) {
            set({ events: backendEvents.map((e) => mapEvent(e, currentUserId)) });
            return;
          }
        } catch {
          // fallback
        }
        set({ events: [] });
      },

      createEvent: async (input) => {
        const uid = get().currentUser?.id || 'user-roy';
        try {
          const created = await api.createEvent(input);
          set((state) => ({ events: [mapEvent(created, uid), ...state.events] }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not create the event');
          throw error;
        }
      },

      toggleEventRsvp: async (eventId, status) => {
        const uid = get().currentUser?.id || 'user-roy';
        const event = get().events.find((e) => e.id === eventId);
        if (!event) return;
        const newStatus = event.rsvpStatus === status ? null : status;
        set((state) => ({
          events: state.events.map((e) => {
            if (e.id !== eventId) return e;
            const attendeeIds = newStatus === 'going'
              ? [...e.attendeeIds.filter(id => id !== uid), uid]
              : e.attendeeIds.filter(id => id !== uid);
            const interestedIds = newStatus === 'interested'
              ? [...e.interestedIds.filter(id => id !== uid), uid]
              : e.interestedIds.filter(id => id !== uid);
            return { ...e, rsvpStatus: newStatus, attendeeIds, interestedIds };
          })
        }));
        try {
          const updated = await api.rsvpEvent(eventId, newStatus);
          set((state) => ({ events: state.events.map((item) => item.id === eventId ? mapEvent(updated, uid) : item) }));
        } catch (error) {
          set((state) => ({ events: state.events.map((item) => item.id === eventId ? event : item) }));
          toast.error(error instanceof Error ? error.message : 'Could not update the RSVP');
        }
      },

      loadProducts: async () => {
        try {
          const backendProducts = await api.getProducts();
          set({ products: backendProducts.map(mapProduct) });
          return;
        } catch {
          // Keep the last successful snapshot during a transient outage.
        }
      },

      createProduct: async (input) => {
        try {
          const created = await api.createProduct(input);
          set((state) => ({ products: [mapProduct(created), ...state.products] }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not list the product');
          throw error;
        }
      },

      loadArticles: async () => {
        try {
          const backendArticles = await api.getArticles();
          set({ articles: backendArticles.map(mapArticle) });
          return;
        } catch {
          // Keep the last successful snapshot during a transient outage.
        }
      },

      createArticle: async (input) => {
        const uid = get().currentUser?.id || 'user-roy';
        const optimisticId = `art-${Date.now()}`;
        const newArticle: Article = {
          ...input,
          id: optimisticId,
          authorId: uid,
          readTime: input.readTime || 5,
          claps: 0,
          createdAt: new Date().toISOString(),
          savedByMe: false,
          contentCategory: input.contentCategory,
          contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
        };
        set((state) => ({ articles: [newArticle, ...state.articles] }));
        try {
          const created = await api.createArticle(input);
          set((state) => ({ articles: state.articles.map((article) => article.id === optimisticId ? mapArticle(created) : article) }));
        } catch (error) {
          set((state) => ({ articles: state.articles.filter((article) => article.id !== optimisticId) }));
          toast.error(error instanceof Error ? error.message : 'Could not publish the article');
          throw error;
        }
      },

      clapArticle: async (articleId) => {
        const previous = get().articles.find((article) => article.id === articleId);
        set((state) => ({
          articles: state.articles.map(a => a.id === articleId ? { ...a, claps: a.claps + 1 } : a)
        }));
        try {
          const updated = await api.clapArticle(articleId);
          set((state) => ({ articles: state.articles.map((article) => article.id === articleId ? mapArticle(updated) : article) }));
        } catch (error) {
          if (previous) set((state) => ({ articles: state.articles.map((article) => article.id === articleId ? previous : article) }));
          toast.error(error instanceof Error ? error.message : 'Could not clap for this article');
        }
      },

      loadVideos: async () => {
        try {
          const backendVideos = await api.getVideos();
          set({ videos: backendVideos.map(mapVideo) });
          return;
        } catch {
          // Keep the last successful snapshot during a transient outage.
        }
      },

      createVideo: async (input) => {
        const uid = get().currentUser?.id || 'user-roy';
        const optimisticId = `vid-${Date.now()}`;
        const newVideo: Video = {
          ...input,
          id: optimisticId,
          authorId: uid,
          views: 0,
          likes: 0,
          createdAt: new Date().toISOString(),
          contentCategory: input.contentCategory,
          contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
        };
        set((state) => ({ videos: [newVideo, ...state.videos] }));
        try {
          const created = await api.createVideo(input);
          set((state) => ({ videos: state.videos.map((video) => video.id === optimisticId ? mapVideo(created) : video) }));
        } catch (error) {
          set((state) => ({ videos: state.videos.filter((video) => video.id !== optimisticId) }));
          toast.error(error instanceof Error ? error.message : 'Could not publish the video');
          throw error;
        }
      },

      likeVideo: async (videoId) => {
        const previous = get().videos.find((video) => video.id === videoId);
        try {
          const updated = await api.likeVideo(videoId);
          set((state) => ({ videos: state.videos.map((video) => video.id === videoId ? mapVideo(updated) : video) }));
        } catch (error) {
          if (previous) set((state) => ({ videos: state.videos.map((video) => video.id === videoId ? previous : video) }));
          toast.error(error instanceof Error ? error.message : 'Could not update the video like');
        }
      },

      loadStreams: async () => {
        try {
          const backendStreams = await api.getStreams();
          set({ liveStreams: backendStreams.map(mapLiveStream) });
          return;
        } catch {
          // Keep the last successful snapshot during a transient outage.
        }
      },

      createStream: async (input) => {
        const uid = get().currentUser?.id || 'user-roy';
        const optimisticId = `stream-${Date.now()}`;
        const newStream: LiveStream = {
          ...input,
          id: optimisticId,
          hostId: uid,
          status: 'scheduled',
          viewers: 0,
          guestIds: [],
          contentRating: input.contentRating ?? DEFAULT_CONTENT_RATING,
        };
        set((state) => ({ liveStreams: [newStream, ...state.liveStreams] }));
        try {
          const created = await api.createStream(input);
          set((state) => ({ liveStreams: state.liveStreams.map((stream) => stream.id === optimisticId ? mapLiveStream(created) : stream) }));
        } catch (error) {
          set((state) => ({ liveStreams: state.liveStreams.filter((stream) => stream.id !== optimisticId) }));
          toast.error(error instanceof Error ? error.message : 'Could not schedule the live room');
          throw error;
        }
      },

      setStreamStatus: async (streamId, status) => {
        const previous = get().liveStreams.find((stream) => stream.id === streamId);
        set((state) => ({
          liveStreams: state.liveStreams.map((s) => (s.id === streamId ? { ...s, status } : s))
        }));
        try {
          const updated = await api.setStreamStatus(streamId, status);
          set((state) => ({ liveStreams: state.liveStreams.map((stream) => stream.id === streamId ? mapLiveStream(updated) : stream) }));
        } catch (error) {
          if (previous) set((state) => ({ liveStreams: state.liveStreams.map((stream) => stream.id === streamId ? previous : stream) }));
          toast.error(error instanceof Error ? error.message : 'Could not update the live room');
        }
      },

      updateContentFilter: async (contentFilter) => {
        await api.updateSettings({ contentFilter });
        set((state) => ({
          currentUser: state.currentUser ? { ...state.currentUser, contentFilter } : state.currentUser,
        }));
        await Promise.allSettled([
          get().loadFeed(),
          get().loadStories(),
          get().loadArticles(),
          get().loadVideos(),
          get().loadStreams(),
        ]);
      },

      toggleSaveProduct: async (productId) => {
        const product = get().products.find((item) => item.id === productId);
        if (!product) return;
        try {
          const updated = await api.saveProduct(productId);
          set((state) => ({ products: state.products.map((item) => item.id === productId ? mapProduct(updated) : item) }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not update saved products');
        }
      },

      
      sendAIMessage: async (content) => {
        const userMsg = { id: `ai_${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() };
        // Optimistic update
        set((state) => ({ aiMessages: [...state.aiMessages, userMsg as any] }));
        try {
          const res = await api.request<any>('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message: content })
          });
          const reply = {
            id: `ai_${Date.now() + 1}`,
            role: 'assistant',
            content: res?.message || res?.content || "No response received",
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ aiMessages: [...state.aiMessages, reply as any] }));
        } catch (e) {
          const errorReply = {
            id: `ai_${Date.now() + 1}`,
            role: 'assistant',
            content: "Sorry, the Yor Talks AI engine is currently offline.",
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ aiMessages: [...state.aiMessages, errorReply as any] }));
        }
      },


      updatePrivacy: async (patch) => {
        const { twoFactorEnabled, ...backendPatch } = patch;
        const previous = get().privacy;
        set((state) => ({ privacy: { ...state.privacy, ...patch } }));
        if (Object.keys(backendPatch).length === 0) return;
        try {
          const updated = await api.updatePrivacy(backendPatch);
          set((state) => ({ privacy: { ...state.privacy, ...updated } }));
        } catch (error) {
          set({ privacy: previous });
          toast.error(error instanceof Error ? error.message : 'Could not update privacy settings');
        }
      },

      toggleBlockUser: async (userId) => {
        const isBlocked = get().currentUser?.blockedUserIds?.includes(userId);
        set((state) => {
          if (!state.currentUser) return state;
          const blockedUserIds = isBlocked
            ? (state.currentUser.blockedUserIds || []).filter(id => id !== userId)
            : [...(state.currentUser.blockedUserIds || []), userId];
          return { currentUser: { ...state.currentUser, blockedUserIds } };
        });
        try {
          if (isBlocked) {
            await api.unblockUser(userId);
          } else {
            await api.blockUser(userId);
            set((state) => ({ posts: state.posts.filter((post) => post.authorId !== userId) }));
          }
        } catch (error) {
          set((state) => {
            if (!state.currentUser) return state;
            const blockedUserIds = isBlocked
              ? [...(state.currentUser.blockedUserIds || []), userId]
              : (state.currentUser.blockedUserIds || []).filter(id => id !== userId);
            return { currentUser: { ...state.currentUser, blockedUserIds } };
          });
          toast.error(error instanceof Error ? error.message : 'Could not update blocked users');
        }
      },

      toggleMuteUser: async (userId) => {
        const isMuted = get().currentUser?.mutedUserIds?.includes(userId);
        set((state) => {
          if (!state.currentUser) return state;
          const mutedUserIds = isMuted
            ? (state.currentUser.mutedUserIds || []).filter(id => id !== userId)
            : [...(state.currentUser.mutedUserIds || []), userId];
          return { currentUser: { ...state.currentUser, mutedUserIds } };
        });
        try {
          if (isMuted) {
            await api.unmuteUser(userId);
          } else {
            await api.muteUser(userId);
          }
        } catch (error) {
          set((state) => {
            if (!state.currentUser) return state;
            const mutedUserIds = isMuted
              ? [...(state.currentUser.mutedUserIds || []), userId]
              : (state.currentUser.mutedUserIds || []).filter(id => id !== userId);
            return { currentUser: { ...state.currentUser, mutedUserIds } };
          });
          toast.error(error instanceof Error ? error.message : 'Could not update muted users');
        }
      },

      setTwoFactorEnabled: (enabled) => {
        set((state) => ({
          currentUser: state.currentUser ? { ...state.currentUser, twoFactorEnabled: enabled } : state.currentUser,
          users: state.currentUser ? { ...state.users, [state.currentUser.id]: { ...state.users[state.currentUser.id], twoFactorEnabled: enabled } } : state.users,
        }));
      },

      updateWorldPreferences: (patch) => {
        const next = { ...get().worldPreferences, ...patch };
        set({ worldPreferences: next });
        void api.saveCreatorWorkspaceItem({ kind: 'preference', itemKey: 'world', payload: next as unknown as Record<string, unknown> }).catch(() => {
          // Local persistence keeps the preference available when the API is offline.
        });
      },

      loadProfileInteractions: async (userId) => {
        try {
          const [comments, showcases] = await Promise.all([api.getProfileComments(userId), api.getProfileShowcases(userId)]);
          const authors = comments.reduce<Record<string, User>>((result, comment) => {
            result[comment.author.id] = mapUser(comment.author);
            return result;
          }, {});
          set((state) => ({
            profileComments: { ...state.profileComments, [userId]: comments.map(mapProfileComment) },
            showcases: { ...state.showcases, [userId]: showcases.map(mapShowcase) },
            users: { ...state.users, ...authors },
          }));
        } catch {
          // Profile APIs can correctly reject private profiles; the main profile view handles that state.
        }
      },

      addProfileComment: async (targetUserId, content) => {
        try {
          const created = await api.createProfileComment(targetUserId, content);
          const mapped = mapProfileComment(created);
          set((state) => ({
            profileComments: { ...state.profileComments, [targetUserId]: [...(state.profileComments[targetUserId] ?? []), mapped] },
            users: { ...state.users, [created.author.id]: mapUser(created.author) },
          }));
          toast.success('Comment posted');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not post the profile comment');
        }
      },

      deleteProfileComment: async (commentId, targetUserId) => {
        try {
          await api.deleteProfileComment(targetUserId, commentId);
          set((state) => ({ profileComments: { ...state.profileComments, [targetUserId]: (state.profileComments[targetUserId] ?? []).filter((comment) => comment.id !== commentId) } }));
          toast.success('Comment deleted');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not delete the profile comment');
        }
      },

      addShowcase: async (showcase) => {
        try {
          const created = await api.createProfileShowcase(showcase.userId, showcase);
          const mapped = mapShowcase(created);
          set((state) => ({ showcases: { ...state.showcases, [showcase.userId]: [...(state.showcases[showcase.userId] ?? []), mapped] } }));
          toast.success('Showcase added');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not add the showcase');
        }
      },

      removeShowcase: async (showcaseId, userId) => {
        try {
          await api.deleteProfileShowcase(userId, showcaseId);
          set((state) => ({ showcases: { ...state.showcases, [userId]: (state.showcases[userId] ?? []).filter((showcase) => showcase.id !== showcaseId) } }));
          toast.success('Showcase removed');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not remove the showcase');
        }
      },
    }),
    {
      name: 'yortalks-storage',
      partialize: (state) => ({ worldPreferences: state.worldPreferences }),
    }
  )
);
