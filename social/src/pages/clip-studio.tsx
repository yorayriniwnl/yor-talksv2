import { useEffect, useState } from 'react';
import { Scissors, Download, Share2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { uploadApprovedMedia } from '@/lib/media-upload';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { type ContentCategory } from '@/lib/content-category';

export default function ClipStudio() {
  const createVideo = useAppStore((s) => s.createVideo);
  const [captionText, setCaptionText] = useState('Untitled highlight');
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

  const handleDownloadSource = () => {
    if (!selectedFile || !previewUrl) {
      toast.info('Choose a source video before downloading it.');
      return;
    }
    const link = document.createElement('a');
    link.href = previewUrl;
    const extension = selectedFile.name.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0] ?? '';
    link.download = `yor-clip-original-${Date.now()}${extension}`;
    link.click();
    sounds.playChime();
    toast.info('Original source downloaded. The 9:16 framing and title overlay are preview-only.');
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
    try {
      const uploaded = await uploadApprovedMedia(selectedFile, 'video');
      await createVideo({
        title: captionText.trim() || 'Yor Clip Studio highlight',
        mediaId: uploaded.mediaId,
        type: 'short',
        contentCategory,
        contentRating,
      });
      sounds.playChime();
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
            <h1 className="text-xl font-bold font-display text-foreground">Clip Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Preview and publish your original clip to Reels</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => void handlePostToReels()}
            disabled={publishing}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" /> Publish source to Reels
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Source preview column */}
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

                {/* Preview labels describe the source and its display-only crop. */}
                <div className="relative z-10 flex justify-between items-center">
                  <span className="px-3 py-1 rounded-full bg-black/70 text-white text-[0.65rem] font-mono font-bold shadow">
                    SOURCE PREVIEW
                  </span>
                  <span className="text-[0.65rem] font-mono text-white/80 bg-black/60 px-2.5 py-0.5 rounded-full">
                    9:16 DISPLAY
                  </span>
                </div>

                {/* Display-only title overlay */}
                <div className="relative z-10 text-center space-y-1 mb-6">
                  <h4 className="font-display font-black text-xl text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] uppercase tracking-wider">
                    {captionText}
                  </h4>
                </div>
              </div>
            </div>
          </div>

          {/* Editor Controls Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Reel title input */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <Type className="w-4 h-4 text-primary" />
                <h3>Reel title</h3>
              </div>

              <Input
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                placeholder="Enter a title for your Reel"
                maxLength={120}
                aria-label="Reel title"
                className="rounded-xl font-bold font-display text-sm uppercase h-11"
              />
            </div>

            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-3 shadow-sm">
              <Label htmlFor="clip-source-video" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source video</Label>
              <Input id="clip-source-video" type="file" accept="video/*" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="rounded-xl" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : 'Choose a clip you own. Publishing sends the original file through the configured media service.'}
              </p>
            </div>

            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-3 shadow-sm">
              <ContentCategorySelect id="clip-content-category" value={contentCategory} onChange={setContentCategory} />
              <ContentRatingSelect id="clip-content-rating" value={contentRating} onChange={setContentRating} />
              <p className="text-xs leading-relaxed text-muted-foreground">Choose how this highlight is classified before it becomes visible in the global feed.</p>
            </div>
            <p className="rounded-2xl border border-border/40 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">This release publishes the original video with your title as its Reel title. The vertical crop and title overlay are previews and are not rendered into the video. Cropping, caption burn-in, and audio mixing are not available here.</p>

            <Button
              onClick={handleDownloadSource}
              className="w-full rounded-2xl font-bold text-xs h-12 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Download className="w-4 h-4 mr-2" /> Download original source
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
