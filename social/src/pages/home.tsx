import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import StoriesRow from '@/components/feed/StoriesRow';
import { CreatePost, PostCardMemo as PostCard } from '@/components/feed/Post';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';
import { 
  Sparkles, TrendingUp, Compass, Shield, Gamepad2, Play, Pause, 
  Volume2, CheckCircle2, Gift, Calendar, ArrowLeftRight, Flame, Radio, Award, Star, Loader2
} from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SteamTradeModal } from '@/components/steam/SteamTradeModal';
import { FeedSkeleton } from '@/components/ui/Skeletons';

const DAILY_QUESTS = [
  { id: 'q1', text: 'Engage with 3 Creator Posts', progress: 3, total: 3, done: true, xp: 150 },
  { id: 'q2', text: 'Share a 24h Story Update', progress: 1, total: 1, done: true, xp: 200 },
  { id: 'q3', text: 'Initiate or Complete a Steam Trade', progress: 1, total: 1, done: true, xp: 250 },
];

const TRENDING_SOUNDTRACKS = [
  { id: 't1', title: 'Night City Synthwave', artist: 'Cyberpulse', duration: '2:45', plays: '1.4M' },
  { id: 't2', title: 'Multiverse Resonance (Lo-Fi)', artist: 'Aura Collective', duration: '3:12', plays: '890K' },
  { id: 't3', title: 'Hyperdrive Overload', artist: 'Glitch Mobius', duration: '1:58', plays: '2.1M' },
];

const STEAM_LIVE_FRIENDS = [
  {
    id: 'f1',
    name: 'Valkyrie_Zero',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    game: 'Cyberpunk 2077: Phantom Liberty',
    activity: 'Night City — In Combat',
    status: 'in-game',
    level: 92
  },
  {
    id: 'f2',
    name: 'Kai_Takahashi',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    game: 'Counter-Strike 2',
    activity: 'Competitive Match — Mirage (14-11)',
    status: 'in-game',
    level: 78
  },
  {
    id: 'f3',
    name: 'Elena_Rostova',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
    game: 'Live Stream Broadcast',
    activity: '🔴 Streaming UI Shaders Live',
    status: 'streaming',
    level: 84
  }
];

const FEED_GENRES = [
  { id: 'all', label: '✨ For You' },
  { id: 'trending', label: '🔥 Trending' },
  { id: 'tech', label: '🤖 Tech & AI' },
  { id: 'gaming', label: '🎮 Gaming' },
  { id: 'music', label: '🎵 Music' },
  { id: 'art', label: '🎨 Design & 3D' },
  { id: 'fashion', label: '👗 Fashion' },
  { id: 'motorsport', label: '🏎️ Speed & Sim' },
  { id: 'science', label: '🔬 Science & Space' },
  { id: 'lifestyle', label: '☕ Lifestyle & Crafts' },
] as const;

function matchesPostGenre(post: any, author: any, genre: string): boolean {
  if (genre === 'all') return true;
  if (genre === 'trending') return (post.likes > 20000 || post.resonanceScore > 0.88);
  const text = `${post.content} ${author?.bio || ''} ${author?.username || ''}`.toLowerCase();
  switch (genre) {
    case 'tech':
      return text.includes('ai') || text.includes('tensor') || text.includes('model') || text.includes('shader') || text.includes('webgpu') || text.includes('neural') || text.includes('gpu') || text.includes('fpga') || text.includes('hft') || text.includes('rust') || text.includes('code');
    case 'gaming':
      return text.includes('game') || text.includes('esport') || text.includes('radiant') || text.includes('clutch') || text.includes('scrim') || text.includes('fightstick') || text.includes('arcade') || text.includes('vct') || text.includes('steam');
    case 'music':
      return text.includes('music') || text.includes('synth') || text.includes('techno') || text.includes('sitar') || text.includes('drum') || text.includes('beat') || text.includes('audio') || text.includes('sound') || text.includes('track') || text.includes('rave') || text.includes('raga') || text.includes('oud') || text.includes('kora');
    case 'art':
      return text.includes('3d') || text.includes('unreal') || text.includes('render') || text.includes('sculpt') || text.includes('anime') || text.includes('mecha') || text.includes('art') || text.includes('design') || text.includes('illustration') || text.includes('typography');
    case 'fashion':
      return text.includes('fashion') || text.includes('couture') || text.includes('sneaker') || text.includes('apparel') || text.includes('textile') || text.includes('wearable') || text.includes('denim') || text.includes('cashmere');
    case 'motorsport':
      return text.includes('car') || text.includes('drift') || text.includes('race') || text.includes('racing') || text.includes('rotary') || text.includes('sim') || text.includes('dyno') || text.includes('lap') || text.includes('turbo') || text.includes('aero');
    case 'science':
      return text.includes('quantum') || text.includes('space') || text.includes('cern') || text.includes('physics') || text.includes('bio') || text.includes('protein') || text.includes('submersible') || text.includes('nebula') || text.includes('telescope') || text.includes('astronomy') || text.includes('neuro');
    case 'lifestyle':
      return text.includes('coffee') || text.includes('tea') || text.includes('chocolat') || text.includes('blade') || text.includes('steel') || text.includes('watch') || text.includes('horology') || text.includes('wood') || text.includes('furniture') || text.includes('roast');
    default:
      return true;
  }
}

