import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import {
  api,
  ApiError,
  getStoredTokens,
  setStoredTokens,
  type BackendUser,
  type BackendPost,
  type BackendCommunity,
  type BackendNotification,
  type BackendConversation,
  type BackendMessage,
  type BackendEvent,
  type BackendProduct,
  type BackendArticle,
  type BackendVideo,
  type BackendLiveStream,
  type BackendStory,
  type Tokens
} from './api-client';
import { connectSocket, disconnectSocket } from './socket-client';
import {
  MOCK_USERS,
  MOCK_POSTS,
  MOCK_STORIES,
  MOCK_COMMUNITIES,
  MOCK_EVENTS,
  MOCK_PRODUCTS,
  MOCK_ARTICLES,
  MOCK_VIDEOS,
  MOCK_LIVESTREAMS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES_BY_CONVERSATION,
  MOCK_NOTIFICATIONS
} from './mockData';

// ── Types ────────────────────────────────────────────────────────────────
export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  coverUrl?: string;
  bio?: string;
  verified?: boolean;
  followers: number;
  following: number;
  followingIds?: string[];
  blockedUserIds?: string[];
  mutedUserIds?: string[];
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
  resonanceScore: number;
  x: number;
  y: number;
  createdAt: string;
  likedByMe?: boolean;
  savedByMe?: boolean;
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
  isHighlight?: boolean;
  highlightTitle?: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  read: boolean;
  replyToId?: string | null;
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

// ── Mappers: real API responses → the UI shapes above ──────────────────
function mapUser(u: BackendUser): User {
  return {
    id: u.id,
    username: u.username,
    displayName: u.fullName || u.username,
    avatarUrl: u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`,
    bio: u.bio,
    verified: false,
    followers: u.followers?.length ?? 0,
    following: u.following?.length ?? 0,
    followingIds: u.following,
    blockedUserIds: u.blockedUsers,
    mutedUserIds: u.mutedUsers,
  };
}

function mapStory(s: BackendStory, currentUserId?: string): Story {
  return {
    id: s.id,
    authorId: s.authorId,
    mediaUrl: s.mediaUrl,
    type: s.type as Story['type'],
    textContent: s.textContent ?? undefined,
    backgroundGradient: s.backgroundGradient ?? undefined,
    viewed: currentUserId ? s.viewerIds.includes(currentUserId) : false,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    viewerIds: s.viewerIds,
    reactions: s.reactions,
    isHighlight: s.isHighlight,
    highlightTitle: s.highlightTitle ?? undefined,
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
  return {
    id: p.id,
    authorId: p.authorId,
    content: p.content,
    media: p.images && p.images.length ? p.images : undefined,
    likes: p.likedBy?.length ?? 0,
    comments: p.comments?.length ?? 0,
    shares: p.shareCount ?? 0,
    resonanceScore: spatial.resonanceScore,
    x: spatial.x,
    y: spatial.y,
    createdAt: p.createdAt,
    likedByMe: currentUserId ? p.likedBy?.includes(currentUserId) : false,
    savedByMe: currentUserId ? p.bookmarkedBy?.includes(currentUserId) : false,
  };
}

function mapCommunity(c: BackendCommunity, currentUserId?: string): Community {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    coverUrl: `https://picsum.photos/seed/${c.id}/600/300`,
    members: c.memberIds?.length ?? 0,
    isMember: currentUserId ? c.memberIds?.includes(currentUserId) : false,
    visibility: 'public',
    category: 'General',
  };
}

function mapMessage(m: BackendMessage): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt,
    read: m.seenAt !== null,
    replyToId: m.replyToId ?? null,
  };
}

function mapConversation(c: BackendConversation, lastMessage: BackendMessage | null): Conversation {
  return {
    id: c.id,
    participantIds: c.participantIds ?? [c.participantA, c.participantB],
    lastMessage: lastMessage ? mapMessage(lastMessage) : undefined,
    updatedAt: c.updatedAt,
  };
}

function mapProduct(p: BackendProduct): Product {
  return {
    id: p.id,
    sellerId: p.sellerId,
    title: p.title,
    description: p.description,
    price: p.price,
    images: p.images,
    category: p.category,
    condition: p.condition as Product['condition'],
    createdAt: p.createdAt,
  };
}

