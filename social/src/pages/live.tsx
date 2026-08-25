import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type LiveStream } from '@/lib/store';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Radio, Users, Calendar, Sparkles, Play, Heart, Send, Gift, 
  Share2, MessageCircle, Volume2, VolumeX, Maximize2, Shield, 
  ChevronLeft, Award, Crown, Zap, Flame 
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLocation, useRoute } from 'wouter';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { connectSocket } from '@/lib/socket-client';

interface LiveComment {
  id: string;
  user: string;
  avatar: string;
  badge?: 'host' | 'vip' | 'sub' | 'mod';
  text: string;
  timestamp: string;
  gift?: { name: string; icon: string; amount: number };
}

const INITIAL_LIVE_COMMENTS: LiveComment[] = [
  { id: '1', user: 'Valkyrie_Zero', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', badge: 'host', text: 'Welcome everyone to the Multiverse Live Summit! Drop your questions in chat! 🔥', timestamp: 'Just now' },
  { id: '2', user: 'Kai_Takahashi', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', badge: 'vip', text: 'That UI animation shader looks unreal! 🤯', timestamp: 'Just now' },
  { id: '3', user: 'Elena_Rostova', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop', badge: 'sub', text: 'Hype train level 5 activated! Lets gooo 🚀🚀', timestamp: 'Just now' },
  { id: '4', user: 'Alex_Chen', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop', badge: 'mod', text: 'Reminder: Steam trade giveaway starts in 10 minutes!', timestamp: 'Just now' },
];

function GoLiveDialog() {
  return (
    <Button disabled title="Live media is not enabled for the college beta" className="rounded-xl font-bold text-xs px-4 bg-rose-600/50 text-white">
      <Radio className="w-4 h-4 mr-1.5" /> Live media unavailable in beta
    </Button>
  );
}

// Full Interactive Instagram / Twitch Live Broadcast Room
function LiveBroadcastRoom({ streamId }: { streamId: string }) {
  const [, setLocation] = useLocation();
  const liveStreams = useAppStore((s) => s.liveStreams);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);

  const stream = liveStreams.find((s) => s.id === streamId) || liveStreams[0];
  const host = stream ? users[stream.hostId] : currentUser;

  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number; color: string }[]>([]);
  const [viewerCount] = useState(stream?.viewers || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;
    
    socket.emit('stream:join', { streamId });

    const onSuperchat = (data: any) => {
      const newComment: LiveComment = {
        id: data.id,
        user: 'Anonymous',
        avatar: 'https://ui-avatars.com/api/?name=User',
        badge: 'vip',
        text: data.message || 'Sent a superchat!',
        timestamp: 'Just now',
        gift: { name: 'Superchat', icon: '💎', amount: data.amountMinor ? data.amountMinor / 100 : 10 }
      };
      setComments((prev) => [...prev, newComment]);
      triggerConfetti();
      sounds.playChime();
    };

    socket.on('stream:superchat', onSuperchat);

    return () => {
      socket.emit('stream:leave', { streamId });
      socket.off('stream:superchat', onSuperchat);
    };
  }, [streamId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [comments]);

  // Floating heart burst generator
  const triggerHeartBurst = () => {
    sounds.playPop();
    setIsLiked(true);
    const colors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#fbbf24'];
    const newHearts = Array.from({ length: 4 }).map(() => ({
      id: Date.now() + Math.random(),
      left: Math.floor(Math.random() * 60) + 20,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setFloatingHearts((prev) => [...prev, ...newHearts]);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 2000);
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    sounds.playPop();
    setComments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        user: currentUser?.displayName || 'You',
        avatar: currentUser?.avatarUrl || 'https://picsum.photos/seed/you/200/200',
        badge: 'vip',
        text: commentInput.trim(),
        timestamp: 'Just now',
      },
    ]);
    setCommentInput('');
    triggerHeartBurst();
  };

  if (!stream) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h2 className="text-xl font-bold font-display mb-2">Stream not found</h2>
          <Button onClick={() => setLocation('/live')}>Return to Streams</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row overflow-hidden font-sans text-white">
      {/* Main Broadcast Stage */}
      <div className="flex-1 relative h-[60vh] md:h-full bg-zinc-950 flex items-center justify-center overflow-hidden">
        {/* Stream Video Canvas */}
        <div className="relative w-full h-full">
          <img
            src={stream.coverUrl}
            alt={stream.title}
            className="w-full h-full object-cover opacity-90"
          />
          {/* Fake scanline overlay for stream feel */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.03)_2px,rgba(0,0,0,0.03)_4px)] pointer-events-none" />
        </div>
        
        {/* Ambient Overlay Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />

        {/* Top Floating HUD */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md p-1.5 pr-4 rounded-full border border-white/10 shadow-2xl">
            <button onClick={() => setLocation('/live')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <Avatar className="w-10 h-10 border border-white/20">
              <AvatarImage src={host?.avatarUrl} />
              <AvatarFallback>{host?.displayName?.charAt(0) || 'H'}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-display font-bold text-xs text-white flex items-center gap-1.5">
                {host?.displayName || 'Live Streamer'}
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              </h4>
              <p className="text-[0.65rem] text-zinc-400 font-mono">{stream.category}</p>
            </div>
            <Button size="sm" className="rounded-full h-7 font-bold text-[0.68rem] px-3 ml-2 bg-rose-600 hover:bg-rose-700 text-white">
              Follow
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-mono font-bold shadow-lg border border-white/20">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" /> LIVE
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-mono font-bold border border-white/10">
              <Users className="w-3.5 h-3.5 text-zinc-400" /> {viewerCount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Floating Hearts Particle Cannon (Right Side Canvas) */}
        <div className="absolute right-6 bottom-24 w-24 h-96 pointer-events-none overflow-hidden z-30">
          <AnimatePresence>
            {floatingHearts.map((heart) => (
              <motion.div
                key={heart.id}
                initial={{ opacity: 1, y: 350, x: heart.left - 50, scale: 0.8 }}
                animate={{
                  opacity: 0,
                  y: -50,
                  x: heart.left - 50 + (Math.random() * 40 - 20),
                  scale: 1.4,
                  rotate: Math.random() * 40 - 20,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: 'easeOut' }}
                className="absolute text-2xl drop-shadow-lg"
                style={{ color: heart.color }}
              >
                ❤️
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Stream Broadcast Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20">
          <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 max-w-md">
            <span className="text-[0.65rem] font-mono uppercase text-rose-400 font-bold block">Broadcasting Live</span>
            <h3 className="font-display font-bold text-sm text-white truncate">{stream.title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-white/20 transition-colors border border-white/10"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={triggerHeartBurst}
              className="p-3 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-all transform active:scale-90 shadow-lg border border-white/20"
            >
              <Heart className="w-5 h-5 fill-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Chat & Superchat Sidebar */}
      <div className="w-full md:w-96 h-[40vh] md:h-full bg-zinc-950/95 border-t md:border-t-0 md:border-l border-border/40 flex flex-col justify-between z-30">
        {/* Chat Header */}
        <div className="p-3.5 border-b border-border/40 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-white">
            <MessageCircle className="w-4 h-4 text-primary" /> Live Discussion
          </div>
          <button
            disabled
            title="Superchats are not enabled for the college beta"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300/50 border border-amber-500/20 text-xs font-mono font-bold cursor-not-allowed"
          >
            <Gift className="w-3.5 h-3.5 text-amber-400/50" /> Gifts unavailable
          </button>
        </div>

        {/* Live Messages Stream */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
          {comments.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2.5 text-xs font-sans">
              <Avatar className="w-7 h-7 shrink-0 mt-0.5 border border-white/10">
                <AvatarImage src={msg.avatar} />
                <AvatarFallback>{msg.user.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-zinc-300">{msg.user}</span>
                  {msg.badge === 'host' && (
                    <span className="text-[0.6rem] font-mono px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold">HOST</span>
                  )}
                  {msg.badge === 'vip' && (
                    <span className="text-[0.6rem] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">VIP</span>
                  )}
                  {msg.badge === 'sub' && (
                    <span className="text-[0.6rem] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">SUB</span>
                  )}
                </div>

                {msg.gift ? (
                  <div className="mt-1 p-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-transparent border border-amber-500/30 flex items-center gap-2">
                    <span className="text-lg">{msg.gift.icon}</span>
                    <div>
                      <div className="font-bold text-amber-300 text-xs">Sent {msg.gift.name}!</div>
                      <div className="text-[0.62rem] text-zinc-400 font-mono">+{msg.gift.amount} Steam Gems</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-zinc-200 mt-0.5 break-words leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendComment} className="p-3 border-t border-border/40 bg-zinc-900/80 flex items-center gap-2">
          <Input
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Send a live message…"
            className="rounded-xl bg-zinc-950 border-border/60 text-xs h-10 text-white placeholder:text-zinc-500"
          />
          <Button type="submit" size="sm" className="rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

const STREAM_GENRES = [
  { id: 'all', label: '🌟 All Broadcasts' },
  { id: 'tech', label: '🤖 Tech & AI' },
  { id: 'gaming', label: '🎮 Gaming & Esports' },
  { id: 'music', label: '🎵 Music & Sound' },
  { id: 'art', label: '🎨 3D & Design' },
  { id: 'fashion', label: '👗 Fashion & Runway' },
  { id: 'motorsport', label: '🏎️ Speed & Sim' },
  { id: 'science', label: '🔬 Quantum & Space' },
  { id: 'lifestyle', label: '☕ Crafts & Gastronomy' },
] as const;

function matchesStreamGenre(stream: any, host: any, genre: string): boolean {
  if (genre === 'all') return true;
  const text = `${stream.title} ${stream.category} ${host?.bio || ''}`.toLowerCase();
  switch (genre) {
    case 'tech':
      return text.includes('tech') || text.includes('ai') || text.includes('tensor') || text.includes('hardware') || text.includes('robot') || text.includes('silicon') || text.includes('code');
    case 'gaming':
      return text.includes('game') || text.includes('esport') || text.includes('scrim') || text.includes('duel') || text.includes('steam') || text.includes('vct');
    case 'music':
      return text.includes('music') || text.includes('audio') || text.includes('synth') || text.includes('sound') || text.includes('dj') || text.includes('rave') || text.includes('sitar');
    case 'art':
      return text.includes('art') || text.includes('3d') || text.includes('render') || text.includes('sculpt') || text.includes('manga') || text.includes('anime');
    case 'fashion':
      return text.includes('fashion') || text.includes('runway') || text.includes('wearable') || text.includes('textile');
    case 'motorsport':
      return text.includes('car') || text.includes('drift') || text.includes('sim') || text.includes('dyno') || text.includes('race');
    case 'science':
      return text.includes('science') || text.includes('quantum') || text.includes('space') || text.includes('astronomy') || text.includes('telescope');
    case 'lifestyle':
      return text.includes('tea') || text.includes('coffee') || text.includes('craft') || text.includes('watch') || text.includes('blade') || text.includes('maki-e');
    default:
      return true;
  }
}

export default function Live() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>('/live/:id');
  const streamId = params?.id;

  const liveStreams = useAppStore((s: any) => s.liveStreams || []);
  const users = useAppStore((s: any) => s.users || {});
  const loadStreams = useAppStore((s: any) => s.loadStreams);
  const loadUserProfile = useAppStore((s: any) => s.loadUserProfile);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  useEffect(() => { loadStreams(); }, [loadStreams]);

  useEffect(() => {
    for (const stream of liveStreams) {
      if (!users[stream.hostId]) loadUserProfile(stream.hostId);
    }
  }, [liveStreams, users, loadUserProfile]);

  // The current backend stores stream metadata only; there is no media
  // transport in the college beta, so never present a poster as a live feed.
  if (streamId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center bg-background">
        <div className="max-w-md space-y-4">
          <Radio className="w-12 h-12 mx-auto text-rose-500/60" />
          <h2 className="text-xl font-bold font-display">Live media is not enabled yet</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Stream scheduling metadata is available for planning, but video,
            audio rooms, viewer counts, chat and Superchats are disabled for this
            college beta.
          </p>
          <Button onClick={() => setLocation('/live')}>Return to Streams</Button>
        </div>
      </div>
    );
  }

  const filteredStreams = liveStreams.filter((s) => {
    const host = users[s.hostId];
    return matchesStreamGenre(s, host, selectedGenre);
  });

  const live = filteredStreams.filter((s) => s.status === 'live');
  const scheduled = filteredStreams.filter((s) => s.status === 'scheduled');

  const renderStreamCard = (stream: typeof liveStreams[number]) => {
    const host = users[stream.hostId];
    const isLive = stream.status === 'live';

    return (
      <motion.div
        variants={staggerItem}
        key={stream.id}
        onClick={() => setLocation(`/live/${stream.id}`)}
        className="surface-1 rounded-3xl overflow-hidden cursor-pointer group border border-border/40 hover:border-rose-500/50 transition-all duration-300 flex flex-col shadow-sm"
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
          <img src={stream.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={stream.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {isLive ? (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-rose-600 text-white text-[0.65rem] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-lg border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> LIVE
            </div>
          ) : (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white font-mono text-[0.65rem] px-2.5 py-1 rounded-full border border-white/10">
              <Calendar className="w-3 h-3" /> {format(new Date(stream.startsAt), 'MMM d, h:mm a')}
            </div>
          )}

          {isLive && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white font-mono text-xs font-bold drop-shadow-md">
              <Users className="w-3.5 h-3.5" /> {stream.viewers.toLocaleString()} watching
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1 justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10 shrink-0 border border-border/50">
              <AvatarImage src={host?.avatarUrl} />
              <AvatarFallback>{(host?.displayName ?? '?').charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">{stream.title}</h3>
              <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">{host?.displayName ?? 'Unknown'} <span className="mx-1">·</span> {stream.category}</p>
            </div>
          </div>

          <div className="mt-5">
            {isLive ? (
              <Button className="w-full rounded-2xl font-bold text-xs h-10 bg-rose-600 hover:bg-rose-700 text-white shadow-md glow-neon-primary">
                <Play className="w-3.5 h-3.5 mr-1.5 fill-white" /> Join Broadcast Room
              </Button>
            ) : (
              <Button variant="secondary" className="w-full rounded-2xl font-bold text-xs h-10 surface-2">
                <Calendar className="w-3.5 h-3.5 mr-1.5" /> Set Reminder
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Live Broadcasts</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Stream metadata only · media features are coming later</p>
        </div>
        <GoLiveDialog />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-10">
        {/* Genre Category Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {STREAM_GENRES.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border shrink-0",
                selectedGenre === g.id
                  ? "bg-rose-600 text-white border-rose-600 font-bold shadow-md"
                  : "surface-1 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        {filteredStreams.length === 0 && (
          <div className="text-center py-20 rounded-3xl border border-dashed border-border/50 surface-1">
            <Radio className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="font-display font-bold text-lg mb-1">No streams in this genre</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Start a broadcast or schedule a stream for this topic.</p>
          </div>
        )}

        {live.length > 0 && (
          <section>
            <div className="showcase-section-title mb-6">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <h3>Happening Now ({live.length})</h3>
            </div>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {live.map(renderStreamCard)}
            </motion.div>
          </section>
        )}

        {scheduled.length > 0 && (
          <section>
            <div className="showcase-section-title mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3>Scheduled Streams ({scheduled.length})</h3>
            </div>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {scheduled.map(renderStreamCard)}
            </motion.div>
          </section>
        )}
      </div>
    </div>
  );
}
