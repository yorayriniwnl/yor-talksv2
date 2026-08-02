import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Radio, Users, Calendar, Sparkles, Play } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

function GoLiveDialog() {
  const createStream = useAppStore((s) => s.createStream);
  const setStreamStatus = useAppStore((s) => s.setStreamStatus);
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Tech');
  const [kind, setKind] = useState<'video' | 'audio'>('video');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoLive = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createStream({
        title: title.trim(),
        coverUrl: `https://picsum.photos/seed/${encodeURIComponent(title)}/600/400`,
        kind,
        startsAt: new Date().toISOString(),
        category,
      });
      const created = useAppStore.getState().liveStreams[0];
      if (created) {
        await setStreamStatus(created.id, 'live');
        setOpen(false);
        setLocation(`/live/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start stream');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold text-xs px-4 glow-neon-primary bg-rose-600 hover:bg-rose-700 text-white"><Radio className="w-4 h-4 mr-1.5 animate-pulse" /> Go Live</Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl font-sans">
        <DialogHeader><DialogTitle className="font-display font-bold text-xl">Start a Live Stream</DialogTitle></DialogHeader>
        <form onSubmit={handleGoLive} className="space-y-4">
          {error && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="stream-title" className="text-xs font-mono uppercase text-muted-foreground">Title</Label>
            <Input id="stream-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} placeholder="Live coding & Q&A" className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="stream-category" className="text-xs font-mono uppercase text-muted-foreground">Category</Label>
              <Input id="stream-category" value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="Tech" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stream-kind" className="text-xs font-mono uppercase text-muted-foreground">Format</Label>
              <select id="stream-kind" value={kind} onChange={(e) => setKind(e.target.value as 'video' | 'audio')} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium">
                <option value="video">Video Stream</option>
                <option value="audio">Audio Room</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || title.trim().length < 2} className="rounded-xl font-bold text-xs px-6 bg-rose-600 hover:bg-rose-700 text-white">
              <Radio className="w-4 h-4 mr-1.5" /> {loading ? 'Broadcasting…' : 'Go Live Now'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Live() {
  const [, setLocation] = useLocation();
  const liveStreams = useAppStore((s) => s.liveStreams);
  const users = useAppStore((s) => s.users);
  const loadStreams = useAppStore((s) => s.loadStreams);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);

  useEffect(() => { loadStreams(); }, [loadStreams]);

  useEffect(() => {
    for (const stream of liveStreams) {
      if (!users[stream.hostId]) loadUserProfile(stream.hostId);
    }
  }, [liveStreams, users, loadUserProfile]);

  const live = liveStreams.filter(s => s.status === 'live');
  const scheduled = liveStreams.filter(s => s.status === 'scheduled');

  const renderStreamCard = (stream: typeof liveStreams[number]) => {
    const host = users[stream.hostId];
    const isLive = stream.status === 'live';

    return (
      <motion.div
        variants={staggerItem}
        key={stream.id}
        className="surface-1 rounded-2xl overflow-hidden cursor-pointer group border border-border/40 hover:border-rose-500/40 transition-all duration-300 flex flex-col"
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
        <div className="p-4 flex flex-col flex-1 justify-between">
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
          <div className="mt-4">
            {isLive ? (
              <Button className="w-full rounded-xl font-bold text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white shadow-md" onClick={() => setLocation(`/live/${stream.id}`)}>
                <Play className="w-3.5 h-3.5 mr-1 fill-white" /> Join Broadcast
              </Button>
            ) : (
              <Button variant="secondary" className="w-full rounded-xl font-bold text-xs h-9 surface-2">Set Reminder</Button>
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
          <p className="text-[0.68rem] text-muted-foreground font-mono">Real-time streams & audio rooms</p>
        </div>
        <GoLiveDialog />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {liveStreams.length === 0 && (
          <div className="text-center py-20 rounded-3xl border border-dashed border-border/50 surface-1">
            <Radio className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="font-display font-bold text-lg mb-1">No live streams right now</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Be the first to start a live broadcast or audio room for your community.</p>
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
