import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type BackendCommunity, type BackendCommunityDiscussion } from '@/lib/api-client';
import { useAppStore, mapCommunity, type Community } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, Compass, Plus, Sparkles, MessageSquare, Pin, ArrowLeft, 
  ThumbsUp, Award, Shield, Flame, Check, Share2, Tag, Gamepad2 
} from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Link, useLocation, useRoute } from 'wouter';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { ProtectedMediaImage } from '@/lib/protected-media';

interface ForumThread {
  id: string;
  title: string;
  content?: string;
  author: string;
  authorAvatar: string;
  isPinned?: boolean;
  isDev?: boolean;
  repliesCount: number;
  likes: number;
  timestamp: string;
  tag: string;
  awards: { icon: string; count: number; name: string }[];
}

function mapDiscussion(discussion: BackendCommunityDiscussion): ForumThread {
  return {
    id: discussion.id,
    title: discussion.title,
    content: discussion.content,
    author: discussion.author.fullName || discussion.author.username,
    authorAvatar: discussion.author.avatarUrl || '',
    repliesCount: discussion.repliesCount,
    likes: discussion.likes,
    timestamp: new Date(discussion.createdAt).toLocaleString(),
    tag: discussion.tag,
    awards: [],
  };
}

/* Legacy fixture retained only for reference; live discussions are API-backed.
const FORUM_THREADS: Record<string, ForumThread[]> = {
  default: [
    {
      id: 'thread-1',
      title: '📌 [Official Announcement] Yor Talks 2026: Empowering India’s Next Generation of Creators & Gamers',
      author: 'Ayush Roy',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      isPinned: true,
      isDev: true,
      repliesCount: 142,
      likes: 580,
      timestamp: '2 hours ago',
      tag: 'Announcements',
      awards: [{ icon: '💎', count: 48, name: 'Koh-i-Noor' }, { icon: '✨', count: 32, name: 'Diya Light' }, { icon: '🚀', count: 24, name: 'ISRO Supernova' }]
    },
    {
      id: 'thread-2',
      title: 'Bengaluru AI & WebGL Developers: Building Spatial UI on Low-Bandwidth Networks',
      author: 'Aditi Singh',
      authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
      repliesCount: 64,
      likes: 240,
      timestamp: '4 hours ago',
      tag: 'Tech & AI',
      awards: [{ icon: '🤯', count: 18, name: 'Mind Blown' }]
    },
    {
      id: 'thread-3',
      title: 'BGMI & Valorant South Asia: Looking for 2 Players for the Mumbai Pro Qualifier (Conqueror/Immortal)',
      author: 'Rohan Verma',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
      repliesCount: 38,
      likes: 112,
      timestamp: '1 day ago',
      tag: 'Esports Squad',
      awards: [{ icon: '🔥', count: 14, name: 'Hype' }]
    },
    {
      id: 'thread-4',
      title: 'Showcase your customized Yor Avatar Frames, Hologram Badges, and Wallpapers here!',
      author: 'Anya',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
      repliesCount: 120,
      likes: 490,
      timestamp: '2 days ago',
      tag: 'Community',
      awards: [{ icon: '👑', count: 34, name: 'Royal' }, { icon: '💎', count: 42, name: 'Gems' }]
    }
  ]
};
*/

