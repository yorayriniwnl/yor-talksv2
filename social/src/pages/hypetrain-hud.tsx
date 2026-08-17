import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Zap, Trophy, Sparkles, CheckCircle2, 
  Send, Tv, Gift, TrendingUp, Gauge 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function HypeTrainHUD() {
  const [level, setLevel] = useState(4);
  const [percent, setPercent] = useState(86);
  const [multiplier, setMultiplier] = useState('2.5x Bonus XP');

  const handleBoostHype = () => {
    sounds.playChime();
    triggerConfetti();
    setPercent(p => {
      if (p + 10 >= 100) {
        setLevel(l => Math.min(5, l + 1));
        return 15;
      }
      return p + 10;
    });
    toast.success('🚂 HYPE TRAIN CHARGED! Super-Emotes unlocked for all stream viewers!');
  };

  const handleDispatchHUD = () => {
    sounds.playPop();
    toast.info('📺 Hype Train Level 5 Gauge Widget dispatched to OBS Studio Overlay Browser Source!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Hype Train Director</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Dynamic Level 1-5 Hype Gauges, Emote Explosions & OBS Transparent HUD</p>
          </div>
        </div>

        <Button
          onClick={handleDispatchHUD}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Broadcast to OBS HUD
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Gauge Card */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 text-center shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-xs inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" /> HYPE TRAIN LEVEL {level} ACTIVE
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">{multiplier}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-sm font-bold">
              <span className="text-muted-foreground">Progress to Level {Math.min(5, level + 1)}</span>
              <span className="text-amber-400 font-display font-black text-2xl">{percent}%</span>
            </div>

            <div className="w-full bg-muted/40 h-5 rounded-full overflow-hidden p-1 border border-border/40">
              <div
                style={{ width: `${percent}%` }}
                className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-primary rounded-full transition-all duration-500 shadow-lg"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleBoostHype}
              className="rounded-2xl font-bold text-sm h-12 px-6 bg-gradient-to-r from-amber-500 to-rose-600 text-white glow-neon-primary shadow-lg"
            >
              <Zap className="w-4 h-4 mr-1.5" /> Boost Hype Train (+10% Energy)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
