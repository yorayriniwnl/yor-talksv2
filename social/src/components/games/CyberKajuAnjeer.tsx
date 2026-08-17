import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKajuAnjeer() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(22000);
  const [step, setStep] = useState<'anjeer' | 'kaju' | 'roll' | 'slice' | 'served'>('anjeer');

  const handleCookAnjeerCore = () => {
    if (step !== 'anjeer') return;
    sounds.playPop();
    setStep('kaju');
    toast.info('🌰 Cooked Afghan dried figs (anjeer) with poppy seeds & raw honey into chewy core!');
  };

  const handleRollKajuDough = () => {
    if (step !== 'kaju') return;
    sounds.playPop();
    setStep('roll');
    toast.info('✨ Rolled smooth rich cashew paste (kaju dough) into razor-thin silky sheet!');
  };

  const handleWrapPinwheelCylinder = () => {
    if (step !== 'roll') return;
    sounds.playPop();
    setStep('slice');
    toast.info('🌟 Wrapped fig core in cashew dough cylinder & rolled in roasted poppy seeds & silver vark!');
  };

  const handleSlicePinwheelRolls = () => {
    if (step !== 'slice') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 980;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL KAJU ANJEER PINWHEEL ROLLS SLICED & SERVED! (+980 Pts)');
  };

  const handleNewKajuBatch = () => {
    sounds.playPop();
    setStep('anjeer');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-yellow-600 to-amber-900 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kaju Anjeer Roll Royal Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Afghan Fig Mashing, Kaju Dough Wrap, Poppy Seeds & Silver Vark</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Royal Roll Polish</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Silver Vark Foil</span>
        </div>
      </div>

      {/* Roll Slab Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-36 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'anjeer' ? "border-amber-900 bg-amber-900/20" :
          step === 'kaju' ? "border-amber-200 bg-amber-100/20 scale-105 shadow-amber-200/40" :
          step === 'roll' ? "border-yellow-500 bg-gradient-to-r from-amber-200 via-amber-900 to-yellow-600 scale-110 shadow-yellow-500/50" :
          step === 'slice' ? "border-amber-300 bg-gradient-to-tr from-amber-700 via-yellow-400 to-amber-900 scale-115 shadow-amber-300/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Roll Icon */}
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌰</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'anjeer' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-20">🌰 Afghan Anjeer Cook</span>}
            {step === 'kaju' && <span className="font-display font-bold text-xs text-amber-100 block -mt-20">✨ Kaju Dough Roll</span>}
            {step === 'roll' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">🌟 Cylinder Pinwheel Wrap</span>}
            {step === 'slice' && <span className="font-display font-bold text-xs text-amber-200 block -mt-20">📐 Silver Vark Slicing</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Shahi Kaju Anjeer Roll!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'anjeer' && (
          <Button
            onClick={handleCookAnjeerCore}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌰 Step 1: Cook Dried Figs (Anjeer) with Poppy Seeds & Raw Honey
          </Button>
        )}

        {step === 'kaju' && (
          <Button
            onClick={handleRollKajuDough}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-200 text-black shadow-lg"
          >
            ✨ Step 2: Roll Pure Cashew Paste into Thin Smooth Dough Sheet
          </Button>
        )}

        {step === 'roll' && (
          <Button
            onClick={handleWrapPinwheelCylinder}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-800 text-white shadow-lg"
          >
            🌟 Step 3: Wrap Fig Core in Cashew Sheet & Roll in Roasted Poppy Seeds
          </Button>
        )}

        {step === 'slice' && (
          <Button
            onClick={handleSlicePinwheelRolls}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white shadow-lg"
          >
            📐 Step 4: Apply Silver Vark Foil & Slice into Royal Pinwheels
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewKajuBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Roll Next Royal Kaju Anjeer Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
