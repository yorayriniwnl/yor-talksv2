import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Sparkles, Copy, 
  Crown, Plus, Minus, CheckCircle2, Zap, Gift, Trophy 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function GoalMeterStudio() {
  const [currentSubs, setCurrentSubs] = useState(840);
  const [targetSubs, setTargetSubs] = useState(1000);
  const [goalTitle, setGoalTitle] = useState('24-Hour Non-Stop Stream Marathon + 5x Gaming Rig Giveaway');

  const progressPct = Math.min(100, Math.round((currentSubs / targetSubs) * 100));

  const handleCopyOBSGoal = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/goal-meter?title=${encodeURIComponent(goalTitle)}&cur=${currentSubs}&target=${targetSubs}`);
    toast.success('📋 OBS Studio Transparent 60FPS Goal Milestone Meter URL copied!');
  };

  const handleAddSubs = (amount: number) => {
    sounds.playPop();
    const next = currentSubs + amount;
    setCurrentSubs(next);
    if (next >= targetSubs) {
      sounds.playChime();
      triggerConfetti();
      toast.success('🎉 GOAL MILESTONE REACHED! 24H STREAM UNLOCKED!');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Goal Milestone Meter Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Dynamic Sub/Follower Progress Bar, Milestone Rewards & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSGoal}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Goal Source
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Live Goal Display */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Crown className="w-3.5 h-3.5" /> OFFICIAL STREAM MILESTONE • {progressPct}% COMPLETED
          </div>

          <h2 className="font-display font-black text-2xl md:text-3xl text-foreground max-w-xl mx-auto">{goalTitle}</h2>

          {/* Progress Bar */}
          <div className="max-w-xl mx-auto space-y-2">
            <div className="flex justify-between font-mono text-sm font-bold">
              <span className="text-primary">{currentSubs} Subs</span>
              <span className="text-amber-400">{targetSubs} Goal Target</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-5 overflow-hidden border border-amber-500/30 p-0.5">
              <div 
                className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 h-full rounded-full transition-all duration-300 shadow-md"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Action Increment */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAddSubs(10)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              +10 Subs
            </Button>
            <Button onClick={() => handleAddSubs(50)} className="rounded-2xl font-bold text-xs bg-amber-500 text-black shadow-md">
              +50 Subs
            </Button>
            <Button onClick={() => setCurrentSubs(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Goal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