// Interactive Steam Community Hub Detail Page
function CommunityHubDetail({ communityId }: { communityId: string }) {
  const [, setLocation] = useLocation();
  const [community, setCommunity] = useState<Community | null>(null);
  const [communityState, setCommunityState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [communityRetry, setCommunityRetry] = useState(0);
  const [membershipPending, setMembershipPending] = useState(false);
  const membershipPendingRef = useRef(false);
  const mounted = useRef(true);
  const [activeTab, setActiveTab] = useState<'discussions' | 'announcements' | 'members'>('discussions');
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState(false);
  const [threadsRetry, setThreadsRetry] = useState(0);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [publishingThread, setPublishingThread] = useState(false);
  const publishingThreadRef = useRef(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [threadTag, setThreadTag] = useState('General');
  const [contentRating, setContentRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const applyCommunity = (record: BackendCommunity) => {
    const mapped = mapCommunity(record, useAppStore.getState().currentUser?.id);
    setCommunity(mapped);
    useAppStore.setState((state) => ({ communities: [...state.communities.filter((item) => item.id !== mapped.id), mapped] }));
  };

  useEffect(() => {
    let active = true;
    setCommunityState('loading');
    api.getCommunity(encodeURIComponent(communityId))
      .then((record) => {
        if (!active) return;
        applyCommunity(record);
        setCommunityState('ready');
      })
      .catch((error) => {
        if (active) setCommunityState(error instanceof ApiError && error.status === 404 ? 'missing' : 'error');
      });
    return () => { active = false; };
  }, [communityId, communityRetry]);

  const canonicalId = community?.id;
  useEffect(() => {
    if (!canonicalId) return;
    let active = true;
    setLoadingThreads(true);
    setThreadsError(false);
    setThreads([]);
    api.getCommunityDiscussions(canonicalId)
      .then((items) => { if (active) setThreads(items.map(mapDiscussion)); })
      .catch(() => { if (active) setThreadsError(true); })
      .finally(() => { if (active) setLoadingThreads(false); });
    return () => { active = false; };
  }, [canonicalId, threadsRetry]);

  if (communityState !== 'ready' || !community) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-bold font-display mb-2">{communityState === 'loading' ? 'Loading circle…' : communityState === 'missing' ? 'Circle not found' : 'Could not load this circle'}</h1>
          {communityState === 'loading' ? <p role="status">Getting this community’s details…</p> : <div className="space-y-4">
            <p>{communityState === 'missing' ? 'This community is unavailable or you do not have access to it.' : 'Check your connection and try again.'}</p>
            <div className="flex justify-center gap-3">{communityState === 'error' && <Button onClick={() => setCommunityRetry((value) => value + 1)}>Retry circle</Button>}<Button variant="outline" onClick={() => setLocation('/communities')}>Return to Communities</Button></div>
          </div>}
        </div>
      </div>
    );
  }

  const handleMembership = async () => {
    if (membershipPendingRef.current) return;
    membershipPendingRef.current = true;
    setMembershipPending(true);
    try {
      const updated = community.isMember ? await api.leaveCommunity(community.id) : await api.joinCommunity(community.id);
      if (!mounted.current) return;
      applyCommunity(updated);
      sounds.playPop();
    } catch (error) {
      if (mounted.current) toast.error(error instanceof Error ? error.message : 'Could not update community membership');
    } finally {
      membershipPendingRef.current = false;
      if (mounted.current) setMembershipPending(false);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadTitle.trim() || publishingThreadRef.current) return;
    publishingThreadRef.current = true;
    setPublishingThread(true);

    try {
      const created = await api.createCommunityDiscussion(community.id, { title: threadTitle.trim(), content: threadContent.trim(), tag: threadTag, contentRating });
      if (!mounted.current) return;
      sounds.playChime();
      triggerConfetti();
      setThreads(prev => [mapDiscussion(created), ...prev]);
      setNewThreadOpen(false);
      setThreadTitle('');
      setThreadContent('');
      setContentRating(DEFAULT_CONTENT_RATING);
      toast.success('Discussion thread published to Community Hub!');
    } catch (error) {
      if (mounted.current) toast.error(error instanceof Error ? error.message : 'Could not publish discussion');
    } finally {
      publishingThreadRef.current = false;
      if (mounted.current) setPublishingThread(false);
    }
  };

  const handleGiveAward = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const liked = await api.likeCommunityDiscussion(community.id, threadId);
      if (!mounted.current) return;
      sounds.playPop();
      triggerConfetti();
      setThreads(prev => prev.map(thread => thread.id === threadId ? mapDiscussion(liked) : thread));
      toast.success('Discussion liked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not like discussion');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Community Header Banner */}
      <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-muted">
        <ProtectedMediaImage src={community.coverUrl} alt={community.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-black/40" />

        <div className="absolute top-4 left-4 sm:left-6 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/communities')}
            className="rounded-full bg-black/60 backdrop-blur-md border-white/20 text-white hover:bg-black/80"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> All Circles
          </Button>
        </div>

        <div className="absolute bottom-6 left-4 sm:left-6 right-4 sm:right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-20">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-xs font-mono font-bold text-primary mb-2">
              <Sparkles className="w-3.5 h-3.5" /> {community.category}
            </span>
            <h1 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight">{community.name}</h1>
            <div className="flex items-center gap-4 text-xs font-mono text-zinc-300 mt-2">
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" /> {community.members.toLocaleString()} Members</span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-muted-foreground" /> Live presence appears when members connect</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => void handleMembership()}
              disabled={membershipPending}
              className={cn("rounded-2xl font-bold text-xs px-6 h-11 shadow-lg", community.isMember ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "glow-neon-primary bg-primary text-primary-foreground")}
            >
              {community.isMember ? <Check className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {membershipPending ? 'Updating membership…' : community.isMember ? 'Joined Circle' : 'Join Circle'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* About Card */}
        <div className="surface-1 p-5 rounded-3xl border border-border/40 font-sans">
          <p className="text-sm font-serif text-foreground/90 leading-relaxed">{community.description}</p>
        </div>

        {/* Steam Community Forum Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeTab === 'discussions' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('discussions')}
              className="rounded-xl font-bold text-xs px-4"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Discussions{!loadingThreads && !threadsError && ` (${threads.length})`}
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'announcements' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('announcements')}
              className="rounded-xl font-bold text-xs px-4"
            >
              <Pin className="w-3.5 h-3.5 mr-1.5" /> Announcements
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'members' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('members')}
              className="rounded-xl font-bold text-xs px-4"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" /> Clan Roster
            </Button>
          </div>

          <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!community.isMember} className="rounded-xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Start Discussion
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl glass-heavy border border-border/60 font-sans">
              <DialogHeader>
                <DialogTitle className="font-display font-bold text-xl">Create Discussion Thread</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateThread} className="space-y-4">
                <div className="space-y-1.5">
                  <Input
                    aria-label="Discussion title"
                    value={threadTitle}
                    onChange={(e) => setThreadTitle(e.target.value)}
                    placeholder="Thread title or question…"
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Textarea
                    aria-label="Discussion details"
                    value={threadContent}
                    onChange={(e) => setThreadContent(e.target.value)}
                    placeholder="Provide details, guides, or squad recruitment info…"
                    rows={4}
                    className="rounded-xl resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <select
                    aria-label="Discussion category"
                    value={threadTag}
                    onChange={(e) => setThreadTag(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-xs font-medium"
                  >
                    <option value="General">General Discussion</option>
                    <option value="Guides">Guides & Strategy</option>
                    <option value="LFG / Clans">Looking for Group</option>
                    <option value="Trading">Trading & Marketplace</option>
                  </select>
                </div>
                <ContentRatingSelect id="discussion-content-rating" value={contentRating} onChange={setContentRating} />
                <DialogFooter>
                  <Button type="submit" disabled={publishingThread} className="rounded-xl font-bold text-xs px-6">{publishingThread ? 'Publishing…' : 'Publish Thread'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Discussion Threads List */}
        {activeTab !== 'members' && loadingThreads && <div role="status" className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">Loading discussions…</div>}
        {activeTab !== 'members' && !loadingThreads && threadsError && <div role="alert" className="rounded-2xl border border-border/60 p-8 text-center"><p className="mb-3 text-sm">Discussions could not be loaded.</p><Button variant="outline" onClick={() => setThreadsRetry((value) => value + 1)}>Retry discussions</Button></div>}
        {activeTab === 'discussions' && <div className="space-y-3">
          {!loadingThreads && !threadsError && !threads.length && <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">No discussions yet. Start the first conversation for this world.</div>}
          {!loadingThreads && !threadsError && threads.map((thread) => (
            <motion.div
              layout
              key={thread.id}
              className={cn(
                "p-4 sm:p-5 rounded-3xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer",
                thread.isPinned
                  ? "bg-primary/5 border-primary/30 hover:border-primary/50"
                  : "surface-1 border-border/40 hover:border-border"
              )}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <Avatar className="w-10 h-10 shrink-0 border border-border/40">
                  <AvatarImage src={thread.authorAvatar} />
                  <AvatarFallback>{thread.author.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {thread.isPinned && (
                      <span className="text-[0.62rem] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Pinned
                      </span>
                    )}
                    {thread.isDev && (
                      <span className="text-[0.62rem] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        Developer
                      </span>
                    )}
                    <span className="text-[0.65rem] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded-md bg-muted/60">
                      {thread.tag}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {thread.title}
                  </h3>
                  {thread.content && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{thread.content}</p>}

                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mt-1">
                    <span>By <strong className="text-foreground">{thread.author}</strong></span>
                    <span>·</span>
                    <span>{thread.timestamp}</span>
                  </div>

                  {/* Steam Awards Display */}
                  {thread.awards.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {thread.awards.map((award, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[0.65rem] font-mono text-amber-300">
                          <span>{award.icon}</span>
                          <span className="font-bold">{award.count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Thread Stats & Award Button */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{thread.repliesCount}</span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleGiveAward(thread.id, e)}
                  className="rounded-xl font-bold text-xs h-8 px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Like
                </Button>
              </div>
            </motion.div>
          ))}
        </div>}
        {activeTab === 'announcements' && !loadingThreads && !threadsError && (
          <div className="space-y-3">
            {threads.filter((thread) => thread.tag === 'Announcements').length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">No official announcements have been posted in this world.</div>
            ) : threads.filter((thread) => thread.tag === 'Announcements').map((thread) => (
              <article key={thread.id} className="surface-1 rounded-2xl border border-border/40 p-5">
                <p className="text-[0.65rem] font-mono uppercase tracking-wider text-primary">{thread.timestamp}</p>
                <h3 className="mt-2 font-display text-lg font-bold">{thread.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Published by {thread.author}.</p>
              </article>
            ))}
          </div>
        )}
        {activeTab === 'members' && (
          <div className="surface-1 rounded-2xl border border-border/40 p-8 text-center">
            <Users className="mx-auto h-8 w-8 text-primary" />
            <h3 className="mt-3 font-display text-lg font-bold">{community.members.toLocaleString()} members</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Member identities are protected by the world’s privacy rules. Join the circle to participate in its discussions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const COMMUNITY_GENRES = [
  { id: 'all', label: '🌟 All Circles' },
  { id: 'tech', label: '🤖 AI & Tech' },
  { id: 'gaming', label: '🎮 Gaming & Clans' },
  { id: 'music', label: '🎵 Music & Audio' },
  { id: 'art', label: '🎨 3D & Design' },
  { id: 'fashion', label: '👗 Fashion' },
  { id: 'motorsport', label: '🏎️ Speed & Sim' },
  { id: 'science', label: '🔬 Science & Space' },
  { id: 'lifestyle', label: '☕ Crafts & Lifestyle' },
] as const;

function matchesCommunityGenre(community: any, genre: string): boolean {
  if (genre === 'all') return true;
  const text = `${community.name} ${community.description} ${community.category}`.toLowerCase();
  switch (genre) {
    case 'tech':
      return text.includes('tech') || text.includes('ai') || text.includes('tensor') || text.includes('hardware') || text.includes('robot') || text.includes('silicon');
    case 'gaming':
      return text.includes('gaming') || text.includes('esport') || text.includes('clan') || text.includes('scrim') || text.includes('arcade') || text.includes('duel');
    case 'music':
      return text.includes('music') || text.includes('audio') || text.includes('synth') || text.includes('sound') || text.includes('acoustic') || text.includes('techno');
    case 'art':
      return text.includes('art') || text.includes('design') || text.includes('3d') || text.includes('anime') || text.includes('visual');
    case 'fashion':
      return text.includes('fashion') || text.includes('textile') || text.includes('couture') || text.includes('wearable');
    case 'motorsport':
      return text.includes('motor') || text.includes('race') || text.includes('drift') || text.includes('sim') || text.includes('aero');
    case 'science':
      return text.includes('science') || text.includes('quantum') || text.includes('space') || text.includes('biotech') || text.includes('astronomy');
    case 'lifestyle':
      return text.includes('tea') || text.includes('coffee') || text.includes('lifestyle') || text.includes('craft') || text.includes('wood') || text.includes('bladesmith');
    default:
      return true;
  }
}

export default function Communities() {
  const [, params] = useRoute<{ id: string }>('/communities/:id');
  const communityId = params?.id;

  const communities = useAppStore((s) => s.communities);
  const joinCommunity = useAppStore((s) => (s as any).joinCommunity || s.toggleCommunityMembership);
  const leaveCommunity = useAppStore((s) => (s as any).leaveCommunity || s.toggleCommunityMembership);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // If URL matches `/communities/:id`, render the interactive Steam Community Hub & Forum
  if (communityId) {
    return <CommunityHubDetail key={communityId} communityId={communityId} />;
  }

  const yourCircles = communities.filter(c => c.isMember);
  const discoverCircles = communities.filter(c => !c.isMember && matchesCommunityGenre(c, selectedGenre));

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Circles & Communities</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Connect around shared passions & clan discussions</p>
        </div>
        <div className="level-badge">
          <Users className="w-3.5 h-3.5" /> {yourCircles.length} Joined
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        <section>
          <div className="showcase-section-title mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3>Your Circles ({yourCircles.length})</h3>
          </div>
          
          {yourCircles.length === 0 ? (
            <div className="surface-1 rounded-3xl p-10 text-center border border-dashed border-border/60">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <h4 className="font-display font-bold text-lg mb-1">No circles joined yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Explore the communities below and join your first circle to enter discussion forums.</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {yourCircles.map(community => (
                <motion.div key={community.id} variants={staggerItem} className="surface-1 rounded-3xl overflow-hidden flex flex-col border border-border/40 hover:border-primary/40 transition-all duration-300 group shadow-sm">
                  <div className="h-36 bg-muted relative shrink-0 overflow-hidden">
                    <ProtectedMediaImage src={community.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-3 right-3 text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                      {community.category}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1 justify-between">
                    <div>
                      <Link href={`/communities/${community.id}`}>
                        <h3 className="font-display font-bold text-lg leading-tight mb-1 hover:underline cursor-pointer group-hover:text-primary transition-colors">{community.name}</h3>
                      </Link>
                      <p className="text-xs font-serif text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{community.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{community.members.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild size="sm" className="rounded-xl font-bold text-xs glow-neon-primary bg-primary">
                          <Link href={`/communities/${community.id}`}>
                            Enter Hub
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => leaveCommunity(community.id)} className="rounded-xl font-bold text-xs border-border/60 hover:bg-destructive/10 hover:text-destructive">
                          Leave
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        <section>
          <div className="showcase-section-title mb-4">
            <Compass className="w-4 h-4 text-accent" />
            <h3>Discover Circles</h3>
          </div>

          {/* Genre Category Pills */}
          <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
            {COMMUNITY_GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGenre(g.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border shrink-0",
                  selectedGenre === g.id
                    ? "bg-primary text-primary-foreground border-primary glow-neon-primary font-bold shadow-md"
                    : "surface-1 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>

          {discoverCircles.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono">No new circles found in this genre.</p>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {discoverCircles.map(community => (
                <motion.div key={community.id} variants={staggerItem} className="surface-1 rounded-3xl overflow-hidden flex flex-col border border-border/40 hover:border-accent/40 transition-all duration-300 group shadow-sm">
                  <div className="h-36 bg-muted relative shrink-0 overflow-hidden">
                    <ProtectedMediaImage src={community.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-3 right-3 text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                      {community.category}
                    </span>
                  </div>
                  <div className="p-5 flex flex-col flex-1 justify-between">
                    <div>
                      <Link href={`/communities/${community.id}`}>
                        <h3 className="font-display font-bold text-lg leading-tight mb-1 hover:underline cursor-pointer group-hover:text-primary transition-colors">{community.name}</h3>
                      </Link>
                      <p className="text-xs font-serif text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{community.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{community.members.toLocaleString()}</span>
                      </div>
                      <Button size="sm" onClick={() => joinCommunity(community.id)} className="rounded-xl font-bold text-xs glow-neon-primary bg-primary">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Join Circle
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
