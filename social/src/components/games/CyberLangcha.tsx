import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberLangcha() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(30000);
  const [step, setStep] = useState<'knead-khoya' | 'fry-ghee' | 'soak-syrup' | 'garnish-pista' | 'served'>('knead-khoya');

  const handleKneadKhoya = () => {
    if (step !== 'knead-khoya') return;
    sounds.playPop();
    setStep('fry-ghee');
    toast.info('🥛 Kneaded fresh chena & mawa khoya into authentic Shaktigarh elongated cylinders!');
  };

  const handleFryPureGhee = () => {
    if (step !== 'fry-ghee') return;
    sounds.playPop();
    setStep('soak-syrup');
    toast.info('🔥 Deep-fried in hot smoking pure desi ghee until dark mahogany brown & crisp outer skin!');
  };

  const handleSoakRoseSyrup = () => {
    if (step !== 'soak-syrup') return;
    sounds.playPop();
    setStep('garnish-pista');
    toast.info('🍯 Soaked in bubbling cardamom & rose-infused sugar syrup until meltingly tender!');
  };

  const handleGarnishPistaSilver = () => {
    if (step !== 'garnish-pista') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1140;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAKTIGARH LANGCHA GARNISHED & SERVED! (+1140 Pts)');
  };

  const handleNewLangchaBatch = () => {
    sounds.playPop();
    setStep('knead-khoya');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-800 to-yellow-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shaktigarh Langcha Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Khoya Chena Dough, Ghee Dark Roast, Rose Syrup Dunk & Pista Flakes</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Dark Roast Crust</span>
          <span className="font-display font-black text-xl text-amber-500">✨ 100% Desi Ghee</span>
        </div>
      </div>

      {/* Langcha Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-56 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'knead-khoya' ? "border-amber-200 bg-amber-100/10" :
          step === 'fry-ghee' ? "border-amber-800 bg-gradient-to-tr from-amber-950 via-amber-900 to-yellow-800 scale-105 shadow-amber-900/50" :
          step === 'soak-syrup' ? "border-amber-600 bg-gradient-to-r from-amber-900 via-rose-900 to-amber-800 scale-110 shadow-amber-700/60" :
          step === 'garnish-pista' ? "border-yellow-400 bg-gradient-to-r from-amber-900 via-yellow-600 to-amber-950 scale-115 shadow-yellow-400/50" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Cylinder Icon */}
          <div className="w-28 h-12 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🫔</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'knead-khoya' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-20">🥛 Khoya & Chena Cylinders</span>}
            {step === 'fry-ghee' && <span className="font-display font-bold text-xs text-amber-400 block -mt-20">🔥 Pure Desi Ghee Dark Fry</span>}
            {step === 'soak-syrup' && <span className="font-display font-bold text-xs text-rose-300 block -mt-20">🍯 Rose & Elaichi Sugar Chashni</span>}
            {step === 'garnish-pista' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">✨ Pistachio Flakes & Silver Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Shaktigarh Langcha!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'knead-khoya' && (
          <Button
            onClick={handleKneadKhoya}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Knead Rich Chena & Mawa Khoya into Elongated Cylinders
          </Button>
        )}

        {step === 'fry-ghee' && (
          <Button
            onClick={handleFryPureGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-800 text-white shadow-lg"
          >
            🔥 Step 2: Deep-Fry in Desi Ghee to Dark Mahogany Brown Crust
          </Button>
        )}

        {step === 'soak-syrup' && (
          <Button
            onClick={handleSoakRoseSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-700 text-white shadow-lg"
          >
            🍯 Step 3: Dunk & Soak in Hot Rose & Cardamom Sugar Syrup
          </Button>
        )}

        {step === 'garnish-pista' && (
          <Button
            onClick={handleGarnishPistaSilver}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-900 text-white shadow-lg"
          >
            ✨ Step 4: Garnish with Crunchy Pistachio Slivers & Silver Foil
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewLangchaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Shaktigarh Langcha Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
