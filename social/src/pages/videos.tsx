import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Play, Video as VideoIcon, UploadCloud, Link as LinkIcon, CheckCircle2, Eye, Radio, ScanLine } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import ReelsSwiper from '@/components/video/ReelsSwiper';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { CONTENT_CATEGORIES, resolveContentCategory, type ContentCategory } from '@/lib/content-category';
import { ContentCategoryBadge } from '@/components/content/ContentCategoryBadge';
import { api } from '@/lib/api-client';
import { useLocation, useRoute } from 'wouter';
import { OperatorPanel, SectionHeader, SignalLabel, StatusBadge } from '@/components/system';
import '@/styles/operator-discovery.css';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const releaseObjectUrl = () => {
    const url = objectUrlRef.current;
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    objectUrlRef.current = null;
  };

  useEffect(() => () => releaseObjectUrl(), []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (.mp4, .webm, .mov, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Video files must be 10 MB or smaller.');
      return;
    }

    releaseObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setSelectedFile(file);
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
    if (title.trim().length < 2) {
      setError('Add a title with at least 2 characters.');
      return;
    }

    setLoading(true);
    try {
      const uploaded = mode === 'file' && selectedFile ? await api.uploadMedia(selectedFile) : null;
      await createVideo({ 
        title: title.trim(), 
        videoUrl: uploaded?.url || finalVideoUrl,
        thumbnailUrl: uploaded?.thumbnailUrl?.startsWith('data:image/') ? uploaded.thumbnailUrl : finalThumb,
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
      setSelectedFile(null);
      releaseObjectUrl();
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
        <Button className="operator-video-upload-trigger">
          <Plus aria-hidden="true" /> Publish video
        </Button>
      </DialogTrigger>
      <DialogContent className="operator-video-upload-dialog max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl flex items-center gap-2">
            <VideoIcon aria-hidden="true" /> Publish a video
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

function formatPublishedDate(value?: string): string {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return formatDistanceToNow(date, { addSuffix: true });
}

export default function Videos() {
  const [, setLocation] = useLocation();
  const [, videoRouteParams] = useRoute<{ id: string }>('/videos/:id');
  const users = useAppStore((s: any) => s.users);
  const videos = useAppStore((s: any) => s.videos);
  const loadVideos = useAppStore((s: any) => s.loadVideos);
  const loadUserProfile = useAppStore((s: any) => s.loadUserProfile);
  const [formatTab, setFormatTab] = useState<'All' | 'short' | 'standard'>('All');
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | 'all'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  useEffect(() => {
    for (const video of (videos || [])) {
      if (!users[video.authorId]) loadUserProfile(video.authorId);
    }
  }, [videos, users, loadUserProfile]);

  const filteredVideos = useMemo(() => (videos || []).filter((video: any) => {
    const formatMatch = formatTab === 'All' || video.type === formatTab;
    const categoryMatch = selectedCategory === 'all' || resolveContentCategory(video.contentCategory).value === selectedCategory;
    const author = users[video.authorId];
    return formatMatch && categoryMatch && matchesGenre(video, author, selectedGenre);
  }), [videos, formatTab, selectedCategory, selectedGenre, users]);

  const activeSwiperList = filteredVideos;
  const totalViews = useMemo(() => (videos || []).reduce((sum: number, video: any) => sum + (video.views || 0), 0), [videos]);
  const reelCount = useMemo(() => (videos || []).filter((video: any) => video.type === 'short').length, [videos]);
  const hasActiveFilters = formatTab !== 'All' || selectedCategory !== 'all' || selectedGenre !== 'all';

  useEffect(() => {
    const routeId = videoRouteParams?.id;
    if (!routeId) {
      setActiveReelIndex(null);
      return;
    }
    const index = activeSwiperList.findIndex((video: any) => video.id === routeId);
    if (index !== -1) setActiveReelIndex(index);
  }, [videoRouteParams?.id, activeSwiperList]);

  const openVideo = (videoId: string) => {
    const index = activeSwiperList.findIndex((video: any) => video.id === videoId);
    if (index === -1) return;
    setActiveReelIndex(index);
    setLocation(`/videos/${videoId}`);
  };

  const closeViewer = () => {
    setActiveReelIndex(null);
    setLocation('/videos');
  };

  const resetFilters = () => {
    setFormatTab('All');
    setSelectedCategory('all');
    setSelectedGenre('all');
  };

  return (
    <div className="operator-video-page">
      <header className="operator-video-hero">
        <div className="operator-video-hero__copy">
          <SignalLabel>Watch surface // live queue</SignalLabel>
          <h1>Watch what the network is making.</h1>
          <p>Short reels for momentum. Full videos for the work behind it.</p>
        </div>
        <div className="operator-video-hero__action">
          <StatusBadge status="online">Playback ready</StatusBadge>
          <UploadVideoDialog />
        </div>
        <div className="operator-video-hero__metrics" aria-label="Video library summary">
          <div><Radio aria-hidden="true" /><span><strong>{(videos || []).length}</strong><small>published</small></span></div>
          <div><ScanLine aria-hidden="true" /><span><strong>{reelCount}</strong><small>reels</small></span></div>
          <div><Eye aria-hidden="true" /><span><strong>{totalViews.toLocaleString()}</strong><small>total views</small></span></div>
        </div>
      </header>

      <section aria-label="Video library" className="operator-video-main">
        <OperatorPanel className="operator-video-filters">
          <div className="operator-video-filters__head">
            <span>Refine watch queue</span>
            <strong>{filteredVideos.length} results</strong>
            {hasActiveFilters && <button type="button" onClick={resetFilters}>Clear filters</button>}
          </div>

          <div className="operator-video-filter-row">
            <span>Format</span>
            <div role="group" aria-label="Filter videos by format">
              {([
                { id: 'All' as const, label: 'All' },
                { id: 'short' as const, label: 'Reels' },
                { id: 'standard' as const, label: 'Full videos' },
              ]).map(format => (
                <button type="button" key={format.id} onClick={() => setFormatTab(format.id)} aria-pressed={formatTab === format.id}>{format.label}</button>
              ))}
            </div>
          </div>

          <div className="operator-video-filter-row">
            <span>Channel</span>
            <div role="group" aria-label="Filter videos by content channel">
              <button type="button" onClick={() => setSelectedCategory('all')} aria-pressed={selectedCategory === 'all'}>All channels</button>
              {CONTENT_CATEGORIES.map(category => (
                <button type="button" key={category.value} onClick={() => setSelectedCategory(category.value)} aria-pressed={selectedCategory === category.value}>
                  <span aria-hidden="true">{category.emoji}</span> {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="operator-video-filter-row">
            <span>Interest</span>
            <div role="group" aria-label="Filter videos by interest">
              {GENRE_CATEGORIES.map(genre => (
                <button type="button" key={genre.id} onClick={() => setSelectedGenre(genre.id)} aria-pressed={selectedGenre === genre.id}>{genre.label}</button>
              ))}
            </div>
          </div>
        </OperatorPanel>

        <section className="operator-video-library" aria-labelledby="watch-queue-title">
          <SectionHeader
            id="watch-queue-title"
            eyebrow="Curated playback"
            title="Your watch queue"
            description={filteredVideos.length ? `${filteredVideos.length} videos matched to the active filters.` : 'No videos match this combination yet.'}
          />

          {filteredVideos.length === 0 ? (
            <OperatorPanel className="operator-discovery-empty">
              <VideoIcon aria-hidden="true" />
              <h3>Your queue is empty</h3>
              <p>Reset the filters or publish the first video in this channel.</p>
              {hasActiveFilters && <button type="button" onClick={resetFilters}>Reset filters</button>}
            </OperatorPanel>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="operator-video-grid">
              {filteredVideos.map((video: any, index: number) => {
                const author = users[video.authorId];
                return (
                  <motion.button
                    type="button"
                    variants={staggerItem}
                    key={video.id}
                    className="operator-video-card"
                    data-format={video.type}
                    data-featured={index === 0 || undefined}
                    onClick={() => openVideo(video.id)}
                    aria-label={`Watch ${video.title}`}
                  >
                    <span className="operator-video-card__media">
                      <img src={video.thumbnailUrl} alt="" />
                      <span className="operator-video-card__play"><Play aria-hidden="true" /></span>
                      <span className="operator-video-card__format">{video.type === 'short' ? 'Reel' : 'Video'}</span>
                      <ContentCategoryBadge value={video.contentCategory} className="operator-video-card__category" />
                    </span>
                    <span className="operator-video-card__body">
                      <span className="operator-video-card__title">{video.title}</span>
                      <span className="operator-video-card__creator">
                        <Avatar><AvatarImage src={author?.avatarUrl} /><AvatarFallback>{(author?.displayName ?? '?').charAt(0)}</AvatarFallback></Avatar>
                        <span><strong>{author?.displayName ?? 'Unknown creator'}</strong><small>@{author?.username ?? 'unknown'}</small></span>
                      </span>
                      <span className="operator-video-card__meta"><span><Eye aria-hidden="true" /> {video.views?.toLocaleString() ?? 0}</span><span>{formatPublishedDate(video.createdAt)}</span></span>
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </section>

        {activeReelIndex !== null && activeSwiperList.length > 0 && (
          <ReelsSwiper videos={activeSwiperList} initialIndex={activeReelIndex} onClose={closeViewer} />
        )}
      </section>
    </div>
  );
}
