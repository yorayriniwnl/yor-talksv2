import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';
import {
  ArrowRight,
  CalendarDays,
  CircleDot,
  Flame,
  Globe2,
  Radio,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { useAppStore, type Post } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type PulseFilter = 'everything' | 'ideas' | 'building' | 'gathering';

const NODE_POSITIONS = [
  [19, 23], [38, 15], [63, 20], [82, 30], [74, 52], [88, 73], [59, 80],
  [37, 70], [17, 79], [10, 52], [30, 43], [55, 39], [48, 58], [70, 68],
] as const;

const BUILD_TERMS = ['build', 'project', 'launch', 'code', 'design', 'create', 'maker', 'prototype', 'research'];
const GATHER_TERMS = ['meet', 'event', 'join', 'club', 'community', 'tonight', 'together', 'session', 'workshop'];
const IDEA_TERMS = ['idea', 'think', 'question', 'imagine', 'learn', 'why', 'what if', 'thought', 'future'];

function signalKind(post: Post): Exclude<PulseFilter, 'everything'> {
  const text = post.content.toLowerCase();
  if (BUILD_TERMS.some((term) => text.includes(term))) return 'building';
  if (GATHER_TERMS.some((term) => text.includes(term))) return 'gathering';
  return IDEA_TERMS.some((term) => text.includes(term)) ? 'ideas' : 'ideas';
}

function signalLabel(kind: Exclude<PulseFilter, 'everything'>) {
  if (kind === 'building') return 'Building';
  if (kind === 'gathering') return 'Gathering';
  return 'Idea';
}

function safeTimeAgo(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return 'recently';
  }
}

