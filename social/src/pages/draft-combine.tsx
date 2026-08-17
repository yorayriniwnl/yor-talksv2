import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Activity, Sparkles, CheckCircle2, 
  Send, ShieldCheck, Download, Award, Zap, HeartPulse 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface BenchmarkStat {
  id: string;
  name: string;
  score: string;
  percentile: string;
  rating: 'S+' | 'S' | 'A+';
}

const STATS: BenchmarkStat[] = [
  { id: 'b-1', name: 'Reaction Flick Latency', score: '162 ms', percentile: 'Top 0.8% in India', rating: 'S+' },
  { id: 'b-2', name: '1v1 Crosshair Precision', score: '97.4%', percentile: 'Top 1.2%', rating: 'S+' },
  { id: 'b-3', name: 'Utility Lineup Accuracy', score: '94.8%', percentile: 'Top 3.5%', rating: 'S' },
  { id: 'b-4', name: 'Clutch Heart Rate BPM', score: '72 BPM', percentile: 'Calm Zen Tier', rating: 'S+' },
];

export default function DraftCombine() {
  const [scoutIndex, setScoutIndex] = useState(98.4);
  const [isDispatched, setIsDispatched] = useState(false);

  const handleDispatchProspect = () => {
    sounds.playChime();
    triggerConfetti();
    setIsDispatched(true);
    toast.success('🎯 Official Scout Prospect Card dispatched to GodLike, S8UL, Revenant & Global Esports!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Draft Combine & Scout Benchmark</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Reaction Latency, Aim Precision & Clutch Stress Stability Index</p>
          </div>
        </div>

        <Button
          onClick={handleDispatchProspect}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Dispatch to Top 10 Teams
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Aggregate Scout Rating Scorecard */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 text-center shadow-2xl space-y-2 relative overflow-hidden bg-gradient-to-b from-amber-500/10 to-transparent">
          <span className="text-xs font-mono uppercase text-muted-foreground tracking-widest block">National Draft Prospect Rating</span>
          <h2 className="font-display font-black text-6xl text-primary drop-shadow-md">{scoutIndex} / 100</h2>
          <p className="text-xs font-mono text-emerald-400 font-bold">Tier 1 Pro Roster Ready • Top 50 in India</p>
        </div>

        {/* 4 Core Benchmark Drills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {STATS.map((s) => (
            <div
              key={s.id}
              className="surface-1 p-6 rounded-3xl border border-border/40 flex items-center justify-between shadow-xl"
            >
              <div className="space-y-1">
                <span className="text-[0.65rem] font-mono text-muted-foreground block">{s.percentile}</span>
                <h4 className="font-display font-bold text-base text-foreground">{s.name}</h4>
                <strong className="font-mono font-bold text-xl text-primary">{s.score}</strong>
              </div>

              <span className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 font-display font-black text-lg flex items-center justify-center shadow-md">
                {s.rating}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
