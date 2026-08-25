import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import StoriesRow from '@/components/feed/StoriesRow';
import { CreatePost, PostCardMemo as PostCard } from '@/components/feed/Post';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
  Sparkles, TrendingUp, Compass, Shield, Loader2
} from 'lucide-react';
import { staggerContainer } from '@/lib/motion';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { FeedSkeleton } from '@/components/ui/Skeletons';

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
  const posts = useAppStore((state) => state.posts);
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const followUser = useAppStore((state) => state.followUser);
  const unfollowUser = useAppStore((state) => state.unfollowUser);
  const isInitializing = useAppStore((state) => state.isInitializing);

  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [feedMode, setFeedMode] = useState<'following' | 'forYou'>('following');

  // Suggested users list
  const suggestedUsers = useMemo(() => {
    return Object.values(users || {})
      .filter((u) => u && u.id !== currentUser?.id && !currentUser?.followingIds?.includes(u.id))
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

  // Filter posts by selected genre
  const filteredPosts = useMemo(() => {
    const list = Array.isArray(posts) ? posts : [];
    if (feedMode === 'following') {
      const followingIds = Array.isArray(currentUser?.followingIds) ? currentUser.followingIds : [];
      if (followingIds.length === 0) return list; // fallback: show all
      return list.filter((p) => p && (followingIds.includes(p.authorId) || p.authorId === currentUser?.id));
    }
    // forYou mode: use genre filter
    return list.filter((p) => {
      if (!p) return false;
      const author = users ? users[p.authorId] : undefined;
      return matchesPostGenre(p, author, selectedGenre);
    });
  }, [posts, users, selectedGenre, feedMode, currentUser]);

  // Infinite scroll pagination
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setVisibleCount(PAGE_SIZE);
    setTimeout(() => setIsRefreshing(false), 800);
  }, []);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const visiblePosts = filteredPosts;
  const hasMore = useAppStore(state => state.hasMoreFeed);

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

  const currentDisplayName = currentUser?.displayName || currentUser?.username || 'User';

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <div className="max-w-[1100px] mx-auto px-0 sm:px-4 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Feed Column (Instagram Style) */}
          <main className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4">
            
            {/* Feed Mode Tabs */}
            <div className="flex items-center border-b border-border/40 mb-1">
              <button
                onClick={() => { setFeedMode('following'); setVisibleCount(PAGE_SIZE); }}
                className={cn(
                  "flex-1 py-3 text-sm font-bold transition-colors relative",
                  feedMode === 'following' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                Following
                {feedMode === 'following' && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-foreground rounded-full" />
                )}
              </button>
              <button
                onClick={() => { setFeedMode('forYou'); setVisibleCount(PAGE_SIZE); }}
                className={cn(
                  "flex-1 py-3 text-sm font-bold transition-colors relative",
                  feedMode === 'forYou' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                For You
                {feedMode === 'forYou' && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            </div>

            {/* Pull to Refresh */}
            <div className="flex justify-center py-2 -mb-2 relative z-10">
              <button
                onClick={handleRefresh}
                className={cn(
                  "mx-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-md transition-all",
                  isRefreshing && "opacity-70 pointer-events-none"
                )}
              >
                <Loader2 className={cn("w-3.5 h-3.5", isRefreshing ? "animate-spin" : "hidden")} />
                {isRefreshing ? 'Refreshing...' : '↑ New posts'}
              </button>
            </div>

            {/* Stories Row Container */}
            <div className="surface-1 rounded-none sm:rounded-3xl p-4 border-y sm:border border-border/40 overflow-hidden shadow-sm">
              <StoriesRow />
            </div>

            {/* Create Post Inline Box */}
            <div className="surface-1 rounded-none sm:rounded-3xl border-y sm:border border-border/40 shadow-sm">
              <CreatePost />
            </div>

            {/* Feed Genre Category Chips */}
            {feedMode === 'forYou' && (
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
                        ? "bg-primary/10 text-primary border-primary/30 font-bold"
                        : "surface-1 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}

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
                      <AvatarFallback className="font-display font-bold">{currentDisplayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-sm truncate group-hover:underline text-foreground">{currentDisplayName}</h4>
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

            {/* Trending Topics */}
            <div className="surface-1 rounded-3xl p-5 border border-border/40 shadow-sm">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-foreground/80 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" /> Trending now
              </h3>
              <div className="flex flex-wrap gap-2">
                {['#IndieGaming', '#CreatorEconomy', '#AIArt', '#Esports', '#PixelArt', '#GameDev', '#RetroGaming', '#Streaming'].map((tag) => (
                  <Link key={tag} href={`/explore?q=${encodeURIComponent(tag)}`} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all">
                    {tag}
                  </Link>
                ))}
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
                {suggestedUsers.map((user) => {
                  const userDisplayName = user.displayName || user.username || 'User';
                  return (
                    <div key={user.id} className="flex items-center justify-between gap-3">
                      <Link href={`/profile/${user.id}`} className="flex items-center gap-3 min-w-0 group flex-1">
                        <Avatar className="w-9 h-9 border border-border/40 shrink-0">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback className="font-display font-bold text-xs">{userDisplayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs truncate group-hover:underline text-foreground">{userDisplayName}</h5>
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
                  );
                })}
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