function mapArticle(a: BackendArticle): Article {
  return {
    id: a.id,
    authorId: a.authorId,
    title: a.title,
    excerpt: a.excerpt,
    content: a.content,
    coverUrl: a.coverUrl,
    readTime: a.readTime,
    claps: a.claps,
    createdAt: a.createdAt,
    collection: a.collection ?? undefined,
  };
}

function mapVideo(v: BackendVideo): Video {
  return {
    id: v.id,
    authorId: v.authorId,
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    title: v.title,
    views: v.views,
    likes: v.likes,
    createdAt: v.createdAt,
    type: v.type as Video['type'],
  };
}

function mapLiveStream(s: BackendLiveStream): LiveStream {
  return {
    id: s.id,
    hostId: s.hostId,
    title: s.title,
    coverUrl: s.coverUrl,
    kind: s.kind as LiveStream['kind'],
    status: s.status as LiveStream['status'],
    viewers: s.viewers,
    startsAt: s.startsAt,
    category: s.category,
    guestIds: s.guestIds,
  };
}

function mapEvent(e: BackendEvent, currentUserId?: string): EventItem {
  return {
    id: e.id,
    hostId: e.hostId,
    title: e.title,
    description: e.description,
    coverUrl: e.coverUrl,
    category: e.category,
    startsAt: e.startsAt,
    location: e.location,
    isOnline: e.isOnline,
    attendeeIds: e.attendeeIds,
    interestedIds: e.interestedIds,
    rsvpStatus: currentUserId && e.attendeeIds.includes(currentUserId) ? 'going' : currentUserId && e.interestedIds.includes(currentUserId) ? 'interested' : null,
  };
}

function mapNotification(n: BackendNotification): Notification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    actorId: n.metadata?.actorId,
    targetId: n.relatedId,
    read: n.readAt !== null,
    createdAt: n.createdAt,
  };
}

const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: 'ac1', title: 'First Post', description: 'Publish your first post', icon: 'Sparkles', unlocked: true, progress: 1, goal: 1, xp: 50 },
  { id: 'ac2', title: 'Rising Voice', description: 'Reach 1,000 followers', icon: 'TrendingUp', unlocked: true, progress: 1420, goal: 1000, xp: 200 },
  { id: 'ac3', title: 'Community Builder', description: 'Join 5 communities', icon: 'Users', unlocked: true, progress: 5, goal: 5, xp: 100 },
  { id: 'ac4', title: 'Spatial Pioneer', description: 'Explore the 3D Multiverse canvas', icon: 'Compass', unlocked: true, progress: 1, goal: 1, xp: 150 },
  { id: 'ac5', title: 'Tourney Champion', description: 'Win an esports tournament bracket', icon: 'Trophy', unlocked: true, progress: 3, goal: 3, xp: 500 },
  { id: 'ac6', title: 'Soundboard Maestro', description: 'Trigger 50 streamer sound pads', icon: 'Volume2', unlocked: true, progress: 50, goal: 50, xp: 150 },
  { id: 'ac7', title: 'Arcade Grandmaster', description: 'Score over 10,000 pts in Arcade games', icon: 'Gamepad2', unlocked: true, progress: 12450, goal: 10000, xp: 300 },
  { id: 'ac8', title: 'Spatial Lounge Host', description: 'Host a proximity audio lounge room', icon: 'Headphones', unlocked: true, progress: 1, goal: 1, xp: 250 },
  { id: 'ac9', title: 'Marketplace Trader', description: 'List or purchase a verified hardware item', icon: 'ShoppingBag', unlocked: true, progress: 2, goal: 2, xp: 200 },
  { id: 'ac10', title: 'Quantum Pioneer', description: 'Read or publish a research paper in Articles', icon: 'Atom', unlocked: true, progress: 5, goal: 5, xp: 350 },
  { id: 'ac11', title: 'Clan Veteran', description: 'Complete 10 clan war scrim matches', icon: 'Shield', unlocked: true, progress: 10, goal: 10, xp: 400 },
  { id: 'ac12', title: 'Verified Legend', description: 'Attain the diamond checkmark badge', icon: 'Award', unlocked: true, progress: 1, goal: 1, xp: 1000 },
];

