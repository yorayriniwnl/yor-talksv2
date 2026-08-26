import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Film, Scissors, Play, Pause, Download, Share2,
  Sparkles, Sliders, Flame, Type, Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { type ContentCategory } from '@/lib/content-category';

export default function ClipStudio() {
  const createVideo = useAppStore((s) => s.createVideo);
  const [isPlaying, setIsPlaying] = useState(false);
  const [captionText, setCaptionText] = useState('WHAT A CLUTCH 1v4 ACE BY GODLIKE! 🔥');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [selectedSFX, setSelectedSFX] = useState<string | null>(null);
  const [contentCategory, setContentCategory] = useState<ContentCategory | ''>('');
  const [contentRating, setContentRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
  const [publishing, setPublishing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleExportReel = () => {
    if (!selectedFile || !previewUrl) {
      toast.info('Choose a source video first. Export is unavailable without creator media.');
      return;
    }
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `yor-clip-source-${Date.now()}${selectedFile.name.slice(selectedFile.name.lastIndexOf('.')) || '.webm'}`;
    link.click();
    sounds.playChime();
    toast.info('Source clip downloaded. Timeline rendering, SFX mixing, and 9:16 transcoding remain preview-only.');
  };

  const handlePostToReels = async () => {
    if (!contentCategory) {
      toast.error('Choose a category before publishing this highlight.');
      return;
    }
    if (!selectedFile) {
      toast.error('Choose a source video before publishing this highlight.');
      return;
    }
    setPublishing(true);
    sounds.playChime();
    try {
      const uploaded = await api.uploadMedia(selectedFile);
      await createVideo({
        title: captionText.trim() || 'Yor Clip Studio highlight',
        videoUrl: uploaded.url,
        thumbnailUrl: uploaded.thumbnailUrl,
        type: 'short',
        contentCategory,
        contentRating,
      });
      toast.success('Highlight uploaded and published to Reels.');
      setSelectedFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish this highlight');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator Clip & Highlight Cutter</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Convert Stream VODs into Viral 9:16 Reels & Shorts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => void handlePostToReels()}
            disabled={publishing}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" /> Post to Reels
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Video Preview Canvas Column */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="surface-1 rounded-3xl p-4 border border-border/40 shadow-2xl overflow-hidden w-full max-w-[320px] relative">
              <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-black relative flex flex-col justify-between p-4">
                {previewUrl ? (
                  <video src={previewUrl} aria-label="Selected clip preview" className="absolute inset-0 w-full h-full object-cover opacity-80" controls muted playsInline />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-indigo-950 to-black px-8 text-center text-xs font-mono text-zinc-400">
                    Select a source video to preview your clip.
                  </div>
                )}

                {/* Top Badge */}
                <div className="relative z-10 flex justify-between items-center">
                  <span className="px-3 py-1 rounded-full bg-red-600/90 text-white text-[0.65rem] font-mono font-bold flex items-center gap-1.5 shadow">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" /> BGMI CLUTCH
                  </span>
                  <span className="text-[0.65rem] font-mono text-white/80 bg-black/60 px-2.5 py-0.5 rounded-full">
                    60 FPS
                  </span>
                </div>

                {/* Animated Subtitle Caption Overlay */}
                <div className="relative z-10 text-center space-y-1 mb-6">
                  <h4 className="font-display font-black text-xl text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] uppercase tracking-wider animate-pulse">
                    {captionText}
                  </h4>
                  <span className="text-[0.65rem] font-mono font-bold text-white bg-black/70 px-3 py-0.5 rounded-full">
                    YOR CLIPS · CLUTCH GOD #01
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Editor Controls Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Caption Input */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <Type className="w-4 h-4 text-primary" />
                <h3>Animated Caption Text</h3>
              </div>

              <Input
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                placeholder="TYPE VIRAL STREAM HIGHLIGHT CAPTION..."
                className="rounded-xl font-bold font-display text-sm uppercase h-11"
              />
            </div>

            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-3 shadow-sm">
              <Label htmlFor="clip-source-video" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source video</Label>
              <Input id="clip-source-video" type="file" accept="video/*" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="rounded-xl" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : 'Upload the clip you own. The file is sent to secure media storage when you publish.'}
              </p>
            </div>

            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-3 shadow-sm">
              <ContentCategorySelect id="clip-content-category" value={contentCategory} onChange={setContentCategory} />
              <ContentRatingSelect id="clip-content-rating" value={contentRating} onChange={setContentRating} />
              <p className="text-xs leading-relaxed text-muted-foreground">Choose how this highlight is classified before it becomes visible in the global feed.</p>
            </div>

            {/* Audio SFX Insert */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <Music className="w-4 h-4 text-amber-400" />
                <h3>Clutch Sound FX Punch</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Airhorn Blast 📢', sound: 'pop' },
                  { name: 'Sitar Cyber Drop 🪕', sound: 'chime' },
                  { name: 'Stadium Crowd Roar 🏟️', sound: 'celebrate' },
                  { name: 'Matrix Glitch ⚡', sound: 'glitch' },
                ].map((sfx) => (
                  <button
                    key={sfx.name}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedSFX(sfx.name);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-bold transition-all text-left",
                      selectedSFX === sfx.name ? "border-primary bg-primary/20 shadow" : "border-border/40 hover:bg-muted/40"
                    )}
                  >
                    {sfx.name}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleExportReel}
              className="w-full rounded-2xl font-bold text-xs h-12 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Download className="w-4 h-4 mr-2" /> Export 9:16 Vertical Highlight Reel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
