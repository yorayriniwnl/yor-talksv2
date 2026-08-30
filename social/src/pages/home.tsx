import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  ArrowRight,
  AlertCircle,
  CircleCheck,
  Compass,
  Globe2,
  Loader2,
  Radio,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  Star,
  TrendingUp,
  Users,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { useAppStore, type Post } from '@/lib/store';
import StoriesRow from '@/components/feed/StoriesRow';
import NotesTray from '@/components/feed/NotesTray';
import { CreatePost, PostCardMemo as PostCard } from '@/components/feed/Post';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { staggerContainer } from '@/lib/motion';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { FeedSkeleton } from '@/components/ui/Skeletons';
import { CONTENT_CATEGORIES, resolveContentCategory, type ContentCategory } from '@/lib/content-category';
import { Metric, SignalLabel, StatusBadge } from '@/components/system';

type OrbitMode = 'close' | 'discover' | 'favorites' | 'build';
type Topic = 'all' | 'ideas' | 'tech' | 'creative' | 'culture' | 'play';

const TOPICS: Array<{ id: Topic; label: string }> = [
  { id: 'all', label: 'Everything' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'tech', label: 'Tech' },
  { id: 'creative', label: 'Creative' },
  { id: 'culture', label: 'Culture' },
  { id: 'play', label: 'Play' },
];

const BUILD_TERMS = ['build', 'project', 'launch', 'prototype', 'collaborat', 'looking for', 'need a', 'join me', 'create', 'research'];

function matchesTopic(post: Post, authorText: string, topic: Topic) {
  if (topic === 'all') return true;
  const text = `${post.content} ${authorText}`.toLowerCase();
  const terms: Record<Exclude<Topic, 'all'>, string[]> = {
    ideas: ['idea', 'think', 'question', 'learn', 'future', 'imagine', 'why'],
    tech: ['tech', 'code', 'ai', 'model', 'software', 'developer', 'engineering', 'robot'],
    creative: ['art', 'design', 'film', 'music', 'photo', 'fashion', 'write', 'creator'],
    culture: ['culture', 'language', 'food', 'dance', 'literature', 'community', 'campus'],
    play: ['game', 'esport', 'sport', 'chess', 'arcade', 'stream', 'tournament'],
  };
  return terms[topic].some((term) => text.includes(term));
}

