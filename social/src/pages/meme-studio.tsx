import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Smile, Download, Share2, Sparkles, Image as ImageIcon, 
  Type, Palette, Trash2, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const MEME_TEMPLATES = [
  { id: 't1', name: 'Cyberpunk Bengaluru Dev', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop' },
  { id: 't2', name: 'BGMI 1v4 Last Man Standing', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop' },
  { id: 't3', name: 'Deploying Code on Friday', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop' },
  { id: 't4', name: 'Mumbai Monsoons & Gaming', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop' },
];

const STICKERS = ['✨', '🔱', '🏆', '🔥', '👑', '🇮🇳', '🚀', '☕'];

export default function MemeStudio() {
  const addPost = useAppStore((s) => s.addPost);
  const [selectedTemplate, setSelectedTemplate] = useState(MEME_TEMPLATES[0]);
  const [topText, setTopText] = useState('WHEN YOU CLUTCH THE 1v4');
  const [bottomText, setBottomText] = useState('WITHOUT TAKING A SINGLE BULLET');
  const [fontSize, setFontSize] = useState(32);
  const [selectedSticker, setSelectedSticker] = useState<string | null>('🔥');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw canvas whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedTemplate.url;

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Text styling
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      ctx.font = `900 ${fontSize}px Impact, sans-serif`;

      // Draw Top Text
      if (topText.trim()) {
        ctx.strokeText(topText.toUpperCase(), canvas.width / 2, 50);
        ctx.fillText(topText.toUpperCase(), canvas.width / 2, 50);
      }

      // Draw Bottom Text
      if (bottomText.trim()) {
        ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, canvas.height - 30);
        ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, canvas.height - 30);
      }

      // Draw Sticker
      if (selectedSticker) {
        ctx.font = '48px sans-serif';
        ctx.fillText(selectedSticker, canvas.width - 50, 60);
      }
    };
  }, [selectedTemplate, topText, bottomText, fontSize, selectedSticker]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    sounds.playPop();
    triggerConfetti();

    const link = document.createElement('a');
    link.download = `yor-talks-meme-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Meme downloaded in high-resolution!');
  };

  const handlePostToFeed = () => {
    sounds.playChime();
    triggerConfetti();
    addPost(`🔥 Freshly baked meme created in Yor Meme Studio!\n\n"${topText} — ${bottomText}"`, [selectedTemplate.url]);
    toast.success('🎉 Published meme directly to your Yor Talks feed!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Smile className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Meme & Sticker Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Create, Caption & Publish Memes Directly to Feeds</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleDownload}
            variant="outline"
            className="rounded-2xl font-bold text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Download
          </Button>

          <Button
            size="sm"
            onClick={handlePostToFeed}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" /> Post to Feed
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Canvas Preview Column */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="surface-1 p-4 rounded-3xl border border-border/40 shadow-2xl overflow-hidden max-w-full">
              <canvas
                ref={canvasRef}
                width={480}
                height={480}
                className="w-full max-w-[420px] aspect-square rounded-2xl border border-border/60 block bg-black"
              />
            </div>
          </div>

          {/* Controls Editor Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Top & Bottom Text Inputs */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <Type className="w-4 h-4 text-primary" />
                <h3>Meme Captions</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase text-muted-foreground">Top Caption Text</Label>
                <Input
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                  className="rounded-xl font-bold text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase text-muted-foreground">Bottom Caption Text</Label>
                <Input
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  className="rounded-xl font-bold text-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Font Size</span>
                  <span className="text-primary font-bold">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="48"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>

            {/* Template Chooser */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <h3>Select Trending Template</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {MEME_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedTemplate(tpl);
                    }}
                    className={cn(
                      "p-2 rounded-2xl border text-left transition-all duration-200",
                      selectedTemplate.id === tpl.id ? "border-primary bg-primary/20 shadow-md" : "border-border/40 hover:border-border"
                    )}
                  >
                    <div className="aspect-video rounded-xl overflow-hidden mb-1.5 bg-black">
                      <img src={tpl.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-[0.68rem] text-foreground block truncate">{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stickers Tray */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-3 shadow-sm">
              <div className="showcase-section-title">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3>Desi Hologram Sticker</h3>
              </div>

              <div className="flex gap-2 flex-wrap">
                {STICKERS.map((stk) => (
                  <button
                    key={stk}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedSticker(selectedSticker === stk ? null : stk);
                    }}
                    className={cn(
                      "w-11 h-11 rounded-2xl text-xl flex items-center justify-center border transition-all",
                      selectedSticker === stk ? "border-amber-400 bg-amber-500/20 scale-110 shadow" : "border-border/40 hover:bg-muted/40"
                    )}
                  >
                    {stk}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
