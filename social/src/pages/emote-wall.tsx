import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smile, Sparkles, Copy, Sliders, 
  Send, Tv, Flame, Heart, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const DEFAULT_EMOTES = ['🇮🇳', '🔥', '🏆', '👑', '💥', '☕', '🎮', '💖', '🚀', '✨'];

export default function EmoteWallStudio() {
  const [activeEmotes, setActiveEmotes] = useState<string[]>(DEFAULT_EMOTES);
  const [burstCount, setBurstCount] = useState(25);

  const handleCopyBrowserSource = () => {
    sounds.playChime();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-wall?speed=fast&gravity=0.2`);
    toast.success('📋 OBS Studio 60FPS Transparent Emote Wall Browser URL copied to clipboard!');
  };

  const handleTriggerEmoteBurst = (emoji: string) => {
    sounds.playPop();
    triggerConfetti();
    toast.success(`💥 Emote Burst Triggered: ${emoji} x${burstCount} particles flying!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Smile className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Emote Wall & Sub Hype Explosion</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-Time Floating Chat Reactions, Particle Physics & OBS Browser Source</p>
          </div>
        </div>

        <Button
          onClick={handleCopyBrowserSource}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Browser URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Canvas Visualizer Simulation Box */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 text-center shadow-2xl space-y-6">
          <span className="text-xs font-mono text-muted-foreground uppercase font-bold tracking-widest block">Live Stream Overlay Emote Arena</span>

          <div className="h-64 rounded-2xl bg-zinc-950 border border-border/60 flex flex-wrap items-center justify-center gap-6 p-6 overflow-hidden relative shadow-inner">
            {DEFAULT_EMOTES.map((emoji, idx) => (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleTriggerEmoteBurst(emoji)}
                className="text-4xl hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] transition-all cursor-pointer select-none"
              >
                {emoji}
              </motion.button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {DEFAULT_EMOTES.map((e, idx) => (
              <Button
                key={idx}
                size="sm"
                variant="outline"
                onClick={() => handleTriggerEmoteBurst(e)}
                className="rounded-xl text-sm font-mono h-9 px-3"
              >
                Trigger {e}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
