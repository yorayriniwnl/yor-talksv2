import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { api, ApiError, getStoredTokens, setStoredTokens, type BackendUser, type BackendPost, type BackendCommunity, type BackendNotification, type BackendConversation, type BackendMessage, type BackendEvent, type BackendProduct, type BackendArticle, type BackendVideo, type BackendLiveStream, type BackendStory, type Tokens } from './api-client';
import { connectSocket, disconnectSocket } from './socket-client';

// ── Types ────────────────────────────────────────────────────────────────
// User/Post/Community/Notification below are shaped to match what the UI
// already renders. Real API responses are mapped into these shapes (see the
// map* functions) so existing page components didn't need to be rewritten
// just because the data source changed from mock arrays to a real backend.

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
  // Only meaningfully populated for currentUser — lets the UI determine
  // "am I following this profile" without a separate relationship lookup.
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
  likes: number; // deprecated
  comments: number; // deprecated
  shares: number; // deprecated
  resonanceScore: number;
  x: number;
  y: number;
  createdAt: string;
  likedByMe?: boolean;
  savedByMe?: boolean;
  // Polls aren't backed by the real API (no poll data model on the server) —
  // this only ever gets populated for locally-created mock posts, if any.
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
  // No backend for this yet (real 2FA needs TOTP/backup codes) — stays local-only.
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