const MOCK_AI_MESSAGES: AIMessage[] = [
  { id: 'ai1', role: 'assistant', content: "Greetings! I'm your Yor Talks Multiverse AI assistant. How can I help you explore communities, analyze trends, or draft high-resonance posts today?", createdAt: new Date().toISOString() },
];

interface AppState {
  currentUser: User | null;
  tokens: Tokens | null;
  isInitializing: boolean;
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
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  aiMessages: AIMessage[];
  privacy: PrivacySettings;
  profileComments: Record<string, ProfileComment[]>;
  showcases: Record<string, Showcase[]>;

  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  initialize: () => Promise<void>;

  loadStories: () => Promise<void>;
  loadFeed: () => Promise<void>;
  loadPost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  addPost: (content: string, media?: string[], poll?: Post['poll']) => Promise<void>;
  toggleSavePost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;

  loadCommunities: () => Promise<void>;
  createCommunity: (name: string, slug: string, description: string) => Promise<void>;
  toggleCommunityMembership: (communityId: string) => Promise<void>;

  loadNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  addProfileComment: (targetUserId: string, content: string) => Promise<void>;
  deleteProfileComment: (commentId: string, targetUserId: string) => Promise<void>;
  addShowcase: (showcase: Omit<Showcase, 'id'>) => Promise<void>;
  removeShowcase: (showcaseId: string, userId: string) => Promise<void>;

  loadConversations: () => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  sendDirectMessage: (recipientId: string, content: string, replyToId?: string) => Promise<void>;