export default function Pulse() {
  const posts = useAppStore((state) => state.posts);
  const users = useAppStore((state) => state.users);
  const communities = useAppStore((state) => state.communities);
  const events = useAppStore((state) => state.events);
  const liveStreams = useAppStore((state) => state.liveStreams);
  const loadEvents = useAppStore((state) => state.loadEvents);
  const loadStreams = useAppStore((state) => state.loadStreams);
  const [filter, setFilter] = useState<PulseFilter>('everything');

  useEffect(() => {
    void loadEvents();
    void loadStreams();
  }, [loadEvents, loadStreams]);

  const signals = useMemo(() => {
    return posts
      .map((post) => ({ post, kind: signalKind(post), author: users[post.authorId] }))
      .filter((signal) => filter === 'everything' || signal.kind === filter)
      .sort((a, b) => (b.post.likes + b.post.comments * 2) - (a.post.likes + a.post.comments * 2))
      .slice(0, NODE_POSITIONS.length);
  }, [filter, posts, users]);

  const strongest = signals.slice(0, 5);
  const upcomingEvents = events
    .filter((event) => new Date(event.startsAt).getTime() >= Date.now() - 3_600_000)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);
  const activeStreams = liveStreams.filter((stream) => stream.status === 'live');
  const activeWorlds = [...communities].sort((a, b) => b.members - a.members).slice(0, 3);

  return (
    <div className="yor-product-page pulse-page">
      <div className="yor-product-wrap">
        <header className="pulse-heading">
          <div>
            <span className="yor-eyebrow"><CircleDot className="h-3.5 w-3.5" /> Live network</span>
            <h1>See what is moving <span>before it trends.</span></h1>
            <p>Every point is a real signal from your current network—not a manufactured global counter.</p>
          </div>
          <div className="pulse-heading__status">
            <i />
            <span><strong>{signals.length}</strong> signals in view</span>
            <small>KIIT · first world</small>
          </div>
        </header>

        <div className="pulse-filters" role="tablist" aria-label="Filter the live pulse">
          {([
            ['everything', 'Everything'],
            ['ideas', 'Ideas'],
            ['building', 'Building'],
            ['gathering', 'Gathering'],
          ] as const).map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} className={cn(filter === value && 'is-active')}>
              {value === 'everything' && <Sparkles className="h-3.5 w-3.5" />}
              {value === 'ideas' && <Zap className="h-3.5 w-3.5" />}
              {value === 'building' && <Flame className="h-3.5 w-3.5" />}
              {value === 'gathering' && <Users className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>

        <section className="pulse-layout">
          <div className="pulse-canvas" aria-label="Visual map of active posts">
            <div className="pulse-canvas__grid" aria-hidden="true" />
            <div className="pulse-canvas__glow" aria-hidden="true" />
            {signals.length > 0 && (
              <svg className="pulse-canvas__links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {signals.map((_, index) => {
                  const [x, y] = NODE_POSITIONS[index];
                  return <line key={`${x}-${y}`} x1="50" y1="50" x2={x} y2={y} />;
                })}
              </svg>
            )}
            <div className="pulse-core">
              <span>Y</span>
              <small>now</small>
            </div>
            {signals.map(({ post, author, kind }, index) => {
              const [x, y] = NODE_POSITIONS[index];
              const strength = Math.min(3, Math.max(1, Math.ceil(Math.log10(Math.max(10, post.likes + post.comments + 1))) - 2));
              const name = author?.displayName || author?.username || 'Someone';
              return (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className={cn('pulse-node', `pulse-node--${kind}`, `pulse-node--strength-${strength}`)}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-label={`${signalLabel(kind)} from ${name}: ${post.content}`}
                >
                  <span className="pulse-node__ring" />
                  <Avatar className="pulse-node__avatar">
                    <AvatarImage src={author?.avatarUrl} alt="" />
                    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="pulse-node__peek">
                    <small>{signalLabel(kind)} · {safeTimeAgo(post.createdAt)}</small>
                    <strong>{name}</strong>
                    <em>{post.content}</em>
                  </span>
                </Link>
              );
            })}
            {signals.length === 0 && (
              <div className="pulse-canvas__empty">
                <Radio className="h-7 w-7" />
                <strong>No {filter === 'everything' ? '' : filter} signals yet.</strong>
                <span>Plant the first seed or switch the filter.</span>
              </div>
            )}
            <div className="pulse-canvas__legend">
              <span><i className="is-idea" /> Idea</span>
              <span><i className="is-building" /> Building</span>
              <span><i className="is-gathering" /> Gathering</span>
            </div>
          </div>

          <aside className="pulse-strongest">
            <div className="pulse-section-title">
              <div><span>Signal strength</span><h2>Moving now</h2></div>
              <Link href="/explore" aria-label="Explore all signals"><ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="pulse-signal-list">
              {strongest.map(({ post, author, kind }, index) => {
                const name = author?.displayName || author?.username || 'Someone';
                return (
                  <Link href={`/post/${post.id}`} key={post.id} className="pulse-signal-row">
                    <span className="pulse-signal-row__rank">0{index + 1}</span>
                    <div>
                      <small>{signalLabel(kind)} · {name}</small>
                      <p>{post.content}</p>
                      <span>{post.likes.toLocaleString()} resonances · {post.comments.toLocaleString()} replies</span>
                    </div>
                  </Link>
                );
              })}
              {strongest.length === 0 && <p className="pulse-list-empty">The network is quiet. That makes this a good moment to begin.</p>}
            </div>
          </aside>
        </section>

        <section className="pulse-bottom-grid">
          <div className="pulse-rail-card">
            <div className="pulse-section-title">
              <div><span>Reality layer</span><h2>Happening next</h2></div>
              <CalendarDays className="h-4 w-4" />
            </div>
            {activeStreams.length > 0 && (
              <Link href={`/live/${activeStreams[0].id}`} className="pulse-live-row">
                <span><i /> Live</span>
                <strong>{activeStreams[0].title}</strong>
                <small>{activeStreams[0].viewers.toLocaleString()} here now</small>
              </Link>
            )}
            <div className="pulse-event-list">
              {upcomingEvents.map((event) => (
                <Link href={`/events/${event.id}`} key={event.id}>
                  <time dateTime={event.startsAt}>
                    <strong>{new Date(event.startsAt).toLocaleDateString(undefined, { day: '2-digit' })}</strong>
                    <span>{new Date(event.startsAt).toLocaleDateString(undefined, { month: 'short' })}</span>
                  </time>
                  <div><strong>{event.title}</strong><span>{event.location}</span></div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
              {upcomingEvents.length === 0 && <p className="pulse-list-empty">No upcoming events yet. The calendar is open.</p>}
            </div>
          </div>

          <div className="pulse-rail-card">
            <div className="pulse-section-title">
              <div><span>Shared gravity</span><h2>Worlds pulling people in</h2></div>
              <Globe2 className="h-4 w-4" />
            </div>
            <div className="pulse-world-list">
              {activeWorlds.map((world) => (
                <Link href={`/communities/${world.id}`} key={world.id}>
                  <span className="pulse-world-list__image">{world.coverUrl ? <img src={world.coverUrl} alt="" /> : world.name.charAt(0)}</span>
                  <div><strong>{world.name}</strong><small>{world.members.toLocaleString()} people · {world.category}</small></div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
              {activeWorlds.length === 0 && <p className="pulse-list-empty">Worlds will appear as your network grows.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
