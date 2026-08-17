import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  TrendingUp, Trophy, Plus, RotateCcw, Crown, Heart, Zap, Radio 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function DonoTrainStudio() {
  const [level, setLevel] = useState(3);
  const [percent, setPercent] = useState(72);

  const handleCopyOBSDonoTrain = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/dono-train?fps=60&theme=gold&sound=whistle`);
    toast.success('📋 OBS Studio Transparent 60FPS Dono Goal Train URL copied!');
  };

  const handleAddSub = (boost: number) => {
    sounds.playPop();
    setPercent((p) => {
      const next = p + boost;
      if (next >= 100) {
        sounds.playChime();
        triggerConfetti();
        setLevel(l => l + 1);
        toast.success(`🚂 DONO TRAIN LEVEL UPGRADED TO LEVEL ${level + 1}!`);
        return next - 100;
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Live Dono Goal Train Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Dynamic Goal Multipliers, Timer Extensions, Whistle SFX & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSDonoTrain}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Train URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Train HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Zap className="w-3.5 h-3.5" /> DONO TRAIN LEVEL {level} • {percent}% TO NEXT TIER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-amber-400">🚂 {percent}%</h2>
            <p className="font-mono text-xs text-muted-foreground">Train Timer: 04:45s remaining • +5m per Superchat</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAddSub(15)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              +1 Tier-1 Sub (+15%)
            </Button>
            <Button onClick={() => handleAddSub(35)} className="rounded-2xl font-bold text-xs bg-amber-500 text-black shadow-md">
              +₹500 Superchat (+35%)
            </Button>
            <Button onClick={() => { setPercent(0); setLevel(1); }} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Train
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
