import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
};

export type Post = {
  id: string;
  authorId: string;
  content: string;
  media?: string[];
  likes: number;
  comments: number;
  shares: number;
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
};

export type Conversation = {
  id: string;
  participantIds: string[];
  lastMessageId?: string;
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
  type: 'like' | 'comment' | 'follow' | 'mention' | 'community' | 'marketplace' | 'event' | 'system' | 'message';
  actorId: string;
  targetId?: string; // post or article id
  read: boolean;
  createdAt: string;
};

export type Video = {
  id: string;
  authorId: string;
  videoUrl: string; // we'll use placeholder images for poster
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
  profileVisibility: 'everyone' | 'followers' | 'private';
  whoCanMessage: 'everyone' | 'followers' | 'no-one';
  blockedUserIds: string[];
  mutedUserIds: string[];
  twoFactorEnabled: boolean;
};

// Initial Mock Data
const MOCK_USERS: Record<string, User> = {
  'u1': { id: 'u1', username: 'alex_yt', displayName: 'Alex Rivera', avatarUrl: 'https://i.pravatar.cc/150?u=u1', coverUrl: 'https://picsum.photos/seed/u1/800/300', bio: 'Digital creator & designer. Building the future of social.', verified: true, followers: 14200, following: 340 },
  'u2': { id: 'u2', username: 'sarah_codes', displayName: 'Sarah Chen', avatarUrl: 'https://i.pravatar.cc/150?u=u2', bio: 'Frontend engineer. Coffee enthusiast.', verified: false, followers: 3200, following: 890 },
  'u3': { id: 'u3', username: 'marcus_daily', displayName: 'Marcus Johnson', avatarUrl: 'https://i.pravatar.cc/150?u=u3', coverUrl: 'https://picsum.photos/seed/u3/800/300', bio: 'Photography is my therapy. NYC.', verified: true, followers: 89000, following: 120 },
  'u4': { id: 'u4', username: 'elena_v', displayName: 'Elena Volkov', avatarUrl: 'https://i.pravatar.cc/150?u=u4', bio: 'Minimalist. Writer. Thinker.', followers: 450, following: 100 },
};

const MOCK_POSTS: Post[] = [
  { id: 'p1', authorId: 'u2', content: 'Just finished the new design system for Yor Talks! It\'s incredibly fluid. 🚀', likes: 342, comments: 28, shares: 12, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), likedByMe: true },
  { id: 'p2', authorId: 'u3', content: 'Morning light in Manhattan.', media: ['https://picsum.photos/seed/p2_1/600/800', 'https://picsum.photos/seed/p2_2/600/800'], likes: 8920, comments: 145, shares: 340, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: 'p3', authorId: 'u1', content: 'What\'s the most important feature in a modern social app?', poll: { question: 'What matters most?', options: [{ id: 'o1', text: 'Speed', votes: 120 }, { id: 'o2', text: 'Design', votes: 340 }, { id: 'o3', text: 'Privacy', votes: 210 }], totalVotes: 670 }, likes: 45, comments: 89, shares: 4, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: 'p4', authorId: 'u4', content: 'Sometimes less is more. Unplugging for the weekend. 🌿', likes: 120, comments: 12, shares: 1, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
];

const MOCK_STORIES: Story[] = [
  { id: 's1', authorId: 'u3', mediaUrl: 'https://picsum.photos/seed/s1/400/700', type: 'image', viewed: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(), viewerIds: ['u2', 'u4'], reactions: [{ userId: 'u2', emoji: '🔥' }] },
  { id: 's2', authorId: 'u2', mediaUrl: 'https://picsum.photos/seed/s2/400/700', type: 'video', viewed: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 19).toISOString(), viewerIds: ['u1'], reactions: [] },
  { id: 's3', authorId: 'u4', mediaUrl: '', type: 'text', textContent: 'Building something new today.', backgroundGradient: 'from-violet-500 to-fuchsia-500', viewed: false, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 23).toISOString(), viewerIds: [], reactions: [] },
  { id: 's4', authorId: 'u1', mediaUrl: 'https://picsum.photos/seed/s4/400/700', type: 'image', viewed: false, isHighlight: true, highlightTitle: 'Studio', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), expiresAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), viewerIds: ['u2', 'u3', 'u4'], reactions: [{ userId: 'u3', emoji: '❤️' }] },
];

