import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Sparkles, Copy, 
  Zap, Trophy, Plus, RotateCcw, Crown, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function StreakMeterStudio() {
  const [streakCount, setStreakCount] = useState(48);
  const [multiplier, setMultiplier] = useState(4.8);

  const handleCopyOBSStreak = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/streak-meter?threshold=20&fps=60&theme=inferno`);
    toast.success('📋 OBS Studio Transparent 60FPS Emote Combo Streak Fire Meter URL copied!');
  };

  const handleAddHype = (count: number) => {
    sounds.playPop();
    setStreakCount((c) => {
      const next = c + count;
      setMultiplier(Number((next * 0.1).toFixed(1)));
      if (next >= 100) {
        sounds.playChime();
        triggerConfetti();
        toast.success('🔥 ULTRA 10.0x INFERNO DRAGON HYPE STREAK UNLOCKED!');
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-red-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Live Chat Combo Streak Meter</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Chat Velocity Fire Gauges, Emote Combo Multipliers & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSStreak}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Streak URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Live Flame Streak HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 font-mono text-xs font-bold">
            <Flame className="w-3.5 h-3.5" /> LEVEL 4 INFERNO STREAK • {multiplier}x MULTIPLIER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-orange-400">{streakCount}x 🔥</h2>
            <p className="font-mono text-xs text-muted-foreground">Matching Chat Emote Velocity per 3.00s</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAddHype(5)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              +5 Emote Spike
            </Button>
            <Button onClick={() => handleAddHype(20)} className="rounded-2xl font-bold text-xs bg-orange-600 text-white shadow-md">
              +20 Raid Explosion
            </Button>
            <Button onClick={() => { setStreakCount(0); setMultiplier(1.0); }} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Meter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
