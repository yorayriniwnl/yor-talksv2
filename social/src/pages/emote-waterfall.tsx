import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Smile, Flame, Heart, Zap, Crown, Award, Play 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteWaterfallStudio() {
  const [emotes] = useState(['🔥', '👑', '🇮🇳', '☕', '⚡', '🎉', '🏆', '💎', '🚀', '🌟', '🎮', '💯']);

  const handleCopyOBSWaterfall = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-waterfall?speed=fast&density=high&fps=60`);
    toast.success('📋 OBS Studio Transparent 60FPS Emote Waterfall Source URL copied!');
  };

  const handleTriggerEmoteBurst = () => {
    sounds.playPop();
    triggerConfetti();
    toast.info('🎆 Emote Waterfall Shower Burst triggered on live broadcast!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Smile className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Chat Emote Waterfall Cascade Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Streamer Chat Reaction Cascades, Gravity Drops & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSWaterfall}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Waterfall URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Waterfall Preview */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 h-80 flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 font-mono text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> 60FPS CHAT WATERFALL OVERLAY
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center text-4xl">
            {emotes.map((em, i) => (
              <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                {em}
              </span>
            ))}
          </div>

          <div className="pt-4 flex items-center gap-3">
            <Button
              onClick={handleTriggerEmoteBurst}
              className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md"
            >
              <Zap className="w-3.5 h-3.5 mr-1" /> Test Waterfall Burst
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