export default function Home() {
  const [, setLocation] = useLocation();
  const posts = useAppStore((state) => state.posts);
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const followUser = useAppStore((state) => state.followUser);
  const unfollowUser = useAppStore((state) => state.unfollowUser);
  const isInitializing = useAppStore((state) => state.isInitializing);

  const [questsClaimed, setQuestsClaimed] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Suggested users list
  const suggestedUsers = useMemo(() => {
    return Object.values(users)
      .filter((u) => u.id !== currentUser?.id && !currentUser?.followingIds?.includes(u.id))
      .slice(0, 4);
  }, [users, currentUser]);

  const handleToggleFollow = (userId: string) => {
    if (!currentUser) return;
    const isFollowing = currentUser.followingIds?.includes(userId);
    if (isFollowing) {
      unfollowUser(userId);
    } else {
      followUser(userId);
      sounds.playPop();
    }
  };

  const handleClaimDailyQuests = () => {
    if (questsClaimed) return;
    sounds.playChime();
    triggerConfetti();
    setQuestsClaimed(true);
    toast.success('Claimed +600 Steam XP & 100 Steam Points! Leveled up to Level 6!');
  };

  const togglePlayTrack = (trackId: string) => {
    sounds.playPop();
    setPlayingTrackId(prev => prev === trackId ? null : trackId);
  };

  // Filter posts by selected genre
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const author = users[p.authorId];
      return matchesPostGenre(p, author, selectedGenre);
    });
  }, [posts, users, selectedGenre]);

  // Infinite scroll pagination
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const visiblePosts = useMemo(() => filteredPosts.slice(0, visibleCount), [filteredPosts, visibleCount]);
  const hasMore = visibleCount < filteredPosts.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredPosts.length));
  }, [filteredPosts.length]);

  // Auto-load when sentinel enters viewport
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <div className="max-w-[1100px] mx-auto px-0 sm:px-4 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Feed Column (Instagram Style) */}
          <main className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4">
            
            {/* Stories Row Container */}
            <div className="surface-1 rounded-none sm:rounded-3xl p-4 border-y sm:border border-border/40 overflow-hidden shadow-sm">
              <StoriesRow />
            </div>

            {/* Create Post Inline Box */}
            <div className="surface-1 rounded-none sm:rounded-3xl border-y sm:border border-border/40 shadow-sm">
              <CreatePost />
            </div>

            {/* Feed Genre Category Chips */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-1">
              {FEED_GENRES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGenre(g.id);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border shrink-0",
                    selectedGenre === g.id
                      ? "bg-primary text-primary-foreground border-primary glow-neon-primary font-bold shadow-md"
                      : "surface-1 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Feed Stream — Paginated */}
            {isInitializing ? (
              <FeedSkeleton count={3} />
            ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {posts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center surface-1 rounded-3xl border border-border/40">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Compass className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">Your feed is empty</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-4 font-serif">
                    Follow creators and join communities to see posts here.
                  </p>
                  <Link href="/explore">
                    <Button className="rounded-2xl font-bold text-xs glow-neon-primary">
                      <Compass className="w-4 h-4 mr-2" /> Discover Creators
                    </Button>
                  </Link>
                </div>
              )}
              {visiblePosts.map((post, i) => (
                <ScrollReveal
                  key={post.id}
                  delay={Math.min(i * 0.04, 0.25)}
                  className="surface-1 rounded-none sm:rounded-3xl border-y sm:border border-border/40 overflow-hidden shadow-sm hover:border-border/60 transition-colors"
                >
                  <PostCard post={post} />
                </ScrollReveal>
              ))}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-6">
                  <Button
                    variant="ghost"
                    onClick={loadMore}
                    className="rounded-2xl font-bold text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading more...
                  </Button>
                </div>
              )}
            </motion.div>
            )}
          </main>

          {/* Right Sidebar (Desktop Steam & Instagram Fusion Suite) */}
          <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 space-y-5 sticky top-6 h-fit">
            
            {/* Current User Steam Card */}
            {currentUser && (
              <div className="p-4 rounded-3xl surface-1 border border-border/40 shadow-sm flex items-center justify-between">
                <Link href={`/profile/${currentUser.id}`} className="flex items-center gap-3 min-w-0 group">
                  <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-cyan-400 via-primary to-rose-500">
                    <Avatar className="w-12 h-12 border-2 border-background">
                      <AvatarImage src={currentUser.avatarUrl} />
                      <AvatarFallback className="font-display font-bold">{currentUser.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-sm truncate group-hover:underline text-foreground">{currentUser.displayName}</h4>
                    <p className="text-xs text-muted-foreground font-mono truncate">@{currentUser.username}</p>
                  </div>
                </Link>
                {currentUser.verified && (
                  <div className="level-badge text-xs shrink-0 shadow-sm">
                    <Shield className="w-3.5 h-3.5" /> Verified
                  </div>
                )}
              </div>
            )}

            {/* Steam Live Friends Rich Presence Widget */}
            <div className="surface-1 rounded-3xl p-5 border border-border/40 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-cyan-400" /> Steam Friends Online ({STEAM_LIVE_FRIENDS.length})
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>

              <div className="space-y-3.5">
                {STEAM_LIVE_FRIENDS.map((friend) => (
                  <div key={friend.id} className="flex items-start justify-between gap-2.5 p-2 rounded-2xl hover:bg-muted/40 transition-colors">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="relative shrink-0 mt-0.5">
                        <Avatar className="w-8 h-8 border border-border/40">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
                          friend.status === 'streaming' ? "bg-rose-500 animate-pulse" : "bg-emerald-400"
                        )} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground truncate">{friend.name}</span>
                          <span className="text-[0.6rem] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">Lv.{friend.level}</span>
                        </div>
                        <p className="text-[0.68rem] text-emerald-400 font-mono truncate font-medium">{friend.activity}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex gap-1">
                      <SteamTradeModal
                        partnerName={friend.name}
                        partnerAvatar={friend.avatar}
                        trigger={
                          <Button size="icon" variant="ghost" className="w-7 h-7 rounded-lg text-muted-foreground hover:text-emerald-400">
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Quests & Steam XP Rewards Widget */}
            <div className="surface-1 rounded-3xl p-5 border border-border/40 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" /> Daily Quests
                </h3>
                <span className="text-xs font-mono font-bold text-amber-400">3/3 Complete</span>
              </div>

              <div className="space-y-2.5 mb-4">
                {DAILY_QUESTS.map((quest) => (
                  <div key={quest.id} className="flex items-center justify-between text-xs font-sans">
                    <span className="flex items-center gap-2 text-foreground/90 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {quest.text}
                    </span>
                    <span className="font-mono text-[0.65rem] text-amber-400 font-bold shrink-0">+{quest.xp} XP</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleClaimDailyQuests}
                disabled={questsClaimed}
                className={cn(
                  "w-full rounded-2xl font-bold text-xs h-10 shadow-md",
                  questsClaimed ? "bg-muted text-muted-foreground" : "glow-neon-primary bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                )}
              >
                {questsClaimed ? '✅ +600 XP Reward Claimed' : '🎁 Claim All Daily Rewards (+600 XP)'}
              </Button>
            </div>

            {/* Trending Audio / Soundtrack Visualizer */}
            <div className="surface-1 rounded-3xl p-5 border border-border/40 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" /> Trending Audio Tracks
                </h3>
                <span className="text-[0.65rem] font-mono text-muted-foreground">Top Reels Sound</span>
              </div>

              <div className="space-y-3">
                {TRENDING_SOUNDTRACKS.map((track) => {
                  const isPlaying = playingTrackId === track.id;

                  return (
                    <div
                      key={track.id}
                      onClick={() => togglePlayTrack(track.id)}
                      className={cn(
                        "p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group",
                        isPlaying ? "border-primary bg-primary/10" : "border-border/40 bg-muted/20 hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-primary" />}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs truncate text-foreground leading-tight">{track.title}</h5>
                          <p className="text-[0.65rem] text-muted-foreground font-mono truncate">{track.artist} · {track.plays} reels</p>
                        </div>
                      </div>

                      {isPlaying && (
                        <div className="flex items-center gap-0.5 shrink-0 pr-1">
                          {[12, 20, 8, 16, 24].map((h, i) => (
                            <motion.span
                              key={i}
                              animate={{ height: [4, h, 4] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 bg-primary rounded-full"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Suggested Creators & Circles */}
            <div className="surface-1 rounded-3xl p-5 border border-border/40 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Suggested for you
                </h3>
                <Link href="/explore" className="text-xs font-mono font-bold text-primary hover:underline">
                  See all
                </Link>
              </div>

              <div className="space-y-4">
                {suggestedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3">
                    <Link href={`/profile/${user.id}`} className="flex items-center gap-3 min-w-0 group flex-1">
                      <Avatar className="w-9 h-9 border border-border/40 shrink-0">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="font-display font-bold text-xs">{user.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs truncate group-hover:underline text-foreground">{user.displayName}</h5>
                        <p className="text-[0.68rem] text-muted-foreground font-mono truncate">@{user.username}</p>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFollow(user.id)}
                      className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 h-8 px-3 rounded-xl shrink-0"
                    >
                      Follow
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer / Meta Links */}
            <div className="px-2 text-[0.68rem] text-muted-foreground/60 font-mono space-y-2">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <Link href="/explore" className="hover:underline">Explore</Link> •
                <Link href="/articles" className="hover:underline">Articles</Link> •
                <Link href="/communities" className="hover:underline">Circles</Link> •
                <Link href="/marketplace" className="hover:underline">Marketplace</Link> •
                <Link href="/points-shop" className="hover:underline">Points Shop</Link>
              </div>
              <p>© 2026 Yor Talks Multiverse • Instagram + Steam Hybrid</p>
            </div>

          </aside>

        </div>
      </div>
    </div>
  );
}
