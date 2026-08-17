import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberAngooriChamCham() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(49500);
  const [step, setStep] = useState<'knead-saffron-chena' | 'shape-grape-ovals' | 'boil-cardamom-syrup' | 'roll-coconut-khoya' | 'served'>('knead-saffron-chena');

  const handleKneadSaffronChena = () => {
    if (step !== 'knead-saffron-chena') return;
    sounds.playPop();
    setStep('shape-grape-ovals');
    toast.info('🥛 Kneaded smooth cow milk chena with Kashmiri saffron strands & semolina!');
  };

  const handleShapeGrapeOvals = () => {
    if (step !== 'shape-grape-ovals') return;
    sounds.playPop();
    setStep('boil-cardamom-syrup');
    toast.info('🍇 Rolled into delicate mini grape-sized Angoori oval dumplings!');
  };

  const handleBoilCardamomSyrup = () => {
    if (step !== 'boil-cardamom-syrup') return;
    sounds.playPop();
    setStep('roll-coconut-khoya');
    toast.info('🍯 Boiled Angoori Cham Chams in bubbling rose & cardamom sugar syrup until spongy!');
  };

  const handleRollCoconutKhoya = () => {
    if (step !== 'roll-coconut-khoya') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1360;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL ANGOORI CHAM CHAM SERVED FRESH! (+1360 Pts)');
  };

  const handleNewChamChamBatch = () => {
    sounds.playPop();
    setStep('knead-saffron-chena');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-rose-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Angoori Cham Cham Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Grape-Sized Saffron Chena Ovals, Rose Syrup Boiling & Mawa Coconut Dust</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Awadh Halwai Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Saffron Chena Softness</span>
          <span className="font-display font-black text-xl text-yellow-400">✨ 100% Spongy</span>
        </div>
      </div>

      {/* Cham Cham Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'knead-saffron-chena' ? "border-yellow-200 bg-yellow-200/10" :
          step === 'shape-grape-ovals' ? "border-yellow-400 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'boil-cardamom-syrup' ? "border-amber-500 bg-gradient-to-tr from-yellow-400 via-amber-500 to-rose-500 scale-110 shadow-amber-500/50" :
          step === 'roll-coconut-khoya' ? "border-amber-100 bg-gradient-to-r from-amber-100 via-yellow-300 to-rose-400 scale-115 shadow-amber-100/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Cham Cham Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-yellow-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🍬</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'knead-saffron-chena' && <span className="font-mono text-[0.65rem] text-yellow-200 block -mt-24">🥛 Saffron Cow Chena</span>}
            {step === 'shape-grape-ovals' && <span className="font-display font-bold text-xs text-yellow-400 block -mt-24">🍇 Mini Angoori Ovals</span>}
            {step === 'boil-cardamom-syrup' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🍯 Boiling Rose Syrup</span>}
            {step === 'roll-coconut-khoya' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Mawa Khoya & Coconut Dust</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Angoori Cham Cham!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'knead-saffron-chena' && (
          <Button
            onClick={handleKneadSaffronChena}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Knead Soft Cow Milk Chena with Saffron & Suji
          </Button>
        )}

        {step === 'shape-grape-ovals' && (
          <Button
            onClick={handleShapeGrapeOvals}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🍇 Step 2: Roll into Mini Grape-Sized Angoori Oval Dumplings
          </Button>
        )}

        {step === 'boil-cardamom-syrup' && (
          <Button
            onClick={handleBoilCardamomSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🍯 Step 3: Boil in Fragrant Rose Cardamom Syrup until Spongy
          </Button>
        )}

        {step === 'roll-coconut-khoya' && (
          <Button
            onClick={handleRollCoconutKhoya}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-400 text-black shadow-lg"
          >
            👑 Step 4: Roll in Grated Mawa Khoya & Desiccated Coconut
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewChamChamBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Angoori Cham Cham Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