// ── Mock-only data (no backend exists for these yet — see README) ──────
const MOCK_LIVESTREAMS: LiveStream[] = [];
const MOCK_EVENTS: EventItem[] = [];
const MOCK_PRODUCTS: Product[] = [];
const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: 'ac1', title: 'First Post', description: 'Publish your first post', icon: 'Sparkles', unlocked: false, progress: 0, goal: 1, xp: 50 },
  { id: 'ac2', title: 'Rising Voice', description: 'Reach 1,000 followers', icon: 'TrendingUp', unlocked: false, progress: 0, goal: 1000, xp: 200 },
  { id: 'ac3', title: 'Community Builder', description: 'Join 5 communities', icon: 'Users', unlocked: false, progress: 0, goal: 5, xp: 100 },
];
const MOCK_AI_MESSAGES: AIMessage[] = [
  { id: 'ai1', role: 'assistant', content: "Hi! I'm your Yor Talks assistant. (Note: this is a placeholder reply — there's no real AI backend wired up yet.)", createdAt: new Date().toISOString() },
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

  // Auth — real, hits the backend
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  initialize: () => Promise<void>;

  // Stories — real
  loadStories: () => Promise<void>;

  // Posts/feed — real
  loadFeed: () => Promise<void>;
  loadPost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  addPost: (content: string, media?: string[], poll?: Post['poll']) => Promise<void>;
  toggleSavePost: (postId: string) => Promise<void>;
  sharePost: (postId: string) => Promise<void>;

  // Communities — real
  loadCommunities: () => Promise<void>;
  createCommunity: (name: string, slug: string, description: string) => Promise<void>;
  toggleCommunityMembership: (communityId: string) => Promise<void>;

  // Notifications — real
  loadNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Profile Comments & Showcases
  addProfileComment: (targetUserId: string, content: string) => Promise<void>;
  deleteProfileComment: (commentId: string, targetUserId: string) => Promise<void>;
  addShowcase: (showcase: Omit<Showcase, 'id'>) => Promise<void>;
  removeShowcase: (showcaseId: string, userId: string) => Promise<void>;

  // Messages — real, with live delivery over the socket connection
  loadConversations: () => Promise<void>;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  sendDirectMessage: (recipientId: string, content: string) => Promise<void>;

  // Follow — real
  loadUserProfile: (userId: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;

  // Everything below has no backend yet — kept as local-only mock state.
  votePoll: (postId: string, optionId: string) => void;
  loadEvents: () => Promise<void>;
  createEvent: (input: { title: string; description: string; coverUrl: string; category: string; startsAt: string; location: string; isOnline: boolean }) => Promise<void>;
  toggleEventRsvp: (eventId: string, status: 'going' | 'interested') => Promise<void>;

  // Marketplace — real (saving/bookmarking a listing has no backend field, stays local-only)
  loadProducts: () => Promise<void>;
  createProduct: (input: { title: string; description: string; price: number; images: string[]; category: string; condition: 'new' | 'like-new' | 'used' }) => Promise<void>;

  // Articles — real
  loadArticles: () => Promise<void>;
  createArticle: (input: { title: string; excerpt: string; content: string; coverUrl: string; readTime?: number; collection?: string }) => Promise<void>;
  clapArticle: (articleId: string) => Promise<void>;

  // Videos — real (per-user "already liked" isn't tracked — see video-service.ts)
  loadVideos: () => Promise<void>;
  createVideo: (input: { title: string; videoUrl: string; thumbnailUrl: string; type: 'short' | 'standard' }) => Promise<void>;
  likeVideo: (videoId: string) => Promise<void>;

  // Stories - overriding old mocks above
  addStory: (story: Pick<Story, 'type' | 'mediaUrl' | 'textContent' | 'backgroundGradient'>) => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;
  reactToStory: (storyId: string, emoji: string) => Promise<void>;

  // Live streams — real scheduling/metadata only, no actual media pipeline
  loadStreams: () => Promise<void>;
  createStream: (input: { title: string; coverUrl: string; kind: 'video' | 'audio'; startsAt: string; category: string }) => Promise<void>;
  setStreamStatus: (streamId: string, status: 'scheduled' | 'live' | 'ended') => Promise<void>;
  toggleSaveProduct: (productId: string) => void;
  sendAIMessage: (content: string) => void;
  updatePrivacy: (patch: Partial<PrivacySettings>) => Promise<void>;
  toggleBlockUser: (userId: string) => Promise<void>;
  toggleMuteUser: (userId: string) => Promise<void>;
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
    // A message from someone with no existing conversation entry (first-ever
    // message between these two users) — refresh the list to pick it up.
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
      currentUser: null,
      tokens: null,
      isInitializing: true,
      authError: null,
      users: {},
      posts: [],
      stories: [],
      communities: [],
      liveStreams: MOCK_LIVESTREAMS,
      events: MOCK_EVENTS,
      products: MOCK_PRODUCTS,
      articles: [],
      videos: [],
      achievements: MOCK_ACHIEVEMENTS,
      notifications: [],
      conversations: [],
      messagesByConversation: {},
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
            authorId: 'u2',
            targetUserId: 'user-roy',
            content: 'Great profile! Love the ambient aesthetic.',
            createdAt: new Date().toISOString()
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
            title: 'My Setup',
            customText: 'Custom built PC with RTX 4090 and 64GB RAM.',
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
          // Already logged out server-side or token expired either way —
          // clear local state regardless.
        }
        disconnectSocket();
        setStoredTokens(null);
        set({ currentUser: null, tokens: null, posts: [], communities: [], notifications: [], conversations: [], messagesByConversation: {} });
      },

      requestPasswordReset: async (email) => {
        await api.requestPasswordReset(email);
      },

      initialize: async () => {
        const mockUser: User = {
          id: 'user-roy',
          username: 'yorayriniwnl',
          displayName: 'Ayush Roy',
          avatarUrl: '/images/ayush.jpg',
          coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
          bio: 'Full-stack developer intern candidate at KIIT. Building Next.js product surfaces, Python backend systems, realtime dashboards, and computer-vision tools.',
          followers: 140, // 14 skill signals * 10
          following: 9,   // 9 portfolio projects
          followingIds: ['user-anya'],
          verified: true
        };

        const mockAnya: User = {
          id: 'user-anya',
          username: 'anyaa_yaps',
          displayName: 'Anya',
          avatarUrl: '/images/anya.png',
          coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2564&auto=format&fit=crop',
          bio: '17 Posts 📸',
          followers: 51,
          following: 108,
          followingIds: ['user-roy'],
          verified: false
        };

        const mockMarcus: User = {
          id: 'user-marcus',
          username: 'marcus_ai',
          displayName: 'Marcus Vance',
          avatarUrl: 'https://i.pravatar.cc/150?u=marcus_ai',
          coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2564&auto=format&fit=crop',
          bio: 'AI Researcher & Spatial Computing Lead 🤖',
          followers: 2890,
          following: 190,
          verified: true
        };

        const mockElena: User = {
          id: 'user-elena',
          username: 'elena_audio',
          displayName: 'Elena Rostova',
          avatarUrl: 'https://i.pravatar.cc/150?u=elena_audio',
          coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=2564&auto=format&fit=crop',
          bio: 'Audio Architect & Sound Synthesist 🎧 Steam Level 88',
          followers: 3410,
          following: 420,
          verified: true
        };

        const mockSophia: User = {
          id: 'user-sophia',
          username: 'sophia_ui',
          displayName: 'Sophia Chen',
          avatarUrl: 'https://i.pravatar.cc/150?u=sophia_ui',
          coverUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=2564&auto=format&fit=crop',
          bio: 'Product Designer @ Multiverse UI. Coffee & Typography ☕',
          followers: 5120,
          following: 280,
          verified: true
        };

        const mockKai: User = {
          id: 'user-kai',
          username: 'kai_thorne',
          displayName: 'Kai Thorne',
          avatarUrl: 'https://i.pravatar.cc/150?u=kai_thorne',
          coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=2564&auto=format&fit=crop',
          bio: 'Cybernetic Architect & Game Producer 🎮',
          followers: 1890,
          following: 510,
          verified: true
        };

        const tokens = getStoredTokens();
        
        // Populate mock users in store
        set((state) => ({ 
          currentUser: mockUser, 
          users: { 
            ...state.users, 
            [mockUser.id]: mockUser, 
            [mockAnya.id]: mockAnya,
            [mockMarcus.id]: mockMarcus,
            [mockElena.id]: mockElena,
            [mockSophia.id]: mockSophia,
            [mockKai.id]: mockKai
          },
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
        } catch (e) {
          console.warn("Could not load backend data, falling back to mock state", e);
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
        } catch (err) {
          console.warn('API feed offline or empty, displaying rich mock space', err);
        }

        // Generate rich, high-quality mock posts with images, carousels, and polls
        const mockRichPosts: Post[] = [
          {
            id: 'post-1',
            authorId: 'user-anya',
            content: 'Just finished rendering the main biome for our upcoming open-world game! 🚀 Built with Unreal Engine 5.4. What do you think of the volumetric lighting?',
            media: [
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1600861194942-f883de0dfe96?q=80&w=1200&auto=format&fit=crop'
            ],
            likes: 1420,
            comments: 89,
            shares: 34,
            resonanceScore: 0.95,
            x: 0, y: 0,
            createdAt: new Date(Date.now() - 1800000).toISOString(),
            likedByMe: true
          },
          {
            id: 'post-2',
            authorId: 'user-marcus',
            content: 'Which AI architecture do you believe will define the next decade of spatial computing?',
            likes: 890,
            comments: 156,
            shares: 42,
            resonanceScore: 0.88,
            x: 100, y: 100,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            poll: {
              question: 'Which AI paradigm will lead 2026-2030?',
              options: [
                { id: 'opt1', text: 'Multimodal Spatial Transformers', votes: 412 },
                { id: 'opt2', text: 'Neuromorphic On-Device Chips', votes: 238 },
                { id: 'opt3', text: 'Real-time World Models', votes: 540 }
              ],
              totalVotes: 1190,
              votedOptionId: 'opt3'
            }
          },
          {
            id: 'post-3',
            authorId: 'user-elena',
            content: 'Late night sound design session. Synthesizing ambient rain and cybernetic resonance for chapter 4. 🎧🔊',
            media: [
              'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop'
            ],
            likes: 654,
            comments: 42,
            shares: 19,
            resonanceScore: 0.82,
            x: -100, y: 200,
            createdAt: new Date(Date.now() - 7200000).toISOString()
          },
          {
            id: 'post-4',
            authorId: 'user-sophia',
            content: 'Clean minimalist setups boost productivity by at least 50%. Here is my workspace for the week. ☕💻',
            media: [
              'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=1200&auto=format&fit=crop',
              'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1200&auto=format&fit=crop'
            ],
            likes: 2130,
            comments: 112,
            shares: 78,
            resonanceScore: 0.91,
            x: 200, y: -100,
            createdAt: new Date(Date.now() - 14400000).toISOString(),
            likedByMe: true
          },
          {
            id: 'post-5',
            authorId: 'user-kai',
            content: 'Just dropped a new longform article on the Steam & Multiverse architecture. Link in bio! 📖✨',
            media: [
              'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop'
            ],
            likes: 980,
            comments: 65,
            shares: 31,
            resonanceScore: 0.79,
            x: -200, y: -200,
            createdAt: new Date(Date.now() - 28800000).toISOString()
          }
        ];
        set({ posts: mockRichPosts });
      },

      loadPost: async (postId) => {
        if (get().posts.some((p) => p.id === postId)) return;
        try {
          const post = await api.getPost(postId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ posts: [...state.posts, mapPost(post, currentUserId)] }));
        } catch (err) {
          console.error('Failed to load post', err);
          toast.error('Failed to load post details');
        }
      },

      likePost: async (postId) => {
        const post = get().posts.find((p) => p.id === postId);
        if (!post) return;
        // Optimistic update, reconciled with the real response below.
        set((state) => ({
          posts: state.posts.map((p) => (p.id === postId ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 } : p)),
        }));
        try {
          const updated = post.likedByMe ? await api.unlikePost(postId) : await api.likePost(postId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ posts: state.posts.map((p) => (p.id === postId ? mapPost(updated, currentUserId) : p)) }));
        } catch (err) {
          console.error('Failed to like/unlike post', err);
          toast.error('Failed to like/unlike post');
          await get().loadFeed();
        }
      },

      addPost: async (content, media, poll) => {
        const created = await api.createPost({ content, images: media });
        const currentUserId = get().currentUser?.id;
        // Polls have no backend data model — attach client-side only, on top
        // of the real (persisted) post. Won't survive a refresh.
        set((state) => ({ posts: [{ ...mapPost(created, currentUserId), poll }, ...state.posts] }));
      },

      toggleSavePost: async (postId) => {
        const updated = await api.bookmarkPost(postId);
        const currentUserId = get().currentUser?.id;
        set((state) => ({ posts: state.posts.map((p) => (p.id === postId ? mapPost(updated, currentUserId) : p)) }));
      },

      sharePost: async (postId) => {
        const updated = await api.sharePost(postId);
        const currentUserId = get().currentUser?.id;
        set((state) => ({ posts: state.posts.map((p) => (p.id === postId ? mapPost(updated, currentUserId) : p)) }));
      },

      loadCommunities: async () => {
        try {
          const backendCommunities = await api.getCommunities();
          const currentUserId = get().currentUser?.id;
          set({ communities: backendCommunities.map((c) => mapCommunity(c, currentUserId)) });
        } catch (err) {
          console.error('Failed to load communities', err);
        }
      },

      createCommunity: async (name, slug, description) => {
        const created = await api.createCommunity({ name, slug, description });
        const currentUserId = get().currentUser?.id;
        set((state) => ({ communities: [mapCommunity(created, currentUserId), ...state.communities] }));
      },

      toggleCommunityMembership: async (communityId) => {
        const community = get().communities.find((c) => c.id === communityId);
        if (!community) return;
        // Optimistic update, reconciled with the real response below.
        set((state) => ({
          communities: state.communities.map((c) =>
            c.id === communityId ? { ...c, isMember: !c.isMember, members: c.isMember ? c.members - 1 : c.members + 1 } : c
          ),
        }));
        try {
          const updated = community.isMember ? await api.leaveCommunity(communityId) : await api.joinCommunity(communityId);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ communities: state.communities.map((c) => (c.id === communityId ? mapCommunity(updated, currentUserId) : c)) }));
        } catch (err) {
          console.error('Failed to join/leave community', err);
          await get().loadCommunities();
        }
      },

      loadNotifications: async () => {
        try {
          const backendNotifications = await api.getNotifications();
          set({ notifications: backendNotifications.map(mapNotification) });
        } catch (err) {
          console.error('Failed to load notifications', err);
        }
      },

      markNotificationRead: async (id) => {
        set((state) => ({ notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
        try {
          await api.markNotificationRead(id);
        } catch (err) {
          console.error('Failed to mark notification read', err);
        }
      },

      markAllNotificationsRead: async () => {
        const unread = get().notifications.filter((n) => !n.read);
        set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) }));
        try {
          await Promise.all(unread.map((n) => api.markNotificationRead(n.id)));
        } catch (err) {
          console.error('Failed to mark all notifications read', err);
        }
      },

      loadConversations: async () => {
        try {
          const results = await api.getConversations();
          set({ conversations: results.map((r) => mapConversation(r.conversation, r.lastMessage)) });
        } catch (err) {
          console.error('Failed to load conversations', err);
        }
      },

      loadConversationMessages: async (conversationId) => {
        try {
          const messages = await api.getConversationMessages(conversationId);
          set((state) => ({ messagesByConversation: { ...state.messagesByConversation, [conversationId]: messages.map(mapMessage) } }));
        } catch (err) {
          console.error('Failed to load conversation messages', err);
        }
      },

      sendDirectMessage: async (recipientId, content) => {
        const sent = await api.sendMessage(recipientId, content);
        const mapped = mapMessage(sent);
        set((state) => {
          const existing = state.messagesByConversation[mapped.conversationId] ?? [];
          const alreadyHasConversation = state.conversations.some((c) => c.id === mapped.conversationId);
          const conversations = alreadyHasConversation
            ? state.conversations.map((c) => (c.id === mapped.conversationId ? { ...c, lastMessage: mapped, updatedAt: mapped.createdAt } : c))
            : [{ id: mapped.conversationId, participantIds: [state.currentUser?.id ?? '', recipientId], lastMessage: mapped, updatedAt: mapped.createdAt }, ...state.conversations];
          return {
            messagesByConversation: { ...state.messagesByConversation, [mapped.conversationId]: [...existing, mapped] },
            conversations,
          };
        });
      },

      loadUserProfile: async (userId) => {
        if (get().users[userId]) return;
        try {
          const user = await api.getProfile(userId);
          const mapped = mapUser(user);
          set((state) => ({ users: { ...state.users, [mapped.id]: mapped } }));
        } catch (err) {
          console.error('Failed to load profile', err);
        }
      },

      followUser: async (userId) => {
        const result = await api.followUser(userId);
        const mappedTarget = mapUser(result.target);
        const mappedFollower = mapUser(result.follower);
        set((state) => ({
          users: { ...state.users, [mappedTarget.id]: mappedTarget },
          currentUser: state.currentUser ? { ...state.currentUser, following: mappedFollower.following, followingIds: mappedFollower.followingIds } : state.currentUser,
        }));
      },

      unfollowUser: async (userId) => {
        const result = await api.unfollowUser(userId);
        const mappedTarget = mapUser(result.target);
        const mappedFollower = mapUser(result.follower);
        set((state) => ({
          users: { ...state.users, [mappedTarget.id]: mappedTarget },
          currentUser: state.currentUser ? { ...state.currentUser, following: mappedFollower.following, followingIds: mappedFollower.followingIds } : state.currentUser,
        }));
      },

      // ---- Mock-only actions below (no backend) ----
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
          set({ stories: backendStories.map((s) => mapStory(s, currentUserId)) });
        } catch (err) {
          console.error('Failed to load stories', err);
        }
      },

      viewStory: async (storyId) => {
        const uid = get().currentUser?.id;
        if (!uid) return;
        set((state) => ({
          stories: state.stories.map(s =>
            s.id === storyId
              ? { ...s, viewed: true, viewerIds: !s.viewerIds.includes(uid) ? [...s.viewerIds, uid] : s.viewerIds }
              : s
          )
        }));
        try {
          await api.viewStory(storyId);
        } catch (err) {
          console.error('Failed to view story', err);
        }
      },

      reactToStory: async (storyId, emoji) => {
        const uid = get().currentUser?.id;
        if (!uid) return;
        set((state) => ({
          stories: state.stories.map(s =>
            s.id === storyId
              ? { ...s, reactions: [...s.reactions.filter(r => r.userId !== uid), { userId: uid, emoji }] }
              : s
          )
        }));
        try {
          await api.reactToStory(storyId, emoji);
        } catch (err) {
          console.error('Failed to react to story', err);
        }
      },

      addStory: async (story) => {
        if (!get().currentUser) return;
        try {
          const created = await api.createStory(story);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ stories: [mapStory(created, currentUserId), ...state.stories] }));
        } catch (err) {
          console.error('Failed to add story', err);
        }
      },

      loadEvents: async () => {
        try {
          const backendEvents = await api.getEvents();
          const currentUserId = get().currentUser?.id;
          set({ events: backendEvents.map((e) => mapEvent(e, currentUserId)) });
        } catch (err) {
          console.error('Failed to load events', err);
        }
      },

      createEvent: async (input) => {
        const created = await api.createEvent(input);
        const currentUserId = get().currentUser?.id;
        set((state) => ({ events: [mapEvent(created, currentUserId), ...state.events] }));
      },

      toggleEventRsvp: async (eventId, status) => {
        const event = get().events.find((e) => e.id === eventId);
        if (!event) return;
        const newStatus = event.rsvpStatus === status ? null : status;
        try {
          const updated = await api.rsvpEvent(eventId, newStatus);
          const currentUserId = get().currentUser?.id;
          set((state) => ({ events: state.events.map((e) => (e.id === eventId ? mapEvent(updated, currentUserId) : e)) }));
        } catch (err) {
          console.error('Failed to update RSVP', err);
        }
      },

      loadProducts: async () => {
        try {
          const backendProducts = await api.getProducts();
          set({ products: backendProducts.map(mapProduct) });
        } catch (err) {
          console.error('Failed to load products', err);
        }
      },

      createProduct: async (input) => {
        const created = await api.createProduct(input);
        set((state) => ({ products: [mapProduct(created), ...state.products] }));
      },

      loadArticles: async () => {
        try {
          const backendArticles = await api.getArticles();
          set({ articles: backendArticles.map(mapArticle) });
        } catch (err) {
          console.error('Failed to load articles', err);
        }
      },

      createArticle: async (input) => {
        const created = await api.createArticle(input);
        set((state) => ({ articles: [mapArticle(created), ...state.articles] }));
      },

      clapArticle: async (articleId) => {
        try {
          const updated = await api.clapArticle(articleId);
          set((state) => ({ articles: state.articles.map((a) => (a.id === articleId ? mapArticle(updated) : a)) }));
        } catch (err) {
          console.error('Failed to clap', err);
        }
      },

      loadVideos: async () => {
        try {
          const backendVideos = await api.getVideos();
          set({ videos: backendVideos.map(mapVideo) });
        } catch (err) {
          console.error('Failed to load videos', err);
        }
      },

      createVideo: async (input) => {
        const created = await api.createVideo(input);
        set((state) => ({ videos: [mapVideo(created), ...state.videos] }));
      },

      likeVideo: async (videoId) => {
        try {
          const updated = await api.likeVideo(videoId);
          set((state) => ({ videos: state.videos.map((v) => (v.id === videoId ? mapVideo(updated) : v)) }));
        } catch (err) {
          console.error('Failed to like video', err);
        }
      },

      loadStreams: async () => {
        try {
          const backendStreams = await api.getStreams();
          set({ liveStreams: backendStreams.map(mapLiveStream) });
        } catch (err) {
          console.error('Failed to load streams', err);
        }
      },

      createStream: async (input) => {
        const created = await api.createStream(input);
        set((state) => ({ liveStreams: [mapLiveStream(created), ...state.liveStreams] }));
      },

      setStreamStatus: async (streamId, status) => {
        try {
          const updated = await api.setStreamStatus(streamId, status);
          set((state) => ({ liveStreams: state.liveStreams.map((s) => (s.id === streamId ? mapLiveStream(updated) : s)) }));
        } catch (err) {
          console.error('Failed to update stream status', err);
        }
      },

      toggleSaveProduct: (productId) => set((state) => ({
        products: state.products.map(p => p.id === productId ? { ...p, savedByMe: !p.savedByMe } : p)
      })),

      sendAIMessage: (content) => set((state) => {
        const userMsg: AIMessage = { id: `ai_${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() };
        const reply: AIMessage = {
          id: `ai_${Date.now() + 1}`,
          role: 'assistant',
          content: "There's no real AI backend wired up yet, so I can't actually respond to that — this is placeholder text.",
          createdAt: new Date(Date.now() + 500).toISOString(),
        };
        return { aiMessages: [...state.aiMessages, userMsg, reply] };
      }),

      updatePrivacy: async (patch) => {
        // twoFactorEnabled has no backend yet — keep it purely local, send the rest.
        const { twoFactorEnabled, ...backendPatch } = patch;
        set((state) => ({ privacy: { ...state.privacy, ...patch } }));
        if (Object.keys(backendPatch).length === 0) return;
        try {
          const updated = await api.updatePrivacy(backendPatch);
          set((state) => ({ privacy: { ...state.privacy, ...updated } }));
        } catch (err) {
          console.error('Failed to update privacy settings', err);
        }
      },

      toggleBlockUser: async (userId) => {
        const isBlocked = get().currentUser?.blockedUserIds?.includes(userId);
        try {
          const result = isBlocked ? await api.unblockUser(userId) : await api.blockUser(userId);
          set((state) => ({ currentUser: state.currentUser ? { ...state.currentUser, blockedUserIds: result.blockedUsers } : state.currentUser }));
        } catch (err) {
          console.error('Failed to block/unblock user', err);
        }
      },

      toggleMuteUser: async (userId) => {
        const isMuted = get().currentUser?.mutedUserIds?.includes(userId);
        try {
          const result = isMuted ? await api.unmuteUser(userId) : await api.muteUser(userId);
          set((state) => ({ currentUser: state.currentUser ? { ...state.currentUser, mutedUserIds: result.mutedUsers } : state.currentUser }));
        } catch (err) {
          console.error('Failed to mute/unmute user', err);
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
