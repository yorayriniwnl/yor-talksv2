import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  ArrowRight,
  CircleCheck,
  Compass,
  Globe2,
  Loader2,
  Orbit as OrbitIcon,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { useAppStore, type Post } from '@/lib/store';
import StoriesRow from '@/components/feed/StoriesRow';
import { CreatePost, PostCardMemo as PostCard } from '@/components/feed/Post';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { staggerContainer } from '@/lib/motion';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { FeedSkeleton } from '@/components/ui/Skeletons';

type OrbitMode = 'close' | 'discover' | 'build';
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
  return post.resonanceScore * 100 + Math.log10(Math.max(1, post.likes + 1)) * 12 + post.comments * 0.08;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const posts = useAppStore((state) => state.posts);
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const communities = useAppStore((state) => state.communities);
  const followUser = useAppStore((state) => state.followUser);
  const unfollowUser = useAppStore((state) => state.unfollowUser);
  const loadFeed = useAppStore((state) => state.loadFeed);
  const isInitializing = useAppStore((state) => state.isInitializing);

  const [mode, setMode] = useState<OrbitMode>('close');
  const [topic, setTopic] = useState<Topic>('all');
  const [visibleCount, setVisibleCount] = useState(8);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    if (mode === 'close' && followingIds.length > 0) {
      result = result.filter((post) => followingIds.includes(post.authorId) || post.authorId === currentUser?.id);
    } else if (mode === 'discover') {
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
    return result;
  }, [currentUser?.id, followingIds, mode, posts, topic, users]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;
  const strongestSignals = [...posts].sort((a, b) => postStrength(b) - postStrength(a)).slice(0, 3);
  const activeWorlds = [...communities].sort((a, b) => Number(b.isMember) - Number(a.isMember) || b.members - a.members).slice(0, 3);

  const changeMode = (nextMode: OrbitMode) => {
    setMode(nextMode);
    setTopic('all');
    setVisibleCount(8);
  };

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadFeed();
      setVisibleCount(8);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadFeed]);

  const toggleFollow = (userId: string) => {
    if (followingIds.includes(userId)) unfollowUser(userId);
    else {
      followUser(userId);
      sounds.playPop();
    }
  };

  return (
    <div className="orbit-page">
      <div className="orbit-wrap">
        <section className="home-feed-heading">
          <div>
            <span className="yor-eyebrow"><OrbitIcon className="h-3.5 w-3.5" /> Home · KIIT first world</span>
            <h1>{greeting()}, {firstName}.</h1>
          </div>
          <Link href="/dream" className="home-dream-link">
            <WandSparkles className="h-4 w-4" />
            <span>Dream</span>
          </Link>
        </section>

        <nav className="home-feed-tabs" aria-label="Choose a feed">
          <button onClick={() => changeMode('close')} className={cn(mode === 'close' && 'is-active')}>
            <Users className="h-4 w-4" />
            <span>Following</span>
          </button>
          <button onClick={() => changeMode('discover')} className={cn(mode === 'discover' && 'is-active')}>
            <Compass className="h-4 w-4" />
            <span>For you</span>
          </button>
          <button onClick={() => changeMode('build')} className={cn(mode === 'build' && 'is-active')}>
            <Zap className="h-4 w-4" />
            <span>Build</span>
          </button>
        </nav>

        <div className="orbit-layout">
          <main className="orbit-stream">
            <section className="orbit-now-card home-stories-card">
              <div className="home-section-heading">
                <h2>Stories</h2>
                <Link href="/pulse">See all <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
              <StoriesRow />
            </section>

            <section className="orbit-composer-card home-composer-card">
              <div className="home-section-heading">
                <h2>Create post</h2>
              </div>
              <CreatePost />
            </section>

            <div className="home-feed-toolbar">
              <div>
                <span>Latest posts</span>
                <strong>{mode === 'close' ? 'Following' : mode === 'discover' ? 'For you' : 'Build'}</strong>
              </div>
              <button onClick={refresh} disabled={isRefreshing} aria-label="Refresh feed">
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
              </button>
            </div>

            {mode === 'discover' && (
              <div className="orbit-topic-row" aria-label="Discovery topics">
                {TOPICS.map((item) => (
                  <button key={item.id} onClick={() => { setTopic(item.id); setVisibleCount(8); }} className={cn(topic === item.id && 'is-active')}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {isInitializing ? (
              <FeedSkeleton count={3} />
            ) : visiblePosts.length > 0 ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="orbit-post-list">
                {visiblePosts.map((post, index) => (
                  <ScrollReveal key={post.id} delay={Math.min(index * 0.035, 0.2)} className="orbit-post-card">
                    <PostCard post={post} />
                  </ScrollReveal>
                ))}
              </motion.div>
            ) : (
              <section className="orbit-empty">
                {mode === 'build' ? <Zap className="h-7 w-7" /> : <Compass className="h-7 w-7" />}
                <h2>{mode === 'build' ? 'No builder signals in this orbit yet.' : 'This orbit is quiet.'}</h2>
                <p>{mode === 'build' ? 'Activate a dream and invite the people who can change its outcome.' : 'Follow someone new or discover beyond the people you already know.'}</p>
                <Link href={mode === 'build' ? '/dream' : '/explore'} className="yor-primary-action">
                  {mode === 'build' ? 'Activate a dream' : 'Find people'} <ArrowRight className="h-4 w-4" />
                </Link>
              </section>
            )}

            {visiblePosts.length > 0 && (
              <section className="orbit-complete">
                <span><CircleCheck className="h-5 w-5" /></span>
                <div>
                  <strong>{hasMore ? 'This chapter is complete.' : 'You are caught up.'}</strong>
                  <p>Yor pauses on purpose. Your attention belongs to you.</p>
                </div>
                {hasMore ? (
                  <Button variant="outline" onClick={() => setVisibleCount((count) => count + 8)}>Open next chapter</Button>
                ) : (
                  <Link href="/pulse">See what is moving <ArrowRight className="h-3.5 w-3.5" /></Link>
                )}
              </section>
            )}
          </main>

          <aside className="orbit-rail">
            {currentUser && (
              <section className="orbit-profile-card">
                <Link href={`/profile/${currentUser.id}`}>
                  <Avatar className="h-11 w-11 border border-border">
                    <AvatarImage src={currentUser.avatarUrl} alt="" />
                    <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div><strong>{displayName}</strong><span>@{currentUser.username}</span></div>
                </Link>
                <small>{followingIds.length} chosen connections</small>
              </section>
            )}

            <section className="orbit-rail-card">
              <div className="orbit-section-heading">
                <div><span>Network pulse</span><h2>Signals getting stronger</h2></div>
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
              <Link href="/pulse" className="orbit-rail-link">Enter live Pulse <ArrowRight className="h-3.5 w-3.5" /></Link>
            </section>

            <section className="orbit-rail-card">
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

            {suggestedUsers.length > 0 && (
              <section className="orbit-rail-card">
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
                      <button onClick={() => toggleFollow(user.id)}>Follow</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <p className="orbit-meta">Yor · First world online at KIIT · 2026</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