function postStrength(post: Post) {
  return post.likes + post.comments * 2 + post.shares * 2 + post.reposts * 3;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const cachedPosts = useAppStore((state) => state.posts);
  const feedPostIds = useAppStore((state) => state.feedPostIds);
  const posts = useMemo(() => {
    const byId = new Map(cachedPosts.map((post) => [post.id, post]));
    return feedPostIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
  }, [cachedPosts, feedPostIds]);
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const worldPreferences = useAppStore((state) => state.worldPreferences);
  const communities = useAppStore((state) => state.communities);
  const liveStreams = useAppStore((state) => state.liveStreams);
  const followUser = useAppStore((state) => state.followUser);
  const unfollowUser = useAppStore((state) => state.unfollowUser);
  const loadFeed = useAppStore((state) => state.loadFeed);
  const loadMoreFeed = useAppStore((state) => state.loadMoreFeed);
  const favoriteCreatorIds = useAppStore((state) => state.favoriteCreatorIds);
  const hasMoreFeed = useAppStore((state) => state.hasMoreFeed);
  const feedLoading = useAppStore((state) => state.feedLoading);
  const feedError = useAppStore((state) => state.feedError);
  const feedMode = useAppStore((state) => state.feedMode);
  const stories = useAppStore((state) => state.stories);

  const [mode, setMode] = useState<OrbitMode>(() => feedMode === 'for_you' ? 'discover' : feedMode === 'favorites' ? 'favorites' : 'close');
  const [topic, setTopic] = useState<Topic>('all');
  const [contentCategory, setContentCategory] = useState<ContentCategory | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(8);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const displayName = currentUser?.displayName || currentUser?.username || 'there';
  const firstName = displayName.split(/\s+/)[0];
  const followingIds = currentUser?.followingIds ?? [];

  const suggestedUsers = useMemo(
    () => Object.values(users)
      .filter((user) => user.id !== currentUser?.id && !followingIds.includes(user.id))
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 3),
    [currentUser?.id, followingIds, users],
  );

  const filteredPosts = useMemo(() => {
    let result = [...posts];
    if (mode === 'discover') {
      result.sort((a, b) => postStrength(b) - postStrength(a));
    } else if (mode === 'build') {
      result = result
        .filter((post) => BUILD_TERMS.some((term) => post.content.toLowerCase().includes(term)))
        .sort((a, b) => postStrength(b) - postStrength(a));
    }

    if (mode === 'discover' && topic !== 'all') {
      result = result.filter((post) => {
        const author = users[post.authorId];
        return matchesTopic(post, `${author?.bio ?? ''} ${author?.username ?? ''}`, topic);
      });
    }

    if (contentCategory !== 'all') {
      result = result.filter((post) => resolveContentCategory(post.contentCategory).value === contentCategory);
    }
    return result;
  }, [contentCategory, currentUser?.id, followingIds, mode, posts, topic, users]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length || hasMoreFeed;
  const strongestSignals = [...posts].sort((a, b) => postStrength(b) - postStrength(a)).slice(0, 3);
  const activeWorlds = [...communities].sort((a, b) => Number(b.isMember) - Number(a.isMember) || b.members - a.members).slice(0, 3);
  const activeLiveStreams = liveStreams.filter((stream) => stream.status === 'live').slice(0, 2);

  const modeToFeed = (nextMode: OrbitMode) => nextMode === 'discover' || nextMode === 'build'
    ? 'for_you' as const
    : nextMode === 'favorites'
      ? 'favorites' as const
      : 'following' as const;

  const changeMode = (nextMode: OrbitMode) => {
    setMode(nextMode);
    setTopic('all');
    setContentCategory('all');
    setVisibleCount(8);
    void loadFeed(modeToFeed(nextMode));
  };

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadFeed(modeToFeed(mode));
      setVisibleCount(8);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadFeed, mode]);

  const openNextChapter = useCallback(async () => {
    if (visibleCount < filteredPosts.length) {
      setVisibleCount((count) => count + 8);
      return;
    }
    if (!hasMoreFeed || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      await loadMoreFeed();
      setVisibleCount((count) => count + 8);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filteredPosts.length, hasMoreFeed, isLoadingMore, loadMoreFeed, visibleCount]);

  const toggleFollow = (userId: string) => {
    if (followingIds.includes(userId)) unfollowUser(userId);
    else {
      followUser(userId);
      sounds.playPop();
    }
  };

  return (
    <div className="orbit-page operator-home">
      <div className="orbit-wrap">
        <header className="home-feed-heading operator-home__header">
          <div className="home-identity operator-home__identity">
            {currentUser && (
              <Avatar className="home-identity__avatar">
                <AvatarImage src={currentUser.avatarUrl} alt="" />
                <AvatarFallback>{firstName.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <SignalLabel>{worldPreferences.worldLabel} / Your daily circle</SignalLabel>
              <h2>{greeting()}, <em>{firstName}.</em></h2>
              <p>A little inspiration. A good conversation. Something worth sharing.</p>
            </div>
          </div>
          <div className="home-heading-actions">
            {activeLiveStreams.length > 0 && (
              <Link href="/live" className="home-live-link"><StatusBadge status="busy">{activeLiveStreams.length} live</StatusBadge></Link>
            )}
            <Link href="/dream" className="home-dream-link" aria-label="Start a project">
              <WandSparkles className="h-4 w-4" />
              <span>Start a project</span>
            </Link>
          </div>
        </header>

        <div className="orbit-layout">
          <section aria-label="Your social feed" className="orbit-stream">
        <nav className="home-feed-tabs" aria-label="Choose a feed" role="tablist" onKeyDown={(event) => {
          const modes: OrbitMode[] = ['close', 'discover', 'favorites', 'build'];
          const current = modes.indexOf(mode);
          const next = event.key === 'ArrowRight' ? (current + 1) % 4 : event.key === 'ArrowLeft' ? (current + 3) % 4 : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : -1;
          if (next < 0) return;
          event.preventDefault();
          changeMode(modes[next]);
          event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
        }}>
          <button id="feed-close" aria-controls="feed-posts" type="button" role="tab" tabIndex={mode === 'close' ? 0 : -1} onClick={() => changeMode('close')} aria-selected={mode === 'close'} className={cn(mode === 'close' && 'is-active')}>
            <Users className="h-4 w-4" />
            <span>Following</span>
          </button>
          <button id="feed-discover" aria-controls="feed-posts" type="button" role="tab" tabIndex={mode === 'discover' ? 0 : -1} onClick={() => changeMode('discover')} aria-selected={mode === 'discover'} className={cn(mode === 'discover' && 'is-active')}>
            <Compass className="h-4 w-4" />
            <span>For you</span>
          </button>
          <button id="feed-favorites" aria-controls="feed-posts" type="button" role="tab" tabIndex={mode === 'favorites' ? 0 : -1} onClick={() => changeMode('favorites')} aria-selected={mode === 'favorites'} className={cn(mode === 'favorites' && 'is-active')}>
            <Star className="h-4 w-4" /><span>Favorites</span>
          </button>
          <button id="feed-build" aria-controls="feed-posts" type="button" role="tab" tabIndex={mode === 'build' ? 0 : -1} onClick={() => changeMode('build')} aria-selected={mode === 'build'} className={cn(mode === 'build' && 'is-active')}>
            <Zap className="h-4 w-4" />
            <span>Build</span>
          </button>
        </nav>

            <div className={cn('home-moments', stories.length === 0 && 'home-moments--quiet')}>
            <section className="orbit-now-card home-stories-card operator-panel" aria-label="Stories" data-empty={stories.length === 0}>
              {stories.length > 0 && (
              <div className="home-section-heading">
                <div><h2>Little moments, lately</h2></div>
                <Link href="/pulse">See all <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
              )}
              <StoriesRow compactEmpty />
            </section>
            <NotesTray compactEmpty />
            </div>

            <section className="orbit-composer-card home-composer-card operator-panel" aria-label="Share a thought">
              <CreatePost compact />
            </section>

            <div className="home-feed-toolbar">
              <div>
                <strong>{mode === 'close' ? 'From your people' : mode === 'discover' ? 'Worth a closer look' : mode === 'favorites' ? `Your favorites${favoriteCreatorIds.length ? ` · ${favoriteCreatorIds.length}` : ''}` : 'Made in the open'}</strong>
              </div>
              <div className="home-feed-toolbar__actions">
                <button type="button" aria-label="Filter your feed" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-controls="home-feed-filters">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>{filtersOpen ? 'Hide filters' : 'Tune'}</span>
                </button>
                <button type="button" onClick={refresh} disabled={isRefreshing} aria-label="Refresh feed">
                  <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                  <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {mode === 'discover' && (
              <div className="orbit-topic-row" aria-label="Discovery topics">
                {TOPICS.map((item) => (
                  <button type="button" key={item.id} onClick={() => { setTopic(item.id); setVisibleCount(8); }} aria-pressed={topic === item.id} className={cn(topic === item.id && 'is-active')}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {(filtersOpen || contentCategory !== 'all') && (
              <div id="home-feed-filters" className="home-filter-stack">
                <span>Filter by content category</span>
                <div className="orbit-topic-row" aria-label="Filter by content category">
                  <button
                    type="button"
                    onClick={() => { setContentCategory('all'); setVisibleCount(8); }}
                    aria-pressed={contentCategory === 'all'}
                    className={cn(contentCategory === 'all' && 'is-active')}
                  >
                    ✨ All categories
                  </button>
                  {CONTENT_CATEGORIES.map((category) => (
                    <button
                      type="button"
                      key={category.value}
                      onClick={() => { setContentCategory(category.value); setVisibleCount(8); }}
                      aria-pressed={contentCategory === category.value}
                      className={cn(contentCategory === category.value && 'is-active')}
                    >
                      {category.emoji} {category.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div id="feed-posts" role="tabpanel" aria-labelledby={`feed-${mode}`} aria-busy={feedLoading} className="home-feed-results">
            {feedError && (
              <div role="alert" className="home-feed-error">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div><strong>Let’s try that again.</strong><p>{feedError}</p></div>
                <Button variant="outline" onClick={refresh} disabled={feedLoading}>Retry feed</Button>
              </div>
            )}

            {feedLoading && visiblePosts.length === 0 ? (
              <FeedSkeleton count={3} />
            ) : visiblePosts.length > 0 ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="orbit-post-list">
                {visiblePosts.map((post, index) => (
                  <ScrollReveal key={post.id} delay={Math.min(index * 0.035, 0.2)} className="orbit-post-card">
                    <PostCard post={post} />
                  </ScrollReveal>
                ))}
              </motion.div>
            ) : !feedError ? (
              <section className="orbit-empty operator-panel">
                {mode === 'build' ? <Zap className="h-7 w-7" /> : mode === 'favorites' ? <Star className="h-7 w-7" /> : <Compass className="h-7 w-7" />}
                <h2>{contentCategory !== 'all' || topic !== 'all' ? 'No posts match these filters.' : mode === 'build' ? 'Every great project starts somewhere.' : mode === 'favorites' ? 'Keep your favorite people close.' : 'Your people are out there.'}</h2>
                <p>{contentCategory !== 'all' || topic !== 'all' ? 'Try another category or clear your filters to see more.' : mode === 'build' ? 'Share what you’re making and find someone to make it with.' : mode === 'favorites' ? 'Add favorites from a profile to bring their latest posts here.' : 'Follow a few creators and their latest posts will appear here.'}</p>
                {(contentCategory !== 'all' || topic !== 'all') && <Button variant="outline" onClick={() => { setContentCategory('all'); setTopic('all'); }}>Clear filters</Button>}
                <Link href={mode === 'build' || mode === 'favorites' ? (mode === 'build' ? '/dream' : '/explore') : '/explore'} className="yor-primary-action">
                  {mode === 'build' ? 'Start a project' : mode === 'favorites' ? 'Discover creators' : 'Find your people'} <ArrowRight className="h-4 w-4" />
                </Link>
              </section>
            ) : null}

            {visiblePosts.length > 0 && !feedError && !feedLoading && (
              <section className="orbit-complete operator-panel">
                <span><CircleCheck className="h-5 w-5" /></span>
                <div>
                  <strong>{hasMore ? 'You reached the end of this set.' : 'You are all caught up.'}</strong>
                  <p>{hasMore ? 'Load another set when you are ready.' : 'Come back later for new posts from your network.'}</p>
                </div>
                {hasMore ? (
                  <Button variant="outline" onClick={() => void openNextChapter()} disabled={isLoadingMore}>{isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{isLoadingMore ? 'Loading…' : 'Load more posts'}</Button>
                ) : (
                  <Link href="/pulse">See what is moving <ArrowRight className="h-3.5 w-3.5" /></Link>
                )}
              </section>
            )}
            </div>
          </section>

          <aside className="orbit-rail">
            {currentUser && (
              <section className="orbit-profile-card operator-panel operator-home-profile">
                <div className="operator-home-profile__cover" aria-hidden="true"><span /><span /><span /></div>
                <div className="operator-home-profile__identity">
                  <Link href={`/profile/${currentUser.id}`}>
                    <span className="operator-home-profile__avatar">
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarImage src={currentUser.avatarUrl} alt="" />
                        <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <i aria-label="Online" />
                    </span>
                    <div><strong>{displayName}</strong><span>@{currentUser.username}</span></div>
                  </Link>
                  <Link href={`/profile/${currentUser.id}`} aria-label="Open your profile"><ArrowRight className="h-4 w-4" /></Link>
                </div>
                <div className="operator-home-profile__metrics">
                  <Metric value={currentUser.followers.toLocaleString()} label="Followers" />
                  <Metric value={currentUser.following.toLocaleString()} label="Following" />
                  <Metric value={favoriteCreatorIds.length.toLocaleString()} label="Favorites" />
                </div>
              </section>
            )}

            {activeLiveStreams.length > 0 && (
              <section className="orbit-rail-card orbit-live-card operator-panel">
                <div className="orbit-section-heading">
                  <div><span>Happening now</span><h2>Live in your orbit</h2></div>
                  <Radio className="h-4 w-4" />
                </div>
                <div className="orbit-live-list">
                  {activeLiveStreams.map((stream) => (
                    <Link href="/live" key={stream.id}>
                      <span className="orbit-live-list__cover">{stream.coverUrl ? <img src={stream.coverUrl} alt="" /> : <Radio className="h-4 w-4" />}</span>
                      <div><strong>{stream.title}</strong><small><span className="home-live-link__dot" /> {stream.viewers.toLocaleString()} watching</small></div>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
                <Link href="/live" className="orbit-rail-link">Open live room <ArrowRight className="h-3.5 w-3.5" /></Link>
              </section>
            )}

            {activeLiveStreams.length === 0 && (
              <section className="orbit-rail-card operator-panel">
                <div className="orbit-section-heading">
                  <div><span>From this feed</span><h2>Conversation starters</h2></div>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="orbit-signal-list">
                  {strongestSignals.map((post, index) => {
                    const author = users[post.authorId];
                    return (
                      <Link href={`/post/${post.id}`} key={post.id}>
                        <span>0{index + 1}</span>
                        <div><strong>{author?.displayName || author?.username || 'Someone'}</strong><p>{post.content}</p></div>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    );
                  })}
                  {strongestSignals.length === 0 && <p className="orbit-rail-empty">Signals appear as your network starts talking.</p>}
                </div>
                <Link href="/pulse" className="orbit-rail-link">Open Pulse <ArrowRight className="h-3.5 w-3.5" /></Link>
              </section>
            )}

            {suggestedUsers.length === 0 && (
            <section className="orbit-rail-card operator-panel">
              <div className="orbit-section-heading">
                <div><span>Shared gravity</span><h2>Worlds near you</h2></div>
                <Globe2 className="h-4 w-4" />
              </div>
              <div className="orbit-world-list">
                {activeWorlds.map((world) => (
                  <Link href={`/communities/${world.id}`} key={world.id}>
                    <span>{world.coverUrl ? <img src={world.coverUrl} alt="" /> : world.name.charAt(0)}</span>
                    <div><strong>{world.name}</strong><small>{world.members.toLocaleString()} people · {world.category}</small></div>
                  </Link>
                ))}
                {activeWorlds.length === 0 && <p className="orbit-rail-empty">Join a world and it will stay close here.</p>}
              </div>
              <Link href="/worlds" className="orbit-rail-link">Explore all worlds <ArrowRight className="h-3.5 w-3.5" /></Link>
            </section>
            )}

            {suggestedUsers.length > 0 && (
              <section className="orbit-rail-card operator-panel">
                <div className="orbit-section-heading">
                  <div><span>New gravity</span><h2>People at your edge</h2></div>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="orbit-people-list">
                  {suggestedUsers.map((user) => (
                    <div key={user.id}>
                      <Link href={`/profile/${user.id}`}>
                        <Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl} alt="" /><AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback></Avatar>
                        <span><strong>{user.displayName}</strong><small>@{user.username}</small></span>
                      </Link>
                      <button onClick={() => toggleFollow(user.id)} aria-label={`Follow ${user.displayName}`}>Follow</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="orbit-meta">Yor · {worldPreferences.worldLabel} world · {worldPreferences.timezone} · 2026</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
