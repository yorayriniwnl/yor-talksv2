import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ImageIcon, Sparkles, Download, Type, 
  Smile, Flame, CheckCircle2, ShieldCheck, Wand2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function ThumbnailStudio() {
  const [headline, setHeadline] = useState('BHAI KYA HUYA?! 😱');
  const [subtitle, setSubtitle] = useState('1v4 IMPOSSIBLE CLUTCH IN BGMI');
  const [glowColor, setGlowColor] = useState('#f59e0b');

  const handleExportThumbnail = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🖼️ 4K Ultra-HD YouTube Gaming Thumbnail exported (3840x2160 PNG)!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer 4K YouTube Thumbnail Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">16:9 Canvas, Bold Hinglish 3D Strokes & High-CTR Glow Outlines</p>
          </div>
        </div>

        <Button
          onClick={handleExportThumbnail}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export 4K PNG
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* 16:9 Thumbnail Canvas */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-2xl">
            <div className="showcase-section-title">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3>16:9 4K Thumbnail Preview</h3>
            </div>

            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 border border-border/60 p-6 flex flex-col justify-between relative shadow-2xl">
              <div className="flex justify-between items-start">
                <span className="px-3 py-1 rounded-lg bg-red-600 font-display font-black text-xs text-white uppercase tracking-wider shadow-md">
                  🔥 LIVE CLUTCH
                </span>
                <span className="text-4xl">😱</span>
              </div>

              <div className="space-y-1">
                <h2
                  style={{ textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}` }}
                  className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-wide leading-tight"
                >
                  {headline}
                </h2>
                <p className="font-mono font-bold text-xs text-amber-300 uppercase tracking-widest">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl font-sans">
            <div className="showcase-section-title">
              <Type className="w-4 h-4 text-primary" />
              <h3>Text & CTR Visual Effects</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Headline Text (Hinglish/English):</span>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Subtitle / Gamemode Tag:</span>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="rounded-xl font-bold text-sm"
                />
              </div>

              <div className="pt-2">
                <span className="text-muted-foreground block mb-2">Neon Outline Glow Color:</span>
                <div className="flex gap-2">
                  {['#f59e0b', '#ec4899', '#06b6d4', '#10b981', '#ef4444'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setGlowColor(c)}
                      style={{ backgroundColor: c }}
                      className={cn("w-8 h-8 rounded-full shadow-md border-2 transition-transform active:scale-95", glowColor === c ? "border-white scale-110" : "border-transparent")}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