const MOCK_COMMUNITIES: Community[] = [
  { id: 'c1', name: 'Design Vanguard', description: 'Exploring the bleeding edge of interface design.', coverUrl: 'https://picsum.photos/seed/c1/600/300', members: 12400, isMember: true, visibility: 'public', category: 'Design', trending: true },
  { id: 'c2', name: 'React Ninjas', description: 'Advanced React patterns and discussions.', coverUrl: 'https://picsum.photos/seed/c2/600/300', members: 45000, isMember: false, visibility: 'public', category: 'Engineering', trending: true },
  { id: 'c3', name: 'Street Photography', description: 'Capturing life as it happens.', coverUrl: 'https://picsum.photos/seed/c3/600/300', members: 8900, isMember: true, visibility: 'public', category: 'Photography' },
  { id: 'c4', name: 'Founders Circle', description: 'Invite-only room for early-stage founders.', coverUrl: 'https://picsum.photos/seed/c4/600/300', members: 640, isMember: false, visibility: 'invite-only', category: 'Business' },
];

const MOCK_LIVESTREAMS: LiveStream[] = [
  { id: 'l1', hostId: 'u3', title: 'Golden Hour Photowalk — Live from Brooklyn', coverUrl: 'https://picsum.photos/seed/l1/600/400', kind: 'video', status: 'live', viewers: 1834, startsAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(), category: 'Photography', guestIds: [] },
  { id: 'l2', hostId: 'u1', title: 'Design Systems AMA', coverUrl: 'https://picsum.photos/seed/l2/600/400', kind: 'audio', status: 'live', viewers: 412, startsAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), category: 'Design', guestIds: ['u2'] },
  { id: 'l3', hostId: 'u2', title: 'Building a Design System with Zustand', coverUrl: 'https://picsum.photos/seed/l3/600/400', kind: 'video', status: 'scheduled', viewers: 0, startsAt: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(), category: 'Engineering', guestIds: [] },
  { id: 'l4', hostId: 'u4', title: 'Late Night Writing Room', coverUrl: 'https://picsum.photos/seed/l4/600/400', kind: 'audio', status: 'ended', viewers: 0, startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), category: 'Writing', guestIds: [] },
];

const MOCK_EVENTS: EventItem[] = [
  { id: 'e1', hostId: 'u1', title: 'Yor Talks Design Summit', description: 'A day of talks on the future of interface design, spatial computing, and motion.', coverUrl: 'https://picsum.photos/seed/e1/700/400', category: 'Conference', startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(), location: 'San Francisco, CA', isOnline: false, attendeeIds: ['u2', 'u3'], interestedIds: ['u4'], rsvpStatus: 'going' },
  { id: 'e2', hostId: 'u2', title: 'React State Management Panel', description: 'Live panel comparing Zustand, Jotai, and TanStack Query in production.', coverUrl: 'https://picsum.photos/seed/e2/700/400', category: 'Workshop', startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(), location: 'Online', isOnline: true, attendeeIds: ['u1'], interestedIds: [], rsvpStatus: null },
  { id: 'e3', hostId: 'u3', title: 'Street Photography Meetup', description: 'Walk the city, share frames, and swap stories over coffee.', coverUrl: 'https://picsum.photos/seed/e3/700/400', category: 'Meetup', startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 9).toISOString(), location: 'New York, NY', isOnline: false, attendeeIds: [], interestedIds: ['u1', 'u4'], rsvpStatus: 'interested' },
];