  loadUserProfile: (userId: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;

  votePoll: (postId: string, optionId: string) => void;
  loadEvents: () => Promise<void>;
  createEvent: (input: { title: string; description: string; coverUrl: string; category: string; startsAt: string; location: string; isOnline: boolean }) => Promise<void>;
  toggleEventRsvp: (eventId: string, status: 'going' | 'interested') => Promise<void>;

  loadProducts: () => Promise<void>;
  createProduct: (input: { title: string; description: string; price: number; images: string[]; category: string; condition: 'new' | 'like-new' | 'used' }) => Promise<void>;

  loadArticles: () => Promise<void>;
  createArticle: (input: { title: string; excerpt: string; content: string; coverUrl: string; readTime?: number; collection?: string }) => Promise<void>;
  clapArticle: (articleId: string) => Promise<void>;

  loadVideos: () => Promise<void>;
  createVideo: (input: { title: string; videoUrl: string; thumbnailUrl: string; type: 'short' | 'standard' }) => Promise<void>;
  likeVideo: (videoId: string) => Promise<void>;

  addStory: (story: Pick<Story, 'type' | 'mediaUrl' | 'textContent' | 'backgroundGradient'>) => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;
  reactToStory: (storyId: string, emoji: string) => Promise<void>;

  loadStreams: () => Promise<void>;
  createStream: (input: { title: string; coverUrl: string; kind: 'video' | 'audio'; startsAt: string; category: string }) => Promise<void>;
  setStreamStatus: (streamId: string, status: 'scheduled' | 'live' | 'ended') => Promise<void>;
  toggleSaveProduct: (productId: string) => void;
  sendAIMessage: (content: string) => void;
  updatePrivacy: (patch: Partial<PrivacySettings>) => Promise<void>;
  toggleBlockUser: (userId: string) => Promise<void>;
  toggleMuteUser: (userId: string) => Promise<void>;
  switchAccount: (userId: string) => void;
}

function setupRealtime(
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState,
) {
  const socket = connectSocket();
  if (!socket) return;
  socket.off('message:receive');
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
  socket.on('notification:new', (raw: BackendNotification) => {
    const mapped = mapNotification(raw);
    set((state) => (state.notifications.some((n) => n.id === mapped.id) ? state : { notifications: [mapped, ...state.notifications] }));
  });
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: MOCK_USERS['user-roy'],
      tokens: null,
      isInitializing: false,
      authError: null,
      users: MOCK_USERS,
      posts: MOCK_POSTS,
      stories: MOCK_STORIES,
      communities: MOCK_COMMUNITIES,
      liveStreams: MOCK_LIVESTREAMS,
      events: MOCK_EVENTS,
      products: MOCK_PRODUCTS,
      articles: MOCK_ARTICLES,
      videos: MOCK_VIDEOS,
      achievements: MOCK_ACHIEVEMENTS,
      notifications: MOCK_NOTIFICATIONS,
      conversations: MOCK_CONVERSATIONS,
      messagesByConversation: MOCK_MESSAGES_BY_CONVERSATION,
      aiMessages: MOCK_AI_MESSAGES,
      privacy: {
        profileVisibility: 'public',
        allowDmFromStrangers: true,
        messageRequests: true,
        twoFactorEnabled: false,
      },
      profileComments: {
        'user-roy': [
          {
            id: 'c1',
            authorId: 'user-sophia',
            targetUserId: 'user-roy',
            content: 'Great profile! Love the ambient aesthetic and 3D effects.',
            createdAt: new Date().toISOString()
          },
          {
            id: 'c2',
            authorId: 'user-aditi',
            targetUserId: 'user-roy',
            content: 'The hackathon page is looking fantastic. Let’s crush it!',
            createdAt: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      },
      showcases: {
        'user-roy': [
          {
            id: 's1',
            userId: 'user-roy',
            type: 'achievement',
            title: 'Early Adopter',
            contentId: 'achievement-1'
          },
          {
            id: 's2',
            userId: 'user-roy',
            type: 'custom',
            title: 'Multiverse Setup',
            customText: 'Custom built workstation with RTX 4090, 64GB RAM & 38-inch curved OLED.',
            customImageUrl: 'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?q=80&w=2938&auto=format&fit=crop'
          }
        ]
      },

      login: async (identifier, password) => {
        set({ authError: null });
        try {
          const result = await api.login({ identifier, password });
          setStoredTokens(result.tokens);
          const mapped = mapUser(result.user);
          set((state) => ({ currentUser: mapped, tokens: result.tokens, users: { ...state.users, [mapped.id]: mapped } }));
          setupRealtime(set, get);
          await Promise.all([get().loadFeed(), get().loadCommunities(), get().loadNotifications(), get().loadConversations(), get().loadEvents(), get().loadProducts(), get().loadArticles(), get().loadVideos(), get().loadStreams(), get().loadStories()]);
        } catch (err) {
          set({ authError: err instanceof ApiError ? err.message : 'Login failed' });
          throw err;
        }
      },

      register: async (username, email, password, fullName) => {
        set({ authError: null });
        try {
          const result = await api.register({ username, email, password, fullName });
          setStoredTokens(result.tokens);
          const mapped = mapUser(result.user);
          set((state) => ({ currentUser: mapped, tokens: result.tokens, users: { ...state.users, [mapped.id]: mapped } }));
          setupRealtime(set, get);
          await Promise.all([get().loadFeed(), get().loadCommunities(), get().loadNotifications(), get().loadConversations(), get().loadEvents(), get().loadProducts(), get().loadArticles(), get().loadVideos(), get().loadStreams(), get().loadStories()]);
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
        disconnectSocket();
        setStoredTokens(null);
        set({ currentUser: null, tokens: null });
      },

      switchAccount: (userId: string) => {
        const targetUser = get().users[userId] || MOCK_USERS[userId];
        if (targetUser) {
          set({ currentUser: targetUser });
          toast.success(`Switched account to @${targetUser.username}`, {
            description: `Now posting & browsing as ${targetUser.displayName}`
          });
        }
      },

      requestPasswordReset: async (email) => {
        await api.requestPasswordReset(email);
      },

      initialize: async () => {
        const currentUser = get().currentUser || MOCK_USERS['user-roy'];
        set((state) => ({
          currentUser,
          users: { ...MOCK_USERS, ...state.users },
          isInitializing: false
        }));

        setupRealtime(set, get);

        try {
          await Promise.all([
            get().loadFeed(),
            get().loadCommunities(),
            get().loadNotifications(),
            get().loadConversations(),
            get().loadEvents(),
            get().loadProducts(),
            get().loadArticles(),
            get().loadVideos(),
            get().loadStreams(),
            get().loadStories()
          ]);
        } catch {
          // Graceful fallback to mock data already initialized
        }
      },

      loadFeed: async () => {
        try {
          const backendPosts = await api.getFeed(1, 50);
          const currentUserId = get().currentUser?.id;
          if (backendPosts && backendPosts.length > 0) {
            set({ posts: backendPosts.map((p) => mapPost(p, currentUserId)) });
            return;
          }
        } catch {
          // fallback
        }
        set({ posts: MOCK_POSTS });
      },

      loadPost: async (postId) => {
        if (get().posts.some((p) => p.id === postId)) return;
        try {
          const post = await api.getPost(postId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ posts: [...state.posts, mapPost(post, currentUserId)] }));
        } catch {
          const mock = MOCK_POSTS.find(p => p.id === postId);
          if (mock) {
            set((state) => ({ posts: [...state.posts, mock] }));
          }
        }
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
        } catch {
          // Local state already updated
        }
      },

      addPost: async (content, media, poll) => {
        const currentUserId = get().currentUser?.id || 'user-roy';
        const newPost: Post = {
          id: `post-${Date.now()}`,
          authorId: currentUserId,
          content,
          media,
          likes: 0,
          comments: 0,
          shares: 0,
          resonanceScore: 0.9,
          x: Math.floor(Math.random() * 400 - 200),
          y: Math.floor(Math.random() * 400 - 200),
          createdAt: new Date().toISOString(),
          poll,
          likedByMe: false,
        };
        set((state) => ({ posts: [newPost, ...state.posts] }));
        try {
          await api.createPost({ content, images: media });
        } catch {
          // Local post retained
        }
      },

      toggleSavePost: async (postId) => {
        set((state) => ({
          posts: state.posts.map(p => p.id === postId ? { ...p, savedByMe: !p.savedByMe } : p)
        }));
        try {
          await api.bookmarkPost(postId);
        } catch {
          // Local post retained
        }
      },

      sharePost: async (postId) => {
        set((state) => ({
          posts: state.posts.map(p => p.id === postId ? { ...p, shares: p.shares + 1 } : p)
        }));
        toast.success('Post link copied to clipboard!');
        try {
          await api.sharePost(postId);
        } catch {
          // Local post retained
        }
      },

      loadCommunities: async () => {
        try {
          const backendCommunities = await api.getCommunities();
          const currentUserId = get().currentUser?.id;
          if (backendCommunities && backendCommunities.length > 0) {
            set({ communities: backendCommunities.map((c) => mapCommunity(c, currentUserId)) });
            return;
          }
        } catch {
          // fallback
        }
        set({ communities: MOCK_COMMUNITIES });
      },

      createCommunity: async (name, slug, description) => {
        const currentUserId = get().currentUser?.id || 'user-roy';
        const newCommunity: Community = {
          id: `comm-${Date.now()}`,
          name,
          description,
          coverUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=800&auto=format&fit=crop',
          members: 1,
          isMember: true,
          visibility: 'public',
          category: 'General',
        };
        set((state) => ({ communities: [newCommunity, ...state.communities] }));
        try {
          await api.createCommunity({ name, slug, description });
        } catch {
          // Local community retained
        }
      },

      toggleCommunityMembership: async (communityId) => {
        const community = get().communities.find((c) => c.id === communityId);
        if (!community) return;
        set((state) => ({
          communities: state.communities.map((c) =>
            c.id === communityId ? { ...c, isMember: !c.isMember, members: c.isMember ? c.members - 1 : c.members + 1 } : c
          ),
        }));
        try {
          if (community.isMember) {
            await api.leaveCommunity(communityId);
          } else {
            await api.joinCommunity(communityId);
          }
        } catch {
          // Local state updated
        }
      },

      loadNotifications: async () => {
        try {
          const backendNotifications = await api.getNotifications();
          if (backendNotifications && backendNotifications.length > 0) {
            set({ notifications: backendNotifications.map(mapNotification) });
            return;
          }
        } catch {
          // fallback
        }
        set({ notifications: MOCK_NOTIFICATIONS });
      },

      markNotificationRead: async (id) => {
        set((state) => ({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
        try {
          await api.markNotificationRead(id);
        } catch {
          // Local state updated
        }
      },

      markAllNotificationsRead: async () => {
        set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) }));
      },

