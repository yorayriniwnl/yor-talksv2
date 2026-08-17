import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKashmiriPhirni() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(63000);
  const [step, setStep] = useState<'grind-rice-silbatta' | 'simmer-reduced-milk' | 'infuse-mongra-saffron' | 'set-terracotta-sakora' | 'served'>('grind-rice-silbatta');

  const handleGrindRiceSilbatta = () => {
    if (step !== 'grind-rice-silbatta') return;
    sounds.playPop();
    setStep('simmer-reduced-milk');
    toast.info('🌾 Ground coarse soaked fragrant basmati rice paste on traditional stone sil batta!');
  };

  const handleSimmerReducedMilk = () => {
    if (step !== 'simmer-reduced-milk') return;
    sounds.playPop();
    setStep('infuse-mongra-saffron');
    toast.info('🥛 Simmered rich whole milk until thick and creamy in clay handi pot!');
  };

  const handleInfuseMongraSaffron = () => {
    if (step !== 'infuse-mongra-saffron') return;
    sounds.playPop();
    setStep('set-terracotta-sakora');
    toast.info('🌸 Infused Grade-1 Kashmiri Mongra saffron, crushed green cardamom & kewra water!');
  };

  const handleSetTerracottaSakora = () => {
    if (step !== 'set-terracotta-sakora') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1540;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KASHMIRI PHIRNI SERVED FRESH! (+1540 Pts)');
  };

  const handleNewPhirniBatch = () => {
    sounds.playPop();
    setStep('grind-rice-silbatta');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kashmiri Phirni Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Stone Sil Batta Rice, Mongra Saffron, Terracotta Sakora & Silver Vark</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kashmir Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Saffron Infusion</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Mongra</span>
        </div>
      </div>

      {/* Phirni Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'grind-rice-silbatta' ? "border-amber-100 bg-amber-100/10" :
          step === 'simmer-reduced-milk' ? "border-amber-500 bg-amber-500/20 scale-105 shadow-amber-500/40" :
          step === 'infuse-mongra-saffron' ? "border-yellow-400 bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-600 scale-110 shadow-yellow-400/50" :
          step === 'set-terracotta-sakora' ? "border-amber-200 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 scale-115 shadow-amber-200/60" :
          "border-yellow-400 bg-yellow-400/20 scale-110"
        )}>
          {/* Phirni Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🥣</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'grind-rice-silbatta' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🌾 Stone Sil Batta Rice</span>}
            {step === 'simmer-reduced-milk' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🥛 Creamy Thick Milk</span>}
            {step === 'infuse-mongra-saffron' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🌸 Mongra Saffron Infusion</span>}
            {step === 'set-terracotta-sakora' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Terracotta Sakora Chilled</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Kashmiri Phirni!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'grind-rice-silbatta' && (
          <Button
            onClick={handleGrindRiceSilbatta}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Grind Fragrant Rice Paste on Stone Sil Batta
          </Button>
        )}

        {step === 'simmer-reduced-milk' && (
          <Button
            onClick={handleSimmerReducedMilk}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🥛 Step 2: Simmer Full-Cream Milk into Thick Creamy Base
          </Button>
        )}

        {step === 'infuse-mongra-saffron' && (
          <Button
            onClick={handleInfuseMongraSaffron}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌸 Step 3: Infuse Grade-1 Mongra Saffron & Green Cardamom
          </Button>
        )}

        {step === 'set-terracotta-sakora' && (
          <Button
            onClick={handleSetTerracottaSakora}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 text-black shadow-lg"
          >
            👑 Step 4: Pour in Terracotta Sakoras, Chill & Garnish Almonds
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewPhirniBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Kashmiri Phirni Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
