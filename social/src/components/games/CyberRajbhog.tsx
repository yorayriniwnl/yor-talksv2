import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberRajbhog() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(28000);
  const [step, setStep] = useState<'knead' | 'stuff' | 'boil' | 'soak' | 'served'>('knead');

  const handleKneadChena = () => {
    if (step !== 'knead') return;
    sounds.playPop();
    setStep('stuff');
    toast.info('🥛 Kneaded fresh soft cow milk chena with saffron & green elaichi!');
  };

  const handleStuffDryFruits = () => {
    if (step !== 'stuff') return;
    sounds.playPop();
    setStep('boil');
    toast.info('🌰 Stuffed jumbo chena spheres with whole roasted pistachios, almonds & cardamom!');
  };

  const handleBoilKesarSyrup = () => {
    if (step !== 'boil') return;
    sounds.playPop();
    setStep('soak');
    toast.info('🔥 Boiled in bubbling saffron sugar syrup until giant, spongy & double-puffed!');
  };

  const handleSoakSilverVark = () => {
    if (step !== 'soak') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1100;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KESAR RAJBHOG GARNISHED & SERVED! (+1100 Pts)');
  };

  const handleNewRajbhogBatch = () => {
    sounds.playPop();
    setStep('knead');
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
              Cyber Shahi Kesar Rajbhog Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Soft Chena Knead, Nut Stuffed Core, Saffron Syrup Puff & Silver Vark</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Spongy Saffron Puff</span>
          <span className="font-display font-black text-xl text-yellow-400">✨ 100% Royal Chena</span>
        </div>
      </div>

      {/* Rajbhog Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'knead' ? "border-amber-200 bg-amber-100/10" :
          step === 'stuff' ? "border-yellow-400 bg-amber-400/20 scale-105 shadow-yellow-400/40" :
          step === 'boil' ? "border-amber-500 bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 scale-110 shadow-amber-500/50" :
          step === 'soak' ? "border-yellow-300 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 scale-115 shadow-yellow-300/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Sphere Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-4xl">🌕</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'knead' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥛 Soft Cow Milk Chena</span>}
            {step === 'stuff' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🌰 Dry Fruit & Pista Core</span>}
            {step === 'boil' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🔥 Bubbling Kesar Chashni</span>}
            {step === 'soak' && <span className="font-display font-bold text-xs text-amber-200 block -mt-24">✨ Silver Vark & Rose Petals</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Kesar Rajbhog!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'knead' && (
          <Button
            onClick={handleKneadChena}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Knead Soft Fresh Chena with Kashmiri Saffron
          </Button>
        )}

        {step === 'stuff' && (
          <Button
            onClick={handleStuffDryFruits}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌰 Step 2: Stuff Jumbo Spheres with Almonds, Pistas & Cardamom
          </Button>
        )}

        {step === 'boil' && (
          <Button
            onClick={handleBoilKesarSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🔥 Step 3: Boil in Saffron Sugar Syrup until Double Spongy
          </Button>
        )}

        {step === 'soak' && (
          <Button
            onClick={handleSoakSilverVark}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black shadow-lg"
          >
            ✨ Step 4: Garnish with Pure Silver Vark & Fragrant Rose Petals
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewRajbhogBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Kesar Rajbhog Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