const MOCK_PRODUCTS: Product[] = [
  { id: 'pr1', sellerId: 'u3', title: 'Fujifilm X100V — Mint Condition', description: 'Barely used, comes with two extra batteries and a leather half-case.', price: 1250, images: ['https://picsum.photos/seed/pr1/600/600'], category: 'Electronics', condition: 'like-new', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString() },
  { id: 'pr2', sellerId: 'u1', title: 'Herman Miller Aeron — Size B', description: 'Great desk chair, minor wear on the armrests.', price: 480, images: ['https://picsum.photos/seed/pr2/600/600'], category: 'Furniture', condition: 'used', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString() },
  { id: 'pr3', sellerId: 'u2', title: 'Mechanical Keyboard Kit', description: 'Hot-swappable, lubed switches, custom keycaps included.', price: 165, images: ['https://picsum.photos/seed/pr3/600/600'], category: 'Electronics', condition: 'new', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
];

const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: 'ac1', title: 'First Post', description: 'Publish your first post', icon: 'Sparkles', unlocked: true, progress: 1, goal: 1, xp: 50 },
  { id: 'ac2', title: 'Rising Voice', description: 'Reach 1,000 followers', icon: 'TrendingUp', unlocked: false, progress: 340, goal: 1000, xp: 200 },
  { id: 'ac3', title: 'Community Builder', description: 'Join 5 communities', icon: 'Users', unlocked: false, progress: 2, goal: 5, xp: 100 },
  { id: 'ac4', title: '7-Day Streak', description: 'Post 7 days in a row', icon: 'Flame', unlocked: false, progress: 3, goal: 7, xp: 150 },
  { id: 'ac5', title: 'Storyteller', description: 'Publish 10 stories', icon: 'BookOpen', unlocked: true, progress: 10, goal: 10, xp: 120 },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'like', actorId: 'u2', targetId: 'p1', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 'n2', type: 'follow', actorId: 'u3', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: 'n3', type: 'comment', actorId: 'u4', targetId: 'p1', read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: 'n4', type: 'mention', actorId: 'u2', targetId: 'p2', read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: 'n5', type: 'community', actorId: 'u1', targetId: 'c1', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: 'n6', type: 'event', actorId: 'u2', targetId: 'e2', read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
  { id: 'n7', type: 'marketplace', actorId: 'u3', targetId: 'pr1', read: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
  { id: 'n8', type: 'system', actorId: 'u1', read: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
];

const MOCK_AI_MESSAGES: AIMessage[] = [
  { id: 'ai1', role: 'assistant', content: 'Hi! I\'m your Yor Talks assistant. I can help you draft posts, summarize communities, or find what you need. What are you working on?', createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
];

interface AppState {
  currentUser: User | null;
  users: Record<string, User>;
  posts: Post[];
  stories: Story[];
  communities: Community[];
  liveStreams: LiveStream[];
  events: EventItem[];
  products: Product[];
  achievements: Achievement[];
  notifications: Notification[];
  aiMessages: AIMessage[];
  privacy: PrivacySettings;
  // Actions
  login: (email: string) => void;
  logout: () => void;
  likePost: (postId: string) => void;
  addPost: (content: string, media?: string[]) => void;
  votePoll: (postId: string, optionId: string) => void;
  toggleCommunityMembership: (communityId: string) => void;
  viewStory: (storyId: string) => void;
  reactToStory: (storyId: string, emoji: string) => void;
  addStory: (story: Pick<Story, 'type' | 'mediaUrl' | 'textContent' | 'backgroundGradient'>) => void;
  toggleEventRsvp: (eventId: string, status: 'going' | 'interested') => void;
  toggleSaveProduct: (productId: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  sendAIMessage: (content: string) => void;
  updatePrivacy: (patch: Partial<PrivacySettings>) => void;
  toggleBlockUser: (userId: string) => void;
  toggleMuteUser: (userId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: MOCK_USERS,
      posts: MOCK_POSTS,
      stories: MOCK_STORIES,
      communities: MOCK_COMMUNITIES,
      liveStreams: MOCK_LIVESTREAMS,
      events: MOCK_EVENTS,
      products: MOCK_PRODUCTS,
      achievements: MOCK_ACHIEVEMENTS,
      notifications: MOCK_NOTIFICATIONS,
      aiMessages: MOCK_AI_MESSAGES,
      privacy: {
        profileVisibility: 'everyone',
        whoCanMessage: 'everyone',
        blockedUserIds: [],
        mutedUserIds: [],
        twoFactorEnabled: false,
      },

      login: (email) => set({ currentUser: MOCK_USERS['u1'] }), // Mock login as u1
      logout: () => set({ currentUser: null }),

      likePost: (postId) => set((state) => ({
        posts: state.posts.map(p => 
          p.id === postId 
            ? { ...p, likedByMe: !p.likedByMe, likes: p.likedByMe ? p.likes - 1 : p.likes + 1 }
            : p
        )
      })),

      addPost: (content, media) => set((state) => {
        if (!state.currentUser) return state;
        const newPost: Post = {
          id: `p_${Date.now()}`,
          authorId: state.currentUser.id,
          content,
          media,
          likes: 0,
          comments: 0,
          shares: 0,
          createdAt: new Date().toISOString()
        };
        return { posts: [newPost, ...state.posts] };
      }),

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

      toggleCommunityMembership: (communityId) => set((state) => ({
        communities: state.communities.map(c => 
          c.id === communityId ? { ...c, isMember: !c.isMember, members: c.isMember ? c.members - 1 : c.members + 1 } : c
        )
      })),

      viewStory: (storyId) => set((state) => {
        const uid = state.currentUser?.id;
        return {
          stories: state.stories.map(s => 
            s.id === storyId
              ? { ...s, viewed: true, viewerIds: uid && !s.viewerIds.includes(uid) ? [...s.viewerIds, uid] : s.viewerIds }
              : s
          )
        };
      }),

      reactToStory: (storyId, emoji) => set((state) => {
        const uid = state.currentUser?.id;
        if (!uid) return state;
        return {
          stories: state.stories.map(s => 
            s.id === storyId
              ? { ...s, reactions: [...s.reactions.filter(r => r.userId !== uid), { userId: uid, emoji }] }
              : s
          )
        };
      }),

      addStory: (story) => set((state) => {
        if (!state.currentUser) return state;
        const newStory: Story = {
          id: `s_${Date.now()}`,
          authorId: state.currentUser.id,
          mediaUrl: story.mediaUrl,
          type: story.type,
          textContent: story.textContent,
          backgroundGradient: story.backgroundGradient,
          viewed: true,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          viewerIds: [],
          reactions: [],
        };
        return { stories: [newStory, ...state.stories] };
      }),

      toggleEventRsvp: (eventId, status) => set((state) => {
        const uid = state.currentUser?.id;
        if (!uid) return state;
        return {
          events: state.events.map(e => {
            if (e.id !== eventId) return e;
            const alreadySame = e.rsvpStatus === status;
            const attendeeIds = status === 'going'
              ? (alreadySame ? e.attendeeIds.filter(id => id !== uid) : [...e.attendeeIds.filter(id => id !== uid), uid])
              : e.attendeeIds.filter(id => id !== uid);
            const interestedIds = status === 'interested'
              ? (alreadySame ? e.interestedIds.filter(id => id !== uid) : [...e.interestedIds.filter(id => id !== uid), uid])
              : e.interestedIds.filter(id => id !== uid);
            return { ...e, attendeeIds, interestedIds, rsvpStatus: alreadySame ? null : status };
          })
        };
      }),

      toggleSaveProduct: (productId) => set((state) => ({
        products: state.products.map(p => p.id === productId ? { ...p, savedByMe: !p.savedByMe } : p)
      })),

      markNotificationRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),

      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      })),

      sendAIMessage: (content) => set((state) => {
        const userMsg: AIMessage = { id: `ai_${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() };
        const reply: AIMessage = {
          id: `ai_${Date.now() + 1}`,
          role: 'assistant',
          content: "Here's a thought: break that into smaller steps and I can help you draft each one. Want me to start?",
          createdAt: new Date(Date.now() + 500).toISOString(),
        };
        return { aiMessages: [...state.aiMessages, userMsg, reply] };
      }),

      updatePrivacy: (patch) => set((state) => ({ privacy: { ...state.privacy, ...patch } })),

      toggleBlockUser: (userId) => set((state) => ({
        privacy: {
          ...state.privacy,
          blockedUserIds: state.privacy.blockedUserIds.includes(userId)
            ? state.privacy.blockedUserIds.filter(id => id !== userId)
            : [...state.privacy.blockedUserIds, userId]
        }
      })),

      toggleMuteUser: (userId) => set((state) => ({
        privacy: {
          ...state.privacy,
          mutedUserIds: state.privacy.mutedUserIds.includes(userId)
            ? state.privacy.mutedUserIds.filter(id => id !== userId)
            : [...state.privacy.mutedUserIds, userId]
        }
      })),
    }),
    {
      name: 'yortalks-storage',
      partialize: (state) => ({ currentUser: state.currentUser }) // Only persist current user session
    }
  )
);
