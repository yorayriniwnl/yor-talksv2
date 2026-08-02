import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem, tapScale } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Play, Film, Sparkles, Video as VideoIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import ReelsSwiper from '@/components/video/ReelsSwiper';

function UploadVideoDialog() {
  const createVideo = useAppStore((s) => s.createVideo);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [type, setType] = useState<'short' | 'standard'>('short');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createVideo({ title: title.trim(), videoUrl: videoUrl.trim(), thumbnailUrl: thumbnailUrl.trim(), type });
      setOpen(false);
      setTitle(''); setVideoUrl(''); setThumbnailUrl(''); setType('short');
    } catch (err: any) {
      setError(err.message || 'Failed to add video');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold text-xs px-4 glow-neon-primary bg-primary"><Plus className="w-4 h-4 mr-1.5" /> Add Video</Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader><DialogTitle className="font-display font-bold text-xl">Add a video</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {error && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="video-title" className="text-xs font-mono uppercase text-muted-foreground">Caption</Label>
            <Input id="video-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} placeholder="Design process timelapse" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video-url" className="text-xs font-mono uppercase text-muted-foreground">Video URL</Label>
            <Input id="video-url" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required placeholder="https://…/video.mp4" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video-thumb" className="text-xs font-mono uppercase text-muted-foreground">Thumbnail URL</Label>
            <Input id="video-thumb" type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} required placeholder="https://…/thumb.jpg" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video-type" className="text-xs font-mono uppercase text-muted-foreground">Format</Label>
            <select id="video-type" value={type} onChange={(e) => setType(e.target.value as 'short' | 'standard')} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium">
              <option value="short">Short form (Reels)</option>
              <option value="standard">Standard video</option>
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || title.trim().length < 2 || !videoUrl.trim() || !thumbnailUrl.trim()} className="rounded-xl font-bold text-xs px-6">
              {loading ? 'Adding…' : 'Publish Video'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Videos() {
  const users = useAppStore((s) => s.users);
  const videos = useAppStore((s) => s.videos);
  const loadVideos = useAppStore((s) => s.loadVideos);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);
  const [tab, setTab] = useState<'All' | 'short' | 'long'>('All');
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  useEffect(() => {
    for (const video of videos) {
      if (!users[video.authorId]) loadUserProfile(video.authorId);
    }
  }, [videos, users, loadUserProfile]);

  const filteredVideos = videos.filter((v) => tab === 'All' || v.type === tab);
  const shortVideos = videos.filter(v => v.type === 'short');

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Videos & Reels</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Stream short and long form content</p>
        </div>
        <UploadVideoDialog />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Category Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-1">
          {(['All', 'short', 'long'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                tab === t ? "bg-primary text-primary-foreground glow-neon-primary" : "surface-1 text-muted-foreground hover:bg-muted"
              )}
            >
              {t === 'All' ? '⚡ All Videos' : t === 'short' ? '🎬 Short Form (Reels)' : '📹 Standard Videos'}
            </button>
          ))}
        </div>

        {filteredVideos.length === 0 && (
          <div className="text-center py-20 rounded-3xl border border-dashed border-border/50 surface-1">
            <VideoIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="font-display font-bold text-lg mb-1">No videos found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Upload a short or standard video to populate this gallery.</p>
          </div>
        )}

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredVideos.map((video) => {
            const author = users[video.authorId];

            return (
              <motion.div 
                variants={staggerItem}
                key={video.id} 
                className="surface-1 rounded-2xl overflow-hidden cursor-pointer group border border-border/40 hover:border-primary/40 transition-all duration-300"
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => {
                  if (video.type === 'short') {
                    const idx = shortVideos.findIndex(v => v.id === video.id);
                    if (idx !== -1) setActiveReelIndex(idx);
                  }
                }}
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img src={video.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={video.title} />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-black/70 text-white font-mono text-[0.65rem] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {video.type === 'short' ? 'REEL' : '12:30'}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-display font-bold text-sm line-clamp-2 mb-2.5 group-hover:text-primary transition-colors leading-tight">{video.title}</h3>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={author?.avatarUrl} />
                      <AvatarFallback>{(author?.displayName ?? '?').charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-xs font-mono text-muted-foreground truncate flex-1 flex items-center justify-between">
                      <span className="font-semibold text-foreground/80 truncate">{author?.displayName ?? 'Unknown'}</span>
                      <span className="shrink-0 ml-2">{video.views?.toLocaleString() ?? 0} views</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {activeReelIndex !== null && (
          <ReelsSwiper 
            videos={shortVideos}
            initialIndex={activeReelIndex}
            onClose={() => setActiveReelIndex(null)}
          />
        )}
      </div>
    </div>
  );
}
