import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { ArrowUpRight, Compass, Search, Sparkles, Users, Heart, MessageCircle, Play, Loader2, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { api, type BackendPost, type BackendUser } from '@/lib/api-client';
import { useAppStore, type Community, type User, type Post } from '@/lib/store';
import { cn } from '@/lib/utils';
import StoriesRow from '@/components/feed/StoriesRow';
import { springGentle, tapScale, staggerContainer, staggerItem } from '@/lib/motion';
import { TextReveal } from '@/components/ui/TextReveal';

type SearchResults = { users: BackendUser[]; posts: BackendPost[] };

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(0) + 'K';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function collectTopics(contents: string[]) {
  const counts = new Map<string, number>();
  contents.forEach(content => {
    const matches: string[] = (content.match(/#[\p{L}\p{N}_-]+/gu) ?? []) as string[];
    matches.forEach(match => {
      const name = String(match).slice(1);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function isVideoMedia(url: string) {
  const normalized = url.toLowerCase().split('?')[0];
  return normalized.startsWith('data:video/')
    || normalized.includes('/video/upload/')
    || /\.(mp4|m4v|mov|webm|ogv)$/i.test(normalized);
}

function ExploreGridItem({ post, isLarge, onClick }: { post: Post; isLarge: boolean; onClick: () => void }) {
  const firstMedia = (post.media && post.media.length > 0) ? post.media[0] : null;
  const hasMultiple = post.media && post.media.length > 1;
  const isVideo = firstMedia ? isVideoMedia(firstMedia) : false;

  return (
    <motion.button
      type="button"
      variants={staggerItem}
      onClick={onClick}
      aria-label="Open post"
      className={cn(
        "relative group block w-full cursor-pointer overflow-hidden rounded-xl border border-border/40 bg-muted p-0 text-left hover-lift",
        isLarge ? "col-span-2 row-span-2 card-shine" : "col-span-1 row-span-1"
      )}
    >
      {firstMedia ? (
        isVideo ? (
          <video src={firstMedia} aria-label="Video post" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" muted loop playsInline autoPlay preload="metadata" />
        ) : (
          <img src={firstMedia} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-accent/10">
          <p className={cn("text-muted-foreground font-serif leading-relaxed line-clamp-4", isLarge ? "text-lg" : "text-xs")}>{post.content}</p>
        </div>
      )}
      
      {/* Icon indicators */}
      {isVideo ? (
        <div className="absolute top-3 right-3 z-10 drop-shadow-md"><Play className="w-5 h-5 text-white fill-white" /></div>
      ) : hasMultiple ? (
        <div className="absolute top-3 right-3 z-10 drop-shadow-md">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M3 5H1v16c0 1.1.9 2 2 2h16v-2H3V5z"/></svg>
        </div>
      ) : null}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
        <div className="flex flex-col items-center gap-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <span className="flex items-center gap-2 text-white font-bold text-lg drop-shadow-lg"><Heart className="w-6 h-6 fill-white" /> {formatCount(post.likes || 0)}</span>
          <span className="flex items-center gap-2 text-white font-bold text-lg drop-shadow-lg"><MessageCircle className="w-6 h-6 fill-white" /> {formatCount(post.comments || 0)}</span>
        </div>
      </div>
    </motion.button>
  );
}

const EXPLORE_GENRES = [
  { id: 'all', label: '🌟 All Genres' },
  { id: 'tech', label: '🤖 AI & Tech' },
  { id: 'gaming', label: '🎮 Gaming & Esports' },
  { id: 'music', label: '🎵 Music & Audio' },
  { id: 'art', label: '🎨 3D & Design' },
  { id: 'fashion', label: '👗 Fashion & Wearables' },
  { id: 'motorsport', label: '🏎️ Speed & Sim' },
  { id: 'science', label: '🔬 Science & Space' },
  { id: 'lifestyle', label: '☕ Crafts & Lifestyle' },
] as const;

function matchesExploreGenre(text: string, genre: string): boolean {
  if (genre === 'all') return true;
  const t = text.toLowerCase();
  switch (genre) {
    case 'tech':
      return t.includes('ai') || t.includes('tensor') || t.includes('shader') || t.includes('gpu') || t.includes('neural') || t.includes('code') || t.includes('hft') || t.includes('fpga') || t.includes('webgpu');
    case 'gaming':
      return t.includes('game') || t.includes('esport') || t.includes('clutch') || t.includes('radiant') || t.includes('arcade') || t.includes('fightstick') || t.includes('scrim') || t.includes('steam');
    case 'music':
      return t.includes('music') || t.includes('synth') || t.includes('techno') || t.includes('drum') || t.includes('sitar') || t.includes('audio') || t.includes('sound') || t.includes('rave') || t.includes('kora') || t.includes('oud') || t.includes('beat');
    case 'art':
      return t.includes('3d') || t.includes('unreal') || t.includes('render') || t.includes('anime') || t.includes('mecha') || t.includes('art') || t.includes('sculpt') || t.includes('design') || t.includes('illustration');
    case 'fashion':
      return t.includes('fashion') || t.includes('couture') || t.includes('sneaker') || t.includes('wearable') || t.includes('textile') || t.includes('denim') || t.includes('apparel');
    case 'motorsport':
      return t.includes('car') || t.includes('drift') || t.includes('race') || t.includes('rotary') || t.includes('sim') || t.includes('aero') || t.includes('lap') || t.includes('dyno');
    case 'science':
      return t.includes('quantum') || t.includes('space') || t.includes('physics') || t.includes('bio') || t.includes('protein') || t.includes('nebula') || t.includes('cern') || t.includes('deep-sea');
    case 'lifestyle':
      return t.includes('coffee') || t.includes('tea') || t.includes('steel') || t.includes('watch') || t.includes('wood') || t.includes('chocolat') || t.includes('craft') || t.includes('roast');
    default:
      return true;
  }
}

export default function Explore() {
  const [, setLocation] = useLocation();
  const users = useAppStore((s: any) => s.users || {}) as Record<string, User>;
  const posts = useAppStore((s: any) => s.posts || []) as Post[];
  const communities = useAppStore((s: any) => s.communities || []) as Community[];
  const currentUser = useAppStore((s: any) => s.currentUser);
  const followUser = useAppStore((s: any) => s.followUser);
  const unfollowUser = useAppStore((s: any) => s.unfollowUser);

  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Compute feed data filtered by selected genre
  const people = useMemo(() => {
    return Object.values(users)
      .filter(u => u.id !== currentUser?.id && matchesExploreGenre(`${u.displayName} ${u.username} ${u.bio || ''}`, selectedGenre))
      .slice(0, 10);
  }, [currentUser, users, selectedGenre]);

  const visualPosts = useMemo(() => {
    return posts
      .filter(p => p.media?.length && matchesExploreGenre(`${p.content} ${users[p.authorId]?.bio || ''}`, selectedGenre));
  }, [posts, users, selectedGenre]);

  const GRID_PAGE_SIZE = 18;
  const [visibleGridCount, setVisibleGridCount] = useState(GRID_PAGE_SIZE);
  const gridLoadMoreRef = useRef<HTMLDivElement>(null);

  const visibleGridPosts = useMemo(() => visualPosts.slice(0, visibleGridCount), [visualPosts, visibleGridCount]);
  const hasMoreGrid = visibleGridCount < visualPosts.length;

  const loadMoreGrid = useCallback(() => {
    setVisibleGridCount(prev => Math.min(prev + GRID_PAGE_SIZE, visualPosts.length));
  }, [visualPosts.length]);

  useEffect(() => {
    setVisibleGridCount(GRID_PAGE_SIZE);
  }, [selectedGenre]);

  useEffect(() => {
    const el = gridLoadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting && hasMoreGrid) loadMoreGrid(); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreGrid, loadMoreGrid]);

  const rooms = useMemo(() => {
    return communities
      .filter(c => !c.isMember && matchesExploreGenre(`${c.name} ${c.description} ${c.category}`, selectedGenre))
      .slice(0, 6);
  }, [communities, selectedGenre]);

  const topics = useMemo(() => {
    const allTopics = collectTopics(posts.map(p => p.content));
    if (selectedGenre === 'all') return allTopics;
    return allTopics.filter(t => matchesExploreGenre(t.name, selectedGenre));
  }, [posts, selectedGenre]);

  // Search Debounce with full fallback
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 2) { setResults(null); setSearching(false); return; }
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const apiRes = await api.search(trimmed);
        if (!active) return;
        if (apiRes) {
          setResults(apiRes);
        } else {
          // Client-side search across all creators and posts
          const matchedUsers = Object.values(users).filter(u =>
            u.username.toLowerCase().includes(trimmed) ||
            u.displayName.toLowerCase().includes(trimmed) ||
            (u.bio && u.bio.toLowerCase().includes(trimmed))
          ).slice(0, 12).map(u => ({
            id: u.id,
            username: u.username,
            fullName: u.displayName,
            avatarUrl: u.avatarUrl,
            bio: u.bio || '',
            followers: [],
            following: [],
            isOnline: false,
            createdAt: new Date().toISOString()
          } as any));

          const matchedPosts = posts.filter(p =>
            p.content.toLowerCase().includes(trimmed)
          ).slice(0, 16).map(p => ({
            id: p.id,
            authorId: p.authorId,
            content: p.content,
            images: p.media || [],
            likedBy: [],
            bookmarkedBy: [],
            comments: [],
            shareCount: p.shares,
            createdAt: p.createdAt
          } as any));

          setResults({ users: matchedUsers, posts: matchedPosts });
        }
      } catch {
        if (!active) return;
        const matchedUsers = Object.values(users).filter(u =>
          u.username.toLowerCase().includes(trimmed) ||
          u.displayName.toLowerCase().includes(trimmed) ||
          (u.bio && u.bio.toLowerCase().includes(trimmed))
        ).slice(0, 12).map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.displayName,
          avatarUrl: u.avatarUrl,
          bio: u.bio || '',
          followers: [],
          following: [],
          isOnline: false,
          createdAt: new Date().toISOString()
        } as any));

        const matchedPosts = posts.filter(p =>
          p.content.toLowerCase().includes(trimmed)
        ).slice(0, 16).map(p => ({
          id: p.id,
          authorId: p.authorId,
          content: p.content,
          images: p.media || [],
          likedBy: [],
          bookmarkedBy: [],
          comments: [],
          shareCount: p.shares,
          createdAt: p.createdAt
        } as any));

        setResults({ users: matchedUsers, posts: matchedPosts });
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query, users, posts]);

  const handleToggleFollow = (targetId: string) => {
    if (!currentUser) return;
    currentUser.followingIds?.includes(targetId) || currentUser.pendingFollowIds?.includes(targetId) ? unfollowUser(targetId) : followUser(targetId);
  };

  const isSearching = query.trim().length >= 2 || isFocused;

  return (
    <div className="min-h-screen bg-background pb-20">
      
      {/* ── HERO SEARCH AREA ─────────────────────────────────────────────────── */}
      <div className="relative pt-12 pb-8 px-4 sm:px-6 md:px-8 overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 aurora-bg opacity-40 mix-blend-screen" />
        <div className="absolute inset-0 noise-overlay opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl md:text-5xl tracking-tight mb-3 text-shimmer">
              <TextReveal text="Explore the Multiverse" />
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto mb-8 font-serif">
              Search people, topics, and communities. Discover what's happening across Yor Talks right now.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.2, ...springGentle }}
            className="w-full max-w-2xl relative"
          >
            <div className={cn(
              "absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary opacity-20 blur-xl transition-opacity duration-500",
              isFocused ? "opacity-60" : "opacity-20"
            )} />
            <div className={cn(
              "relative flex items-center glass-heavy bg-card/60 backdrop-blur-xl border-2 rounded-2xl p-2 transition-all duration-300",
              isFocused ? "border-primary/50 shadow-lg" : "border-border/50 shadow-sm"
            )}>
              <Search className={cn("w-6 h-6 ml-3 transition-colors", isFocused ? "text-primary" : "text-muted-foreground")} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={(e) => {
                  // Don't blur if the focus moved to a child of the search results
                  if (e.relatedTarget && e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) return;
                  setIsFocused(false);
                }}
                aria-label="Search people, topics, or communities"
                placeholder="Search @usernames, #hashtags, or communities..."
                className="flex-1 bg-transparent border-0 outline-none px-4 py-3 text-base sm:text-lg font-medium placeholder:text-muted-foreground/50"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="mr-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 mt-8">
        <AnimatePresence mode="wait">
          {isSearching ? (
            /* ── SEARCH RESULTS STATE ─────────────────────────────────────── */
            <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto py-8">
              {searching ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                  <Sparkles className="w-8 h-8 animate-pulse text-primary" />
                  <p className="font-display font-medium text-lg">Searching the multiverse...</p>
                </div>
              ) : !results || (!results.users.length && !results.posts.length) ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                  <Search className="w-10 h-10 opacity-20" />
                  <p className="font-medium text-lg text-foreground/80">No matches found for "{query}"</p>
                  <p className="text-sm">Try searching for a different keyword or username.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {results.users.length > 0 && (
                    <section>
                      <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> People</h3>
                      <div className="grid gap-3 stagger-in">
                        {results.users.map(u => (
                          <button type="button" key={u.id} onClick={() => setLocation(`/profile/${u.id}`)} className="w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/40 hover:bg-muted/50 cursor-pointer transition-all hover-lift">
                            <Avatar className="w-12 h-12 ring-2 ring-primary/20"><AvatarImage src={u.avatarUrl || ''} /><AvatarFallback>{(u.fullName || u.username).charAt(0)}</AvatarFallback></Avatar>
                            <div className="flex-1"><h4 className="font-bold text-base">{u.fullName || u.username}</h4><p className="text-sm text-muted-foreground font-mono">@{u.username}</p></div>
                            <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  {results.posts.length > 0 && (
                    <section>
                      <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Posts</h3>
                      <div className="grid gap-3 stagger-in">
                        {results.posts.map(p => {
                          const author = users[p.authorId];
                          return (
                            <button type="button" key={p.id} onClick={() => setLocation(`/post/${p.id}`)} className="w-full text-left flex flex-col gap-2 p-4 rounded-2xl bg-card border border-border/40 hover:border-accent/40 hover:bg-muted/50 cursor-pointer transition-all hover-lift">
                              <span className="text-sm font-bold text-foreground/80">{author?.displayName || 'Someone'}</span>
                              <p className="text-sm text-muted-foreground line-clamp-2">{p.content}</p>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* ── DISCOVERY DEFAULT STATE ──────────────────────────────────── */
            <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
              
              {/* GENRE CATEGORY PILLS */}
              <section>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {EXPLORE_GENRES.map((g) => (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => setSelectedGenre(g.id)}
                      aria-pressed={selectedGenre === g.id}
                      className={cn(
                        "px-4 py-2 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap border shrink-0",
                        selectedGenre === g.id
                          ? "bg-primary/10 text-primary border-primary/30 font-bold"
                          : "surface-1 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* TOPICS / HASHTAGS ROW */}
              <section>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pt-1 snap-x stagger-in">
                  {topics.map((t, i) => (
                    <motion.button
                      key={t.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setQuery(t.name)}
                      className={cn(
                        "snap-start shrink-0 px-5 py-3 rounded-2xl flex flex-col items-start gap-1 cursor-pointer transition-all border hover-lift press-scale",
                        i === 0 ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border/50 text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="font-display font-bold text-lg leading-none">#{t.name}</span>
                      <span className="text-[0.65rem] uppercase tracking-wider font-semibold opacity-70">{t.count} Posts</span>
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* STORIES */}
              <section>
                <h3 className="font-display font-bold text-xl mb-4 flex items-center gap-2 px-1">Active Stories</h3>
                <StoriesRow />
              </section>

              {/* INSTAGRAM-STYLE MASONRY EXPLORE GRID */}
              <section>
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="font-display font-bold text-xl flex items-center gap-2">Explore Feed</h3>
                  <Button type="button" variant="ghost" onClick={() => { setSelectedGenre('all'); setQuery(''); }} className="text-primary font-bold text-sm h-8 px-3 rounded-full">See All <ArrowUpRight className="w-4 h-4 ml-1" /></Button>
                </div>
                
                {visualPosts.length > 0 ? (
                  <>
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4 auto-rows-[minmax(120px,1fr)] md:auto-rows-[minmax(160px,1fr)] lg:auto-rows-[minmax(200px,1fr)] stagger-in">
                      {visibleGridPosts.map((post, i) => {
                        // Make every 7th item (roughly) span 2x2 for that Instagram Explore layout feel
                        const isLarge = i === 0 || i === 7 || i === 14;
                        return <ExploreGridItem key={post.id} post={post} isLarge={isLarge} onClick={() => setLocation(`/post/${post.id}`)} />;
                      })}
                    </motion.div>
                    {hasMoreGrid && (
                      <div ref={gridLoadMoreRef} className="flex justify-center py-8 col-span-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading more...
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-24 text-center rounded-3xl border border-dashed border-border/50 surface-1">
                    <Compass className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <h4 className="font-display font-bold text-xl mb-1">Nothing to explore yet</h4>
                    <p className="text-muted-foreground text-sm">Follow people and communities to populate the multiverse.</p>
                  </div>
                )}
              </section>

              {/* PEOPLE DISCOVERY */}
              {people.length > 0 && (
                <section className="bg-card/30 rounded-[32px] p-6 border border-border/30">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-bold text-xl flex items-center gap-2"><Users className="w-5 h-5 text-accent" /> Discover People</h3>
                  </div>
                  <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x stagger-in">
                    {people.map((person: any) => {
                      const isFollowed = currentUser?.followingIds?.includes(person.id);
                      const isFollowPending = currentUser?.pendingFollowIds?.includes(person.id);
                      const displayName = person.displayName || person.username || 'User';
                      return (
                        <motion.div key={person.id} whileHover={{ y: -4 }} className="surface-1 p-5 rounded-[24px] min-w-[200px] shrink-0 snap-start flex flex-col items-center text-center border border-border/50 hover:border-accent/30 transition-all shadow-sm hover-lift">
                          <Link href={`/profile/${person.id}`}>
                            <Avatar className="w-20 h-20 mb-3 cursor-pointer ring-2 ring-transparent hover:ring-accent/50 transition-all">
                              <AvatarImage src={person.avatarUrl} /><AvatarFallback className="font-display text-2xl">{displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </Link>
                          <Link href={`/profile/${person.id}`} className="w-full">
                            <h4 className="font-bold text-[0.95rem] truncate w-full cursor-pointer hover:underline">{displayName}</h4>
                          </Link>
                          <p className="text-[0.72rem] text-muted-foreground mb-4 truncate w-full font-mono">@{person.username}</p>
                          <Button 
                            variant={isFollowed || isFollowPending ? 'outline' : 'default'}
                            className={cn("w-full rounded-xl h-9 text-[0.8rem] font-bold", !isFollowed && !isFollowPending && "bg-accent hover:bg-accent/90 text-white")}
                            onClick={() => handleToggleFollow(person.id)}
                          >
                            {isFollowed ? 'Following' : isFollowPending ? 'Requested' : 'Follow'}
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* COMMUNITIES */}
              {rooms.length > 0 && (
                <section className="pb-10">
                  <div className="flex items-center justify-between mb-6 px-1">
                    <h3 className="font-display font-bold text-xl flex items-center gap-2">Trending Communities</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-in">
                    {rooms.map(room => (
                      <Link key={room.id} href={`/communities/${room.id}`}>
                        <motion.div whileHover={{ scale: 1.02 }} className="group relative h-48 rounded-[24px] overflow-hidden cursor-pointer border border-border/20 shadow-md hover-lift card-shine">
                          <img src={room.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                          <div className="absolute inset-0 p-6 flex flex-col justify-end">
                            <h4 className="font-display font-bold text-2xl text-white mb-1 drop-shadow-md">{room.name}</h4>
                            <p className="text-white/80 text-sm font-medium flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[0.65rem] uppercase tracking-wider">{room.category}</span>
                              • {room.members.toLocaleString()} members
                            </p>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
