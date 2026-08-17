import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKajuGulkandBarfi() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(88000);
  const [step, setStep] = useState<'grind-kaju-paste' | 'layer-rose-gulkand' | 'roll-double-decker' | 'slice-diamond-silver' | 'served'>('grind-kaju-paste');

  const handleGrindKajuPaste = () => {
    if (step !== 'grind-kaju-paste') return;
    sounds.playPop();
    setStep('layer-rose-gulkand');
    toast.info('🥜 Ground premium cashews into silky paste and cooked into smooth kaju dough!');
  };

  const handleLayerRoseGulkand = () => {
    if (step !== 'layer-rose-gulkand') return;
    sounds.playPop();
    setStep('roll-double-decker');
    toast.info('🌹 Layered organic Damask rose gulkand, crushed pistachios & roasted almonds!');
  };

  const handleRollDoubleDecker = () => {
    if (step !== 'roll-double-decker') return;
    sounds.playPop();
    setStep('slice-diamond-silver');
    toast.info('🧈 Rolled into signature dual-color royal double-decker barfi sheet!');
  };

  const handleSliceDiamondSilver = () => {
    if (step !== 'slice-diamond-silver') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1800;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KAJU GULKAND BARFI SERVED FRESH! (+1800 Pts)');
  };

  const handleNewBarfiBatch = () => {
    sounds.playPop();
    setStep('grind-kaju-paste');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kaju Gulkand Barfi Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Cashew Dough Cook, Rose Gulkand Core, Double-Decker Roll & Silver Vark</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Marwar Score</span>
          <strong className="text-rose-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score} Pts</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kaju Purity</span>
          <span className="font-display font-black text-xl text-rose-400">✨ 100% W320</span>
        </div>
      </div>

      {/* Barfi Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'grind-kaju-paste' ? "border-amber-200 bg-amber-200/10" :
          step === 'layer-rose-gulkand' ? "border-rose-400 bg-rose-400/20 scale-105 shadow-rose-400/40" :
          step === 'roll-double-decker' ? "border-pink-500 bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-300 scale-110 shadow-pink-500/50" :
          step === 'slice-diamond-silver' ? "border-rose-300 bg-gradient-to-r from-rose-300 via-pink-400 to-amber-200 scale-115 shadow-rose-300/60" :
          "border-rose-400 bg-rose-400/20 scale-110"
        )}>
          {/* Barfi Icon */}
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-rose-400 flex items-center justify-center bg-black/40 rotate-45">
            <span className="text-3xl -rotate-45">🔶</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'grind-kaju-paste' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥜 Smooth Kaju Cashew Dough</span>}
            {step === 'layer-rose-gulkand' && <span className="font-display font-bold text-xs text-rose-300 block -mt-24">🌹 Damask Rose Gulkand Core</span>}
            {step === 'roll-double-decker' && <span className="font-display font-bold text-xs text-pink-300 block -mt-24">🧈 Double-Decker Barfi Sheet</span>}
            {step === 'slice-diamond-silver' && <span className="font-display font-bold text-xs text-rose-100 block -mt-24">👑 Diamond Cut & Silver Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-rose-400 block -mt-24">👑 Shahi Kaju Gulkand Barfi!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'grind-kaju-paste' && (
          <Button
            onClick={handleGrindKajuPaste}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥜 Step 1: Grind Premium Cashews into Silky Smooth Dough
          </Button>
        )}

        {step === 'layer-rose-gulkand' && (
          <Button
            onClick={handleLayerRoseGulkand}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🌹 Step 2: Layer Organic Damask Rose Gulkand & Roasted Pista
          </Button>
        )}

        {step === 'roll-double-decker' && (
          <Button
            onClick={handleRollDoubleDecker}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-pink-600 text-white shadow-lg"
          >
            🧈 Step 3: Roll into Double-Decker Kaju-Gulkand Sheet
          </Button>
        )}

        {step === 'slice-diamond-silver' && (
          <Button
            onClick={handleSliceDiamondSilver}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-white shadow-lg"
          >
            👑 Step 4: Diamond Cut & Garnish 24K Edible Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewBarfiBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Kaju Gulkand Barfi Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
