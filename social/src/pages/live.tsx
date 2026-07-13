import { useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Users, Mic, MicOff, Video as VideoIcon, PhoneOff, Heart, Send, Calendar, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';

function StreamRoom({ streamId }: { streamId: string }) {
  const [, setLocation] = useLocation();
  const { liveStreams, users } = useAppStore();
  const [muted, setMuted] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([
    { id: 'c1', userId: 'u2', text: 'This is such a great view!' },
    { id: 'c2', userId: 'u4', text: 'Loving the energy here 🔥' },
  ]);

  const stream = liveStreams.find(s => s.id === streamId);
  if (!stream) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <p>This stream is no longer available.</p>
        <Button variant="secondary" className="mt-4 rounded-full" onClick={() => setLocation('/live')}>Back to Live</Button>
      </div>
    );
  }

  const host = users[stream.hostId];
  const isEnded = stream.status === 'ended';

  const sendMessage = () => {
    if (!message.trim()) return;
    setChat(prev => [...prev, { id: `c_${Date.now()}`, userId: 'u1', text: message.trim() }]);
    setMessage('');
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="flex-1 bg-black relative flex flex-col">
        <button onClick={() => setLocation('/live')} className="absolute top-4 left-4 z-20 text-white/80 hover:text-white bg-black/40 backdrop-blur rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <img src={stream.coverUrl} className={`w-full h-full object-cover ${isEnded ? 'opacity-40 grayscale' : ''}`} alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
          {!isEnded && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </span>
              <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur text-white text-xs font-medium px-2.5 py-1 rounded-full">
                <Users className="w-3.5 h-3.5" /> {stream.viewers.toLocaleString()}
              </span>
            </div>
          )}
          {isEnded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/80 text-lg font-medium">Replay — stream has ended</p>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-11 h-11 border-2 border-white/30">
                <AvatarImage src={host?.avatarUrl} />
                <AvatarFallback>{host?.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium">{stream.title}</p>
                <p className="text-white/70 text-sm">{host?.displayName}</p>
              </div>
            </div>
            {!isEnded && (
              <div className="flex items-center gap-2">
                <Button size="icon" variant="secondary" className="rounded-full bg-white/10 hover:bg-white/20 text-white border-none" onClick={() => setMuted(m => !m)}>
                  {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="destructive" className="rounded-full" onClick={() => setLocation('/live')}>
                  <PhoneOff className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[360px] border-l border-border/50 flex flex-col h-[40vh] lg:h-screen bg-background">
        <div className="p-4 border-b border-border/50">
          <h3 className="font-display font-semibold">Live Chat</h3>
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-3">
          {chat.map((c) => {
            const author = users[c.userId];
            return (
              <div key={c.id} className="flex items-start gap-2 text-sm">
                <span className="font-medium shrink-0">{author?.displayName.split(' ')[0]}:</span>
                <span className="text-muted-foreground">{c.text}</span>
              </div>
            );
          })}
        </div>
        {!isEnded && (
          <div className="p-3 border-t border-border/50 flex items-center gap-2">
            <Input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Say something..." className="rounded-full bg-muted/50 border-none" />
            <Button size="icon" className="rounded-full shrink-0" onClick={sendMessage}>
              <Send className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full shrink-0 text-primary">
              <Heart className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Live() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { liveStreams, users } = useAppStore();

  if (params.id) {
    return <StreamRoom streamId={params.id} />;
  }

  const live = liveStreams.filter(s => s.status === 'live');
  const scheduled = liveStreams.filter(s => s.status === 'scheduled');
  const ended = liveStreams.filter(s => s.status === 'ended');

  const StreamCard = ({ stream, i }: { stream: typeof liveStreams[number]; i: number }) => {
    const host = users[stream.hostId];
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        onClick={() => setLocation(`/live/${stream.id}`)}
        className="rounded-2xl overflow-hidden border border-border/50 bg-card cursor-pointer group"
      >
        <div className="relative aspect-video bg-muted">
          <img src={stream.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
          {stream.status === 'live' && (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
          {stream.status === 'scheduled' && (
            <span className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur text-white text-xs font-medium px-2.5 py-1 rounded-full">
              <Calendar className="w-3 h-3" /> {format(new Date(stream.startsAt), 'MMM d, h:mm a')}
            </span>
          )}
          {stream.kind === 'audio' && (
            <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded-full">Audio Room</span>
          )}
          {stream.status === 'live' && (
            <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded-full">
              <Users className="w-3 h-3" /> {stream.viewers.toLocaleString()}
            </span>
          )}
        </div>
        <div className="p-3 flex items-center gap-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={host?.avatarUrl} />
            <AvatarFallback>{host?.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{stream.title}</p>
            <p className="text-xs text-muted-foreground truncate">{host?.displayName} · {stream.category}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-2"><Radio className="w-7 h-7 text-primary" /> Live</h1>
          <p className="text-muted-foreground mt-1">Video, audio rooms, and scheduled streams happening now.</p>
        </div>
        <Button className="rounded-full gap-2"><Radio className="w-4 h-4" /> Go Live</Button>
      </div>

      {live.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display font-semibold text-xl mb-4">Live Now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.map((s, i) => <StreamCard key={s.id} stream={s} i={i} />)}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display font-semibold text-xl mb-4">Scheduled</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduled.map((s, i) => <StreamCard key={s.id} stream={s} i={i} />)}
          </div>
        </section>
      )}

      {ended.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-xl mb-4">Replays</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ended.map((s, i) => <StreamCard key={s.id} stream={s} i={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
