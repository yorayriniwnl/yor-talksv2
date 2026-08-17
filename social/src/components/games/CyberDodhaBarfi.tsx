import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberDodhaBarfi() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(24000);
  const [step, setStep] = useState<'sprout' | 'roast' | 'nuts' | 'slice' | 'served'>('sprout');

  const handleRoastSproutedWheat = () => {
    if (step !== 'sprout') return;
    sounds.playPop();
    setStep('roast');
    toast.info('🌾 Roasted sprouted wheat flour (anghakar) in pure desi ghee into rich aroma!');
  };

  const handleSimmerMilkReduction = () => {
    if (step !== 'roast') return;
    sounds.playPop();
    setStep('nuts');
    toast.info('🥛 Simmered whole milk & caramelized jaggery chashni until dark mahogany brown!');
  };

  const handleFoldDryFruits = () => {
    if (step !== 'nuts') return;
    sounds.playPop();
    setStep('slice');
    toast.info('🌰 Folded cracked walnuts, roasted cashews, pistachios & cardamom fudge!');
  };

  const handleSliceDodhaSquares = () => {
    if (step !== 'slice') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1020;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL PUNJABI DODHA BARFI SLICED & SERVED! (+1020 Pts)');
  };

  const handleNewDodhaBatch = () => {
    sounds.playPop();
    setStep('sprout');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-900 via-amber-800 to-yellow-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kotkapura Dodha Barfi Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Sprouted Wheat Ghee Roast, Mahogany Caramel, Walnut Fudge & Tray Slicing</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Shahi Halwai Score</span>
          <strong className="text-amber-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score} Pts</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Ghee Fudge Richness</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Desi Ghee</span>
        </div>
      </div>

      {/* Dodha Slab Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-36 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'sprout' ? "border-amber-700 bg-amber-950/40" :
          step === 'roast' ? "border-yellow-600 bg-amber-900/30 scale-105 shadow-amber-900/40" :
          step === 'nuts' ? "border-amber-800 bg-gradient-to-r from-amber-950 via-amber-800 to-yellow-700 scale-110 shadow-amber-800/50" :
          step === 'slice' ? "border-yellow-500 bg-gradient-to-tr from-amber-900 via-yellow-600 to-amber-950 scale-115 shadow-yellow-500/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Dodha Icon */}
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌾</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'sprout' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-20">🌾 Sprouted Wheat Ghee Roast</span>}
            {step === 'roast' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">🥛 Mahogany Milk Caramel</span>}
            {step === 'nuts' && <span className="font-display font-bold text-xs text-amber-200 block -mt-20">🌰 Walnut & Pista Fudge</span>}
            {step === 'slice' && <span className="font-display font-bold text-xs text-yellow-400 block -mt-20">📐 Brass Tray Slicing</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Shahi Dodha Barfi!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'sprout' && (
          <Button
            onClick={handleRoastSproutedWheat}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Roast Sprouted Wheat Flour (Anghakar) in Pure Desi Ghee
          </Button>
        )}

        {step === 'roast' && (
          <Button
            onClick={handleSimmerMilkReduction}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-800 text-white shadow-lg"
          >
            🥛 Step 2: Simmer Whole Milk & Jaggery into Dark Mahogany Caramel
          </Button>
        )}

        {step === 'nuts' && (
          <Button
            onClick={handleFoldDryFruits}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-900 text-yellow-200 shadow-lg"
          >
            🌰 Step 3: Fold Abundant Walnuts, Cashews & Elaichi into Chewy Fudge
          </Button>
        )}

        {step === 'slice' && (
          <Button
            onClick={handleSliceDodhaSquares}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-800 text-white shadow-lg"
          >
            📐 Step 4: Set in Brass Trays & Slice into Royal Square Bars
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewDodhaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Dodha Barfi Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
