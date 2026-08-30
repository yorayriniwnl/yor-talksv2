import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { ArrowUpRight, Compass, Search, Users, Heart, MessageCircle, Play, Loader2, X, Hash, Radio, Layers3 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { api, type BackendPost, type BackendUser } from '@/lib/api-client';
import { mapPost, useAppStore, type Community, type User, type Post } from '@/lib/store';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { OperatorPanel, SectionHeader, SignalLabel } from '@/components/system';
import '@/styles/operator-discovery.css';

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
      aria-label={`Open post: ${post.content.slice(0, 90)}`}
      className={cn('operator-discovery-tile', isLarge && 'operator-discovery-tile--large')}
      data-media={isVideo ? 'video' : firstMedia ? 'image' : 'text'}
    >
      {firstMedia ? (
        isVideo ? (
          <video src={firstMedia} aria-label="Video post" className="operator-discovery-tile__media" muted playsInline preload="metadata" />
        ) : (
          <img src={firstMedia} alt="" className="operator-discovery-tile__media" loading="lazy" />
        )
      ) : (
        <div className="operator-discovery-tile__text">
          <p>{post.content}</p>
        </div>
      )}
      
      <span className="operator-discovery-tile__type">
        {isVideo ? <><Play aria-hidden="true" /> Reel</> : hasMultiple ? <><Layers3 aria-hidden="true" /> Stack</> : <><Radio aria-hidden="true" /> Signal</>}
      </span>

      <div className="operator-discovery-tile__overlay">
        <span><Heart aria-hidden="true" /> {formatCount(post.likes || 0)}</span>
        <span><MessageCircle aria-hidden="true" /> {formatCount(post.comments || 0)}</span>
      </div>
    </motion.button>
  );
}