      loadConversations: async () => {
        try {
          const results = await api.getConversations();
          if (results && results.length > 0) {
            set({ conversations: results.map((r) => mapConversation(r.conversation, r.lastMessage)) });
            return;
          }
        } catch {
          // fallback
        }
        set({
          conversations: MOCK_CONVERSATIONS,
          messagesByConversation: MOCK_MESSAGES_BY_CONVERSATION
        });
      },

      loadConversationMessages: async (conversationId) => {
        try {
          const messages = await api.getConversationMessages(conversationId);
          if (messages && messages.length > 0) {
            set((state) => ({ messagesByConversation: { ...state.messagesByConversation, [conversationId]: messages.map(mapMessage) } }));
            return;
          }
        } catch {
          // fallback
        }
        if (!get().messagesByConversation[conversationId] && MOCK_MESSAGES_BY_CONVERSATION[conversationId]) {
          set((state) => ({
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: MOCK_MESSAGES_BY_CONVERSATION[conversationId]
            }
          }));
        }
      },

      sendDirectMessage: async (recipientId, content, replyToId) => {
        const currentUserId = get().currentUser?.id || 'user-roy';
        const conversationId = `conv-${recipientId.replace('user-', '')}`;
        const newMsg: Message = {
          id: `msg-${Date.now()}`,
          conversationId,
          senderId: currentUserId,
          content,
          createdAt: new Date().toISOString(),
          read: true,
          replyToId,
        };
        set((state) => {
          const existing = state.messagesByConversation[conversationId] ?? [];
          const alreadyHasConversation = state.conversations.some((c) => c.id === conversationId);
          const conversations = alreadyHasConversation
            ? state.conversations.map((c) => (c.id === conversationId ? { ...c, lastMessage: newMsg, updatedAt: newMsg.createdAt } : c))
            : [{ id: conversationId, participantIds: [currentUserId, recipientId], lastMessage: newMsg, updatedAt: newMsg.createdAt }, ...state.conversations];
          return {
            messagesByConversation: { ...state.messagesByConversation, [conversationId]: [...existing, newMsg] },
            conversations,
          };
        });
        try {
          await api.sendMessage(recipientId, content, replyToId);
        } catch {
          // Local message retained
        }
      },

      loadUserProfile: async (userId) => {
        if (get().users[userId]) return;
        try {
          const user = await api.getProfile(userId);
          const mapped = mapUser(user);
          set((state) => ({ users: { ...state.users, [mapped.id]: mapped } }));
        } catch {
          if (MOCK_USERS[userId]) {
            set((state) => ({ users: { ...state.users, [userId]: MOCK_USERS[userId] } }));
          }
        }
      },

      followUser: async (userId) => {
        const user = get().users[userId];
        if (!user) return;
        set((state) => ({
          users: { ...state.users, [userId]: { ...user, followers: user.followers + 1 } },
          currentUser: state.currentUser ? {
            ...state.currentUser,
            following: state.currentUser.following + 1,
            followingIds: [...(state.currentUser.followingIds || []), userId]
          } : state.currentUser,
        }));
        try {
          await api.followUser(userId);
        } catch {
          // Local state updated
        }
      },

      unfollowUser: async (userId) => {
        const user = get().users[userId];
        if (!user) return;
        set((state) => ({
          users: { ...state.users, [userId]: { ...user, followers: Math.max(0, user.followers - 1) } },
          currentUser: state.currentUser ? {
            ...state.currentUser,
            following: Math.max(0, state.currentUser.following - 1),
            followingIds: (state.currentUser.followingIds || []).filter(id => id !== userId)
          } : state.currentUser,
        }));
        try {
          await api.unfollowUser(userId);
        } catch {
          // Local state updated
        }
      },

      votePoll: (postId, optionId) => set((state) => ({
        posts: state.posts.map(p => {
          if (p.id === postId && p.poll && !p.poll.votedOptionId) {
            return {
              ...p,
              poll: {
                ...p.poll,
                votedOptionId: optionId,
                totalVotes: p.poll.totalVotes + 1,
                options: p.poll.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o)
              }
            };
          }
          return p;
        })
      })),

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
        set({ stories: MOCK_STORIES });
      },

      viewStory: async (storyId) => {
        const uid = get().currentUser?.id || 'user-roy';
        set((state) => ({
          stories: state.stories.map(s =>
            s.id === storyId
              ? { ...s, viewed: true, viewerIds: !s.viewerIds.includes(uid) ? [...s.viewerIds, uid] : s.viewerIds }
              : s
          )
        }));
        try {
          await api.viewStory(storyId);
        } catch {
          // Local state updated
        }
      },

      reactToStory: async (storyId, emoji) => {
        const uid = get().currentUser?.id || 'user-roy';
        set((state) => ({
          stories: state.stories.map(s =>
            s.id === storyId
              ? { ...s, reactions: [...s.reactions.filter(r => r.userId !== uid), { userId: uid, emoji }] }
              : s
          )
        }));
        try {
          await api.reactToStory(storyId, emoji);
        } catch {
          // Local state updated
        }
      },

      addStory: async (story) => {
        const uid = get().currentUser?.id || 'user-roy';
        const newStory: Story = {
          id: `story-${Date.now()}`,
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
        };
        set((state) => ({ stories: [newStory, ...state.stories] }));
        try {
          await api.createStory(story);
        } catch {
          // Local state updated
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
        set({ events: MOCK_EVENTS });
      },

      createEvent: async (input) => {
        const uid = get().currentUser?.id || 'user-roy';
        const newEvent: EventItem = {
          ...input,
          id: `event-${Date.now()}`,
          hostId: uid,
          attendeeIds: [uid],
          interestedIds: [],
          rsvpStatus: 'going',
        };
        set((state) => ({ events: [newEvent, ...state.events] }));
        try {
          await api.createEvent(input);
        } catch {
          // Local state updated
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
          await api.rsvpEvent(eventId, newStatus);
        } catch {
          // Local state updated
        }
      },

      loadProducts: async () => {
        try {
          const backendProducts = await api.getProducts();
          if (backendProducts && backendProducts.length > 0) {
            set({ products: backendProducts.map(mapProduct) });
            return;
          }
        } catch {
          // fallback
        }
        set({ products: MOCK_PRODUCTS });
      },

      createProduct: async (input) => {
        const uid = get().currentUser?.id || 'user-roy';
        const newProduct: Product = {
          ...input,
          id: `prod-${Date.now()}`,
          sellerId: uid,
          createdAt: new Date().toISOString(),
          savedByMe: false,
        };
        set((state) => ({ products: [newProduct, ...state.products] }));
        try {
          await api.createProduct(input);
        } catch {
          // Local state updated
        }
      },

      loadArticles: async () => {
        try {
          const backendArticles = await api.getArticles();
          if (backendArticles && backendArticles.length > 0) {
            set({ articles: backendArticles.map(mapArticle) });
            return;
          }
        } catch {
          // fallback
        }
        set({ articles: MOCK_ARTICLES });
      },

      createArticle: async (input) => {
        const uid = get().currentUser?.id || 'user-roy';
        const newArticle: Article = {
          ...input,
          id: `art-${Date.now()}`,
          authorId: uid,
          readTime: input.readTime || 5,
          claps: 0,
          createdAt: new Date().toISOString(),
          savedByMe: false,
        };
        set((state) => ({ articles: [newArticle, ...state.articles] }));
        try {
          await api.createArticle(input);
        } catch {
          // Local state updated
        }
      },

      clapArticle: async (articleId) => {
        set((state) => ({
          articles: state.articles.map(a => a.id === articleId ? { ...a, claps: a.claps + 1 } : a)
        }));
        try {
          await api.clapArticle(articleId);
        } catch {
          // Local state updated
        }
      },

      loadVideos: async () => {
        try {
          const backendVideos = await api.getVideos();
          if (backendVideos && backendVideos.length > 0) {
            set({ videos: backendVideos.map(mapVideo) });
            return;
          }
        } catch {
          // fallback
        }
        set({ videos: MOCK_VIDEOS });
      },

      createVideo: async (input) => {
        const uid = get().currentUser?.id || 'user-roy';
        const newVideo: Video = {
          ...input,
          id: `vid-${Date.now()}`,
          authorId: uid,
          views: 0,
          likes: 0,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ videos: [newVideo, ...state.videos] }));
        try {
          await api.createVideo(input);
        } catch {
          // Local state updated
        }
      },

      likeVideo: async (videoId) => {
        set((state) => ({
          videos: state.videos.map(v => v.id === videoId ? { ...v, likes: v.likes + 1 } : v)
        }));
        try {
          await api.likeVideo(videoId);
        } catch {
          // Local state updated
        }
      },

      loadStreams: async () => {
        try {
          const backendStreams = await api.getStreams();
          if (backendStreams && backendStreams.length > 0) {
            set({ liveStreams: backendStreams.map(mapLiveStream) });
            return;
          }
        } catch {
          // fallback
        }
        set({ liveStreams: MOCK_LIVESTREAMS });
      },

      createStream: async (input) => {
        const uid = get().currentUser?.id || 'user-roy';
        const newStream: LiveStream = {
          ...input,
          id: `stream-${Date.now()}`,
          hostId: uid,
          status: 'scheduled',
          viewers: 0,
          guestIds: [],
        };
        set((state) => ({ liveStreams: [newStream, ...state.liveStreams] }));
        try {
          await api.createStream(input);
        } catch {
          // Local state updated
        }
      },

      setStreamStatus: async (streamId, status) => {
        set((state) => ({
          liveStreams: state.liveStreams.map((s) => (s.id === streamId ? { ...s, status } : s))
        }));
        try {
          await api.setStreamStatus(streamId, status);
        } catch {
          // Local state updated
        }
      },

      toggleSaveProduct: (productId) => set((state) => ({
        products: state.products.map(p => p.id === productId ? { ...p, savedByMe: !p.savedByMe } : p)
      })),

      sendAIMessage: (content) => set((state) => {
        const userMsg: AIMessage = { id: `ai_${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() };
        const replies = [
          "That's a fascinating vision for the Multiverse! I've indexed your prompt and will suggest relevant communities and collaborators.",
          "Great question! When designing spatial interfaces in 2026, balancing 3D depth with accessibility is paramount. Let me know if you need CSS code snippets!",
          "I analyzed trending topics across Yor Talks: Spatial AI, Custom Hardware, and Generative Shaders are gaining massive resonance this week."
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        const reply: AIMessage = {
          id: `ai_${Date.now() + 1}`,
          role: 'assistant',
          content: randomReply,
          createdAt: new Date(Date.now() + 600).toISOString(),
        };
        return { aiMessages: [...state.aiMessages, userMsg, reply] };
      }),

      updatePrivacy: async (patch) => {
        const { twoFactorEnabled, ...backendPatch } = patch;
        set((state) => ({ privacy: { ...state.privacy, ...patch } }));
        if (Object.keys(backendPatch).length === 0) return;
        try {
          const updated = await api.updatePrivacy(backendPatch);
          set((state) => ({ privacy: { ...state.privacy, ...updated } }));
        } catch {
          // Local state updated
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
          }
        } catch {
          // Local state updated
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
        } catch {
          // Local state updated
        }
      },

      addProfileComment: async (targetUserId, content) => {
        const currentUser = get().currentUser;
        if (!currentUser) return;
        const newComment: ProfileComment = {
          id: `comment_${Date.now()}`,
          authorId: currentUser.id,
          targetUserId,
          content,
          createdAt: new Date().toISOString(),
        };
        set((state) => {
          const userComments = state.profileComments[targetUserId] || [];
          return {
            profileComments: {
              ...state.profileComments,
              [targetUserId]: [newComment, ...userComments]
            }
          };
        });
      },

      deleteProfileComment: async (commentId, targetUserId) => {
        set((state) => {
          const userComments = state.profileComments[targetUserId] || [];
          return {
            profileComments: {
              ...state.profileComments,
              [targetUserId]: userComments.filter(c => c.id !== commentId)
            }
          };
        });
      },

      addShowcase: async (showcase) => {
        const newShowcase: Showcase = {
          ...showcase,
          id: `showcase_${Date.now()}`,
        };
        set((state) => {
          const userShowcases = state.showcases[showcase.userId] || [];
          return {
            showcases: {
              ...state.showcases,
              [showcase.userId]: [...userShowcases, newShowcase]
            }
          };
        });
      },

      removeShowcase: async (showcaseId, userId) => {
        set((state) => {
          const userShowcases = state.showcases[userId] || [];
          return {
            showcases: {
              ...state.showcases,
              [userId]: userShowcases.filter(s => s.id !== showcaseId)
            }
          };
        });
      },
    }),
    {
      name: 'yortalks-storage',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
