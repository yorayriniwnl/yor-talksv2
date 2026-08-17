import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Play, RotateCcw, Sparkles, CheckCircle2, Utensils, Star, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGulabJamun() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(5200);
  const [stage, setStage] = useState<'raw_dough' | 'frying' | 'golden_brown' | 'syrup_soak' | 'served'>('raw_dough');
  const [syrupSweetness, setSyrupSweetness] = useState('Saffron & Rose Cardamom');

  const handleRollKhoyaBalls = () => {
    if (stage !== 'raw_dough') return;
    sounds.playPop();
    setStage('frying');
    toast.info('🧈 Smooth mawa khoya dough balls dropped into hot pure desi ghee kadhai!');
  };

  const handleFryGoldenBrown = () => {
    if (stage !== 'frying') return;
    sounds.playChime();
    setStage('golden_brown');
    toast.info('🔥 Sizzled to deep mahogany golden brown perfection!');
  };

  const handleSoakChashni = () => {
    if (stage !== 'golden_brown') return;
    sounds.playPop();
    setStage('syrup_soak');
    toast.info('🍯 Plunged into warm saffron-rose cardamom sugar syrup (Chashni)!');
  };

  const handleGarnishAndServe = () => {
    if (stage !== 'syrup_soak') return;
    sounds.playChime();
    triggerConfetti();
    setStage('served');
    setScore((s) => {
      const nextScore = s + 400;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('🌟 MELT-IN-MOUTH GULAB JAMUN! Garnished with silver vark & sliced pistachios (+400 Pts)');
  };

  const handleNewJamunBatch = () => {
    sounds.playPop();
    setStage('raw_dough');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Gulab Jamun Sugar Dip Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Mawa Dough Roll, Ghee Fry, Cardamom Chashni & Pista Flakes</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Sweet Master Score</span>
          <strong className="text-amber-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Batch Score</span>
          <span className="font-display font-black text-xl text-primary">{score} Pts</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Chashni Infusion</span>
          <span className="font-display font-bold text-sm text-amber-400">🍯 Saffron 1-Taar</span>
        </div>
      </div>

      {/* Interactive Sweet Kadhai / Chashni Canvas View */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          stage === 'raw_dough' ? "border-amber-200/40 bg-amber-100/10" :
          stage === 'frying' ? "border-amber-500 bg-amber-500/20 scale-105 animate-pulse" :
          stage === 'golden_brown' ? "border-amber-800 bg-gradient-to-tr from-amber-900 to-amber-700 scale-110 shadow-amber-900/50" :
          stage === 'syrup_soak' ? "border-amber-400 bg-gradient-to-tr from-amber-600 to-rose-600 scale-110 shadow-rose-900/50" :
          "border-emerald-500 bg-gradient-to-tr from-amber-700 to-emerald-600 scale-105"
        )}>
          {stage === 'raw_dough' && <span className="font-mono text-xs text-amber-200">🟡 Mawa Dough Rolled</span>}
          {stage === 'frying' && <span className="font-display font-bold text-amber-300">🔥 Desi Ghee Frying</span>}
          {stage === 'golden_brown' && <span className="font-display font-bold text-amber-100">🟤 Deep Golden Brown</span>}
          {stage === 'syrup_soak' && <span className="font-display font-bold text-amber-200">🍯 Soaking Warm Chashni</span>}
          {stage === 'served' && <span className="font-display font-bold text-white">✨ Sliced Pista Served!</span>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-2">
        {stage === 'raw_dough' && (
          <Button
            onClick={handleRollKhoyaBalls}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🟡 Step 1: Drop Mawa Balls in Hot Desi Ghee
          </Button>
        )}

        {stage === 'frying' && (
          <Button
            onClick={handleFryGoldenBrown}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🔥 Step 2: Sizzle to Mahogany Golden Brown
          </Button>
        )}

        {stage === 'golden_brown' && (
          <Button
            onClick={handleSoakChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🍯 Step 3: Plunge in Cardamom-Saffron Chashni
          </Button>
        )}

        {stage === 'syrup_soak' && (
          <Button
            onClick={handleGarnishAndServe}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 to-emerald-500 text-black shadow-lg"
          >
            ✨ Step 4: Garnish with Pista Flakes & Serve
          </Button>
        )}

        {stage === 'served' && (
          <Button
            onClick={handleNewJamunBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Prepare Next Royal Halwai Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