const EXPLORE_GENRES = [
  { id: 'all', label: 'All signals' },
  { id: 'tech', label: 'AI & tech' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'music', label: 'Music' },
  { id: 'art', label: '3D & design' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'motorsport', label: 'Speed & sim' },
  { id: 'science', label: 'Science' },
  { id: 'lifestyle', label: 'Craft & life' },
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
  const [posts, setPosts] = useState<Post[]>([]);
  const communities = useAppStore((s: any) => s.communities || []) as Community[];
  const currentUser = useAppStore((s: any) => s.currentUser);
  const followUser = useAppStore((s: any) => s.followUser);
  const unfollowUser = useAppStore((s: any) => s.unfollowUser);
  const cachePublicProfiles = useAppStore((s) => s.cachePublicProfiles);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [discoveryError, setDiscoveryError] = useState('');
  const [discoveryAttempt, setDiscoveryAttempt] = useState(0);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    let active = true;
    setDiscoveryLoading(true);
    setDiscoveryError('');
    void Promise.all([api.getFeed('for_you'), api.searchUsers('')]).then(([feed, profiles]) => {
      if (!active) return;
      setPosts(feed.data.map((post) => mapPost(post, currentUser?.id)));
      cachePublicProfiles(profiles);
      for (const id of new Set(feed.data.map((post) => post.authorId))) void loadUserProfile(id);
    }).catch(() => {
      if (active) setDiscoveryError('Discovery could not load. Please try again.');
    }).finally(() => { if (active) setDiscoveryLoading(false); });
    return () => { active = false; };
  }, [currentUser?.id, cachePublicProfiles, loadUserProfile, discoveryAttempt]);

  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  // Compute feed data filtered by selected genre
  const people = useMemo(() => {
    return Object.values(users)
      .filter(u => u.id !== currentUser?.id && matchesExploreGenre(`${u.displayName} ${u.username} ${u.bio || ''}`, selectedGenre))
      .slice(0, 10);
  }, [currentUser, users, selectedGenre]);

  const visualPosts = useMemo(() => {
    return posts
      .filter(p => matchesExploreGenre(`${p.content} ${users[p.authorId]?.bio || ''}`, selectedGenre))
      .sort((a, b) => Number(Boolean(b.media?.length)) - Number(Boolean(a.media?.length)));
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

  // Search the server's authorized index, not the last visited feed cache.
  useEffect(() => {
    const trimmed = query.trim().toLowerCase();
    setSearchError('');
    if (trimmed.length < 2) { setResults(null); setSearching(false); return; }
    let active = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const apiRes = await api.search(trimmed);
        if (!active) return;
        setResults(apiRes);
        cachePublicProfiles(apiRes.users);
        for (const id of new Set(apiRes.posts.map((post) => post.authorId))) void loadUserProfile(id);
      } catch {
        if (!active) return;
        setResults(null);
        setSearchError('Search is unavailable right now. Your query is still here; try again shortly.');
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query, cachePublicProfiles, loadUserProfile]);

  const handleToggleFollow = (targetId: string) => {
    if (!currentUser) return;
    currentUser.followingIds?.includes(targetId) || currentUser.pendingFollowIds?.includes(targetId) ? unfollowUser(targetId) : followUser(targetId);
  };

  const isSearching = query.trim().length >= 2;

  return (
    <div className="operator-discovery-page">
      <section className="operator-discovery-hero" aria-labelledby="discovery-title">
        <div className="operator-discovery-hero__copy">
          <SignalLabel>Follow your curiosity</SignalLabel>
          <h2 id="discovery-title">Your next <em>good find.</em></h2>
          <p>New perspectives, interesting people, and ideas that stay with you.</p>
        </div>

        <div className="operator-discovery-search" data-focused={isFocused || undefined}>
          <Search aria-hidden="true" />
          <input
            ref={searchInputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-label="Search people and posts"
            placeholder="Search people, ideas, and posts"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X aria-hidden="true" />
            </button>
          ) : (
            <kbd aria-hidden="true">/</kbd>
          )}
        </div>

      </section>

      <section aria-label="Discovery results" className="operator-discovery-main">
        {discoveryError && <div role="alert" className="home-feed-error"><p>{discoveryError}</p><Button variant="outline" onClick={() => setDiscoveryAttempt((attempt) => attempt + 1)}>Retry discovery</Button></div>}
        <nav className="operator-discovery-filters" aria-label="Filter discovery by interest">
          {EXPLORE_GENRES.map((genre, index) => (
            <button
              type="button"
              key={genre.id}
              onClick={() => setSelectedGenre(genre.id)}
              aria-pressed={selectedGenre === genre.id}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {genre.label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          {isSearching ? (
            /* ── SEARCH RESULTS STATE ─────────────────────────────────────── */
            <motion.div key="search" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="operator-discovery-search-state">
              {searching ? (
                <OperatorPanel className="operator-discovery-empty">
                  <Loader2 className="operator-discovery-spinner" aria-hidden="true" />
                  <h2>Scanning the network</h2>
                  <p>Looking through people and published signals.</p>
                </OperatorPanel>
              ) : searchError ? (
                <OperatorPanel className="operator-discovery-empty" role="alert"><Search aria-hidden="true" /><h2>Let’s try that again.</h2><p>{searchError}</p><button type="button" onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}>Search again</button></OperatorPanel>
              ) : !results || (!results.users.length && !results.posts.length) ? (
                <OperatorPanel className="operator-discovery-empty">
                  <Search aria-hidden="true" />
                  <h2>No match for “{query}”</h2>
                  <p>Try a username, a specific skill, or a shorter topic.</p>
                  <button type="button" onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}>Clear search</button>
                </OperatorPanel>
              ) : (
                <div className="operator-discovery-results">
                  <SectionHeader
                    eyebrow="Network search"
                    title={`Results for “${query.trim()}”`}
                    description={`${results.users.length} people · ${results.posts.length} posts`}
                    headingLevel={2}
                  />
                  <div className="operator-discovery-results__grid">
                    {results.users.length > 0 && (
                      <OperatorPanel className="operator-discovery-result-group">
                        <div className="operator-discovery-result-group__title"><Users aria-hidden="true" /><h3>People</h3></div>
                        <div className="operator-discovery-people-list">
                          {results.users.map(user => (
                            <button type="button" key={user.id} onClick={() => setLocation(`/profile/${user.id}`)}>
                              <Avatar><AvatarImage src={user.avatarUrl || ''} /><AvatarFallback>{(user.fullName || user.username).charAt(0)}</AvatarFallback></Avatar>
                              <span><strong>{user.fullName || user.username}</strong><small>@{user.username}</small></span>
                              <ArrowUpRight aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </OperatorPanel>
                    )}
                    {results.posts.length > 0 && (
                      <OperatorPanel className="operator-discovery-result-group">
                        <div className="operator-discovery-result-group__title"><Radio aria-hidden="true" /><h3>Posts</h3></div>
                        <div className="operator-discovery-post-results">
                          {results.posts.map(post => {
                            const author = users[post.authorId];
                            return (
                              <button type="button" key={post.id} onClick={() => setLocation(`/post/${post.id}`)}>
                                <span><strong>{author?.displayName || 'Unknown creator'}</strong><small>Open signal <ArrowUpRight aria-hidden="true" /></small></span>
                                <p>{post.content}</p>
                              </button>
                            );
                          })}
                        </div>
                      </OperatorPanel>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* ── DISCOVERY DEFAULT STATE ──────────────────────────────────── */
            <motion.div key="discovery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="operator-discovery-sections">
              <section className="operator-discovery-dispatches">
                <SectionHeader
                  eyebrow="Look a little closer"
                  title="Made to catch your eye."
                  description={`${visualPosts.length} posts and perspectives in this discovery set.`}
                  action={<Button type="button" variant="ghost" onClick={() => { setSelectedGenre('all'); setQuery(''); }}>Reset view <ArrowUpRight aria-hidden="true" /></Button>}
                />
                
                {discoveryLoading ? <OperatorPanel className="operator-discovery-empty" role="status"><Loader2 className="operator-discovery-spinner" aria-hidden="true" /><p>Finding something interesting…</p></OperatorPanel> : visualPosts.length > 0 ? (
                  <>
                    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="operator-discovery-grid">
                      {visibleGridPosts.map((post, i) => {
                        const isLarge = i === 0 || i === 7 || i === 14;
                        return <ExploreGridItem key={post.id} post={post} isLarge={isLarge} onClick={() => setLocation(`/post/${post.id}`)} />;
                      })}
                    </motion.div>
                    {hasMoreGrid && (
                      <div ref={gridLoadMoreRef} className="operator-discovery-load-more" role="status">
                        <Loader2 aria-hidden="true" /> Indexing more dispatches
                      </div>
                    )}
                  </>
                ) : (
                  <OperatorPanel className="operator-discovery-empty">
                    <Compass aria-hidden="true" />
                    <h3>A new perspective is around the corner.</h3>
                    <p>Try another interest or search for a creator you know.</p>
                    <button type="button" onClick={() => setSelectedGenre('all')}>Show all posts</button>
                  </OperatorPanel>
                )}
              </section>

              {topics.length > 0 && <section className="operator-discovery-radar">
                <SectionHeader eyebrow="Conversation starters" title="A few things on people’s minds." description="Popular hashtags in the posts loaded here." />
                <div className="operator-discovery-topic-grid">
                  {topics.map((topic, index) => (
                    <motion.button key={topic.name} whileTap={{ scale: 0.98 }} onClick={() => setQuery(topic.name)} className="operator-discovery-topic">
                      <span className="operator-discovery-topic__rank">{String(index + 1).padStart(2, '0')}</span>
                      <Hash aria-hidden="true" />
                      <span><strong>{topic.name}</strong><small>{topic.count} {topic.count === 1 ? 'post' : 'posts'}</small></span>
                      <ArrowUpRight aria-hidden="true" />
                    </motion.button>
                  ))}
                </div>
              </section>}

              {(people.length > 0 || rooms.length > 0) && (
                <section className="operator-discovery-directory">
                  {people.length > 0 && (
                    <OperatorPanel className="operator-discovery-directory__panel">
                      <SectionHeader eyebrow="People" title="Creators to know" description="Profiles adjacent to the channel you are scanning." />
                      <div className="operator-discovery-creator-list">
                        {people.map((person: any) => {
                          const isFollowed = currentUser?.followingIds?.includes(person.id);
                          const isFollowPending = currentUser?.pendingFollowIds?.includes(person.id);
                          const displayName = person.displayName || person.username || 'User';
                          return (
                            <article key={person.id} className="operator-discovery-creator">
                              <Link href={`/profile/${person.id}`} className="operator-discovery-creator__identity">
                                <Avatar><AvatarImage src={person.avatarUrl} /><AvatarFallback>{displayName.charAt(0)}</AvatarFallback></Avatar>
                                <span><strong>{displayName}</strong><small>@{person.username}</small></span>
                              </Link>
                              <p>{person.bio || 'Building and sharing on Yor Talks.'}</p>
                              <button type="button" data-following={isFollowed || isFollowPending || undefined} onClick={() => handleToggleFollow(person.id)}>
                                {isFollowed ? 'Following' : isFollowPending ? 'Requested' : 'Follow'}
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    </OperatorPanel>
                  )}

                  {rooms.length > 0 && (
                    <OperatorPanel className="operator-discovery-directory__panel">
                      <SectionHeader eyebrow="Worlds" title="Communities in motion" description="Open rooms with an active member signal." />
                      <div className="operator-discovery-world-list">
                        {rooms.map((room, index) => (
                          <Link key={room.id} href={`/communities/${room.id}`} className="operator-discovery-world">
                            <img src={room.coverUrl} alt="" />
                            <span className="operator-discovery-world__index">{String(index + 1).padStart(2, '0')}</span>
                            <span><strong>{room.name}</strong><small>{room.category} · {room.members.toLocaleString()} members</small></span>
                            <ArrowUpRight aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    </OperatorPanel>
                  )}
                </section>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
