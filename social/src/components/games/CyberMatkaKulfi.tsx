import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMatkaKulfi() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(23000);
  const [step, setStep] = useState<'simmer' | 'infuse' | 'seal' | 'freeze' | 'served'>('simmer');

  const handleSimmerMilkReduction = () => {
    if (step !== 'simmer') return;
    sounds.playPop();
    setStep('infuse');
    toast.info('🥛 Simmered whole buffalo milk in heavy copper deg for 6 hours into thick rabdi!');
  };

  const handleInfuseKesarPista = () => {
    if (step !== 'infuse') return;
    sounds.playPop();
    setStep('seal');
    toast.info('✨ Infused Kashmiri kesar saffron, green cardamom & crushed pistachio slivers!');
  };

  const handleSealMatkaAtta = () => {
    if (step !== 'seal') return;
    sounds.playPop();
    setStep('freeze');
    toast.info('🏺 Poured into clay terracotta matkas and sealed lids airtight with wheat atta dough!');
  };

  const handleFreezeIceSaltChamber = () => {
    if (step !== 'freeze') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1000;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL KESAR PISTA MATKA KULFI FROZEN & SERVED! (+1000 Pts)');
  };

  const handleNewKulfiBatch = () => {
    sounds.playPop();
    setStep('simmer');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-700 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kesar Pista Matka Kulfi Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">6-Hour Deg Simmer, Saffron Infusion, Clay Seal & Ice Barrel Freeze</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Frozen Creaminess</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Rock-Solid Kulfi</span>
        </div>
      </div>

      {/* Matka Kulfi Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-40 h-44 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer' ? "border-amber-100 bg-amber-50/10" :
          step === 'infuse' ? "border-yellow-400 bg-yellow-500/20 scale-105 shadow-yellow-500/40" :
          step === 'seal' ? "border-amber-700 bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-900 scale-110 shadow-amber-700/50" :
          step === 'freeze' ? "border-cyan-400 bg-gradient-to-t from-cyan-900 via-amber-600 to-yellow-400 scale-115 shadow-cyan-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Matka Icon */}
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🏺</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-20">🥛 6-Hour Milk Reduction</span>}
            {step === 'infuse' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">✨ Kesar Pista Infusion</span>}
            {step === 'seal' && <span className="font-display font-bold text-xs text-amber-100 block -mt-20">🏺 Terracotta Atta Seal</span>}
            {step === 'freeze' && <span className="font-display font-bold text-xs text-cyan-300 block -mt-20">❄️ Rock-Salt Ice Barrel Freeze</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Shahi Matka Kulfi!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer' && (
          <Button
            onClick={handleSimmerMilkReduction}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer Buffalo Milk for 6 Hours into Thick Golden Rabdi
          </Button>
        )}

        {step === 'infuse' && (
          <Button
            onClick={handleInfuseKesarPista}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            ✨ Step 2: Infuse Kashmiri Saffron, Elaichi & Roasted Pistachios
          </Button>
        )}

        {step === 'seal' && (
          <Button
            onClick={handleSealMatkaAtta}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-700 text-white shadow-lg"
          >
            🏺 Step 3: Pour into Clay Matkas & Seal Airtight with Atta Dough
          </Button>
        )}

        {step === 'freeze' && (
          <Button
            onClick={handleFreezeIceSaltChamber}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-cyan-600 via-blue-500 to-indigo-600 text-white shadow-lg"
          >
            ❄️ Step 4: Churn in Rock-Salt Ice Barrel until Frozen Solid
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewKulfiBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Freeze Next Shahi Matka Kulfi Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
