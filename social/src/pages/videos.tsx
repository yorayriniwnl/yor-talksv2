import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem, tapScale } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Play, Film, Sparkles, Video as VideoIcon, UploadCloud, FileVideo, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import ReelsSwiper from '@/components/video/ReelsSwiper';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { type ContentCategory } from '@/lib/content-category';

function UploadVideoDialog() {
  const createVideo = useAppStore((s: any) => s.createVideo);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [type, setType] = useState<'short' | 'standard'>('short');
  const [contentCategory, setContentCategory] = useState<ContentCategory | ''>('');
  const [contentRating, setContentRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
  const [fileName, setFileName] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (.mp4, .webm, .mov, etc.)');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
    setPreviewUrl(objectUrl);
    setFileName(file.name);
    setError('');

    // Try auto-capturing a thumbnail frame
    try {
      const vid = document.createElement('video');
      vid.src = objectUrl;
      vid.currentTime = 1;
      vid.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = vid.videoWidth || 640;
        canvas.height = vid.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
    } catch {
      setThumbnailUrl('https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalVideoUrl = videoUrl.trim();
    const finalThumb = thumbnailUrl.trim() || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop';

    if (!finalVideoUrl) {
      setError('Please select a video file or provide a valid video URL.');
      return;
    }
    if (!contentCategory) {
      setError('Choose a category before publishing this video.');
      return;
    }

    setLoading(true);
    try {
      await createVideo({ 
        title: title.trim(), 
        videoUrl: finalVideoUrl, 
        thumbnailUrl: finalThumb, 
        type,
        contentCategory,
        contentRating,
      });
      triggerConfetti();
      toast.success('🎬 Video published successfully! Live on your profile and reels stream.');
      setOpen(false);
      setTitle(''); 
      setVideoUrl(''); 
      setThumbnailUrl(''); 
      setFileName('');
      setPreviewUrl('');
      setType('short');
      setContentCategory('');
      setContentRating(DEFAULT_CONTENT_RATING);
    } catch (err: any) {
      setError(err.message || 'Failed to add video');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold text-xs px-4 glow-neon-primary bg-primary shadow-lg hover:shadow-primary/25">
          <Plus className="w-4 h-4 mr-1.5" /> Upload Video / Reel
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-primary" /> Publish Video or Short Reel
          </DialogTitle>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
              mode === 'file' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <UploadCloud className="w-3.5 h-3.5" /> Select Local File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={cn(
              'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
              mode === 'url' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LinkIcon className="w-3.5 h-3.5" /> Paste Video Link
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {error && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          {mode === 'file' ? (
            <div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="video/mp4,video/webm,video/ogg,video/quicktime" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2',
                  previewUrl ? 'border-primary/60 bg-primary/5' : 'border-border/80'
                )}
              >
                {previewUrl ? (
                  <div className="space-y-2 w-full">
                    <video src={previewUrl} className="w-full max-h-36 object-cover rounded-lg mx-auto shadow-md" controls muted />
                    <p className="text-xs font-medium text-primary flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {fileName || 'Video selected ready for upload'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold">Click to choose a video file</p>
                    <p className="text-xs text-muted-foreground">Supports MP4, WebM, MOV up to 4K resolution</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="video-url" className="text-xs font-mono uppercase text-muted-foreground">Video Stream URL</Label>
              <Input id="video-url" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required placeholder="https://…/video.mp4" className="rounded-xl" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="video-title" className="text-xs font-mono uppercase text-muted-foreground">Title & Caption</Label>
            <Input id="video-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} placeholder="e.g. 4K FPV Drone Canyon Chase or AI Shader Timelapse" className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="video-type" className="text-xs font-mono uppercase text-muted-foreground">Format</Label>
              <select id="video-type" value={type} onChange={(e) => setType(e.target.value as 'short' | 'standard')} className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium">
                <option value="short">📱 Short form (Reels)</option>
                <option value="standard">🖥️ Standard 16:9 Video</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="video-thumb" className="text-xs font-mono uppercase text-muted-foreground">Custom Cover (Optional)</Label>
              <Input id="video-thumb" type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="Auto-captured or Image URL" className="rounded-xl h-10 text-xs" />
            </div>
          </div>

          <ContentCategorySelect id="video-content-category" value={contentCategory} onChange={setContentCategory} />
          <ContentRatingSelect id="video-content-rating" value={contentRating} onChange={setContentRating} />

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={loading || title.trim().length < 2 || !videoUrl.trim() || !contentCategory} className="rounded-xl font-bold text-xs px-6 glow-neon-primary bg-primary w-full sm:w-auto">
              {loading ? 'Publishing…' : '🚀 Publish to Feed & Reels'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const GENRE_CATEGORIES = [
  { id: 'all', label: '🌟 All Genres' },
  { id: 'tech', label: '🤖 AI & Tech' },
  { id: 'gaming', label: '🎮 Gaming & Esports' },
  { id: 'music', label: '🎵 Music & Sound' },
  { id: 'art', label: '🎨 3D Art & CGI' },
  { id: 'fashion', label: '👗 Fashion & Wearables' },
  { id: 'motorsport', label: '🏎️ Motorsports & Sim' },
  { id: 'drones', label: '🛸 FPV & Drones' },
  { id: 'crafts', label: '⚔️ Blades & Crafts' },
  { id: 'science', label: '🧬 Science & Quantum' },
  { id: 'lifestyle', label: '☕ Gastronomy & Tea' },
] as const;

function matchesGenre(video: any, author: any, genre: string): boolean {
  if (genre === 'all') return true;
  const content = `${video.title} ${author?.bio || ''} ${author?.username || ''}`.toLowerCase();
  switch (genre) {
    case 'tech':
      return content.includes('ai') || content.includes('shader') || content.includes('gpu') || content.includes('three.js') || content.includes('vr') || content.includes('xr') || content.includes('fpga') || content.includes('hardware') || content.includes('overclock') || content.includes('fluid') || content.includes('webgpu');
    case 'gaming':
      return content.includes('game') || content.includes('clutch') || content.includes('radiant') || content.includes('mocap') || content.includes('fightstick') || content.includes('arcade') || content.includes('esport') || content.includes('ballerina');
    case 'music':
      return content.includes('music') || content.includes('synth') || content.includes('techno') || content.includes('rave') || content.includes('audio') || content.includes('sound') || content.includes('sitar') || content.includes('drum') || content.includes('kora') || content.includes('bpm') || content.includes('amapiano') || content.includes('sarangi') || content.includes('polivoks') || content.includes('bateria');
    case 'art':
      return content.includes('unreal') || content.includes('paint') || content.includes('anime') || content.includes('3d') || content.includes('sculpt') || content.includes('cgi') || content.includes('inking') || content.includes('art') || content.includes('shonen');
    case 'fashion':
      return content.includes('fashion') || content.includes('runway') || content.includes('sneaker') || content.includes('couture') || content.includes('textile') || content.includes('cashmere') || content.includes('denim');
    case 'motorsport':
      return content.includes('rotor') || content.includes('dyno') || content.includes('gt3') || content.includes('nordschleife') || content.includes('drift') || content.includes('race') || content.includes('racing') || content.includes('telemetry') || content.includes('2jz') || content.includes('sim');
    case 'drones':
      return content.includes('fpv') || content.includes('drone') || content.includes('proximity') || content.includes('dive') || content.includes('swarm') || content.includes('altitude') || content.includes('8k');
    case 'crafts':
      return content.includes('damascus') || content.includes('forge') || content.includes('quench') || content.includes('steel') || content.includes('tourbillon') || content.includes('watch') || content.includes('horology') || content.includes('maki-e') || content.includes('wood') || content.includes('broadsword') || content.includes('joiner');
    case 'science':
      return content.includes('space') || content.includes('quantum') || content.includes('jwst') || content.includes('qkd') || content.includes('deep-sea') || content.includes('submersible') || content.includes('bioluminescence') || content.includes('narwhal') || content.includes('aeroponic') || content.includes('observatory') || content.includes('spectroscopy');
    case 'lifestyle':
      return content.includes('coffee') || content.includes('tea') || content.includes('chocolat') || content.includes('ceremony') || content.includes('roast') || content.includes('siphon');
    default:
      return true;
  }
}

export default function Videos() {
  const users = useAppStore((s: any) => s.users);
  const videos = useAppStore((s: any) => s.videos);
  const loadVideos = useAppStore((s: any) => s.loadVideos);
  const loadUserProfile = useAppStore((s: any) => s.loadUserProfile);
  const [formatTab, setFormatTab] = useState<'All' | 'short' | 'standard'>('All');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  useEffect(() => {
    for (const video of (videos || [])) {
      if (!users[video.authorId]) loadUserProfile(video.authorId);
    }
  }, [videos, users, loadUserProfile]);

  const filteredVideos = (videos || []).filter((v: any) => {
    const formatMatch = formatTab === 'All' || v.type === formatTab;
    const author = users[v.authorId];
    const genreMatch = matchesGenre(v, author, selectedGenre);
    return formatMatch && genreMatch;
  });

  const swiperVideos = filteredVideos.filter((v: any) => v.type === 'short');
  const activeSwiperList = swiperVideos.length > 0 ? swiperVideos : filteredVideos;

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Videos & Reels</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Stream short and long form content across all genres</p>
        </div>
        <UploadVideoDialog />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Format Selection Row */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
          {([
            { id: 'All' as const, label: '⚡ All Formats' },
            { id: 'short' as const, label: '🎬 Short Form (Reels)' },
            { id: 'standard' as const, label: '📹 Standard Videos' },
          ]).map((f) => (
            <button
              key={f.id}
              onClick={() => setFormatTab(f.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                formatTab === f.id ? "bg-primary text-primary-foreground glow-neon-primary" : "surface-1 text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Genre Category Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-1">
          {GENRE_CATEGORIES.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGenre(g.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap border",
                selectedGenre === g.id
                  ? "bg-foreground text-background border-foreground font-bold shadow-md"
                  : "surface-1 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {g.label}
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
          {filteredVideos.map((video: any) => {
            const author = users[video.authorId];

            return (
              <motion.div 
                variants={staggerItem}
                key={video.id} 
                className="surface-1 rounded-2xl overflow-hidden cursor-pointer group border border-border/40 hover:border-primary/40 transition-all duration-300"
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={() => {
                  const idx = activeSwiperList.findIndex((v: any) => v.id === video.id);
                  if (idx !== -1) setActiveReelIndex(idx);
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
                    {video.type === 'short' ? 'REEL' : 'VIDEO'}
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
            videos={activeSwiperList}
            initialIndex={activeReelIndex}
            onClose={() => setActiveReelIndex(null)}
          />
        )}
      </div>
    </div>
  );
}
