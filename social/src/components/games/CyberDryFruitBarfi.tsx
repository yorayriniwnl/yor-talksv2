import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberDryFruitBarfi() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(26000);
  const [step, setStep] = useState<'chop' | 'roast' | 'date-bind' | 'slice' | 'served'>('chop');

  const handleChopDryFruits = () => {
    if (step !== 'chop') return;
    sounds.playPop();
    setStep('roast');
    toast.info('🌰 Chopped premium almonds, cashews, pistachios & Afghan figs!');
  };

  const handleRoastDesiGhee = () => {
    if (step !== 'roast') return;
    sounds.playPop();
    setStep('date-bind');
    toast.info('🔥 Dry roasted assorted nuts in pure desi ghee until golden crisp!');
  };

  const handleBindDatePaste = () => {
    if (step !== 'date-bind') return;
    sounds.playPop();
    setStep('slice');
    toast.info('🌴 Bound roasted nuts with warm Medjool date (khajur) paste & green elaichi!');
  };

  const handleSliceBarfiDiamonds = () => {
    if (step !== 'slice') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1060;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 SUGAR-FREE ROYAL DRY FRUIT BARFI SLICED & SERVED! (+1060 Pts)');
  };

  const handleNewDryFruitBatch = () => {
    sounds.playPop();
    setStep('chop');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shahi Dry Fruit Barfi Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Nut Chopping, Ghee Toasting, Medjool Date Bind & Diamond Slicing</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Natural Sweetness</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Sugar-Free Date</span>
        </div>
      </div>

      {/* Barfi Slab Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-36 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'chop' ? "border-amber-800 bg-amber-950/40" :
          step === 'roast' ? "border-amber-600 bg-amber-900/40 scale-105 shadow-amber-600/40" :
          step === 'date-bind' ? "border-yellow-600 bg-gradient-to-tr from-amber-950 via-amber-800 to-yellow-600 scale-110 shadow-yellow-600/50" :
          step === 'slice' ? "border-yellow-400 bg-gradient-to-r from-amber-700 via-yellow-500 to-amber-900 scale-115 shadow-yellow-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Barfi Icon */}
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌰</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'chop' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-20">🌰 5-Nut Fine Chop</span>}
            {step === 'roast' && <span className="font-display font-bold text-xs text-amber-300 block -mt-20">🔥 Pure Ghee Toasting</span>}
            {step === 'date-bind' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">🌴 Medjool Date Warm Bind</span>}
            {step === 'slice' && <span className="font-display font-bold text-xs text-amber-200 block -mt-20">📐 Diamond Bar Slicing</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Shahi Dry Fruit Barfi!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'chop' && (
          <Button
            onClick={handleChopDryFruits}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌰 Step 1: Chop Almonds, Cashews, Pistachios & Dried Afghan Figs
          </Button>
        )}

        {step === 'roast' && (
          <Button
            onClick={handleRoastDesiGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-700 text-white shadow-lg"
          >
            🔥 Step 2: Roast Nuts in Pure Desi Ghee until Golden Crisp
          </Button>
        )}

        {step === 'date-bind' && (
          <Button
            onClick={handleBindDatePaste}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-900 text-yellow-200 shadow-lg"
          >
            🌴 Step 3: Bind Warm Nuts with Natural Medjool Date Paste
          </Button>
        )}

        {step === 'slice' && (
          <Button
            onClick={handleSliceBarfiDiamonds}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white shadow-lg"
          >
            📐 Step 4: Press into Trays & Slice into Royal Diamond Bars
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewDryFruitBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Dry Fruit Barfi Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
