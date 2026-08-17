import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Video, Film, Download, CheckCircle2, 
  Share2, Volume2, Type, Flame, Play, Scissors 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ClipMoment {
  id: string;
  title: string;
  duration: string;
  hypeScore: number;
  subtitle: string;
}

const MOMENTS: ClipMoment[] = [
  { id: 'm-1', title: '1v4 Clutch vs Soul Clan 🔥', duration: '0:28', hypeScore: 98, subtitle: 'Bhai kya hi reflex mara! Ek number!' },
  { id: 'm-2', title: 'AWM No-Scope Headshot 🎯', duration: '0:15', hypeScore: 94, subtitle: 'Lafda khatam! Direct lobby bheja!' },
  { id: 'm-3', title: 'Desi Dhol Superchat ₹5001 Celebration 🥁', duration: '0:42', hypeScore: 96, subtitle: 'Arey Shagan aa gaya! Dhol bajao!' },
];

export default function AIHighlightsStudio() {
  const [clips, setClips] = useState<ClipMoment[]>(MOMENTS);
  const [captionStyle, setCaptionStyle] = useState<'hinglish' | 'devnagari' | 'cyber'>('hinglish');

  const handleExportReel = (title: string) => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`🎬 9:16 AI Reel "${title}" rendered with ${captionStyle.toUpperCase()} burned-in subtitles! Exported to Yor Talks Reels.`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer AI Highlights & Auto-Subtitler</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Audio Spike Clutch Detection & Hinglish Animated Word Captions</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Film className="w-3.5 h-3.5 text-pink-400" /> Auto-Cut: 9:16 Shorts
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Caption Style Switcher */}
        <div className="surface-1 p-4 rounded-3xl border border-border/40 flex items-center justify-between shadow-xl font-mono text-xs">
          <span className="text-muted-foreground">SUBTITLE ENGINE STYLE:</span>
          <div className="flex gap-2">
            {['hinglish', 'devnagari', 'cyber'].map((style) => (
              <Button
                key={style}
                size="sm"
                variant={captionStyle === style ? 'default' : 'outline'}
                onClick={() => {
                  sounds.playPop();
                  setCaptionStyle(style as any);
                }}
                className={cn("rounded-xl text-xs uppercase font-bold", captionStyle === style && "bg-primary text-primary-foreground")}
              >
                {style}
              </Button>
            ))}
          </div>
        </div>

        {/* AI Highlight Moments */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Scissors className="w-4 h-4 text-primary" />
            <h3>AI Extracted Viral Moments</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col justify-between shadow-xl hover:border-primary/50 transition-all space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-bold">
                      HYPE: {clip.hypeScore}%
                    </span>
                    <span className="text-muted-foreground">{clip.duration}</span>
                  </div>

                  <h3 className="font-display font-bold text-base text-foreground">{clip.title}</h3>

                  <div className="p-3 rounded-2xl bg-zinc-950 border border-border/40 font-mono text-xs text-amber-300">
                    "{clip.subtitle}"
                  </div>
                </div>

                <Button
                  onClick={() => handleExportReel(clip.title)}
                  className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Export 9:16 Reel
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
