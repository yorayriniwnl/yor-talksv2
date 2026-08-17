import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberPistaMawaBarfi() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(55500);
  const [step, setStep] = useState<'reduce-creamy-mawa' | 'grind-iranian-pista' | 'knead-cardamom-slab' | 'cut-silver-diamonds' | 'served'>('reduce-creamy-mawa');

  const handleReduceCreamyMawa = () => {
    if (step !== 'reduce-creamy-mawa') return;
    sounds.playPop();
    setStep('grind-iranian-pista');
    toast.info('🥛 Reduced fresh creamy buffalo mawa in brass kadhai with caramelized sugar!');
  };

  const handleGrindIranianPista = () => {
    if (step !== 'grind-iranian-pista') return;
    sounds.playPop();
    setStep('knead-cardamom-slab');
    toast.info('🌱 Blended vibrant green Iranian pistachios into fine aromatic paste with cardamom!');
  };

  const handleKneadCardamomSlab = () => {
    if (step !== 'knead-cardamom-slab') return;
    sounds.playPop();
    setStep('cut-silver-diamonds');
    toast.info('🌾 Layered emerald pista dough over golden mawa into a flat setting tray!');
  };

  const handleCutSilverDiamonds = () => {
    if (step !== 'cut-silver-diamonds') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1440;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI PISTA MAWA BARFI SERVED FRESH! (+1440 Pts)');
  };

  const handleNewBarfiBatch = () => {
    sounds.playPop();
    setStep('reduce-creamy-mawa');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-green-600 to-amber-400 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Pista Mawa Barfi Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Creamy Buffalo Mawa, Iranian Pistachio Paste, Cardamom Knead & Silver Diamonds</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Mewar Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Pista Purity</span>
          <span className="font-display font-black text-xl text-emerald-400">✨ 100% Iranian</span>
        </div>
      </div>

      {/* Barfi Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'reduce-creamy-mawa' ? "border-amber-200 bg-amber-200/10" :
          step === 'grind-iranian-pista' ? "border-emerald-500 bg-emerald-500/20 scale-105 shadow-emerald-500/40" :
          step === 'knead-cardamom-slab' ? "border-green-400 bg-gradient-to-tr from-emerald-500 via-green-500 to-amber-300 scale-110 shadow-green-400/50" :
          step === 'cut-silver-diamonds' ? "border-amber-100 bg-gradient-to-r from-emerald-400 via-yellow-200 to-slate-200 scale-115 shadow-amber-100/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Barfi Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🟩</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'reduce-creamy-mawa' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥛 Creamy Buffalo Mawa</span>}
            {step === 'grind-iranian-pista' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">🌱 Iranian Pista Paste</span>}
            {step === 'knead-cardamom-slab' && <span className="font-display font-bold text-xs text-green-300 block -mt-24">🌾 Flat Two-Tone Slab</span>}
            {step === 'cut-silver-diamonds' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Silver Vark Diamonds</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Pista Mawa Barfi!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'reduce-creamy-mawa' && (
          <Button
            onClick={handleReduceCreamyMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Reduce Creamy Buffalo Milk Mawa with Sugar
          </Button>
        )}

        {step === 'grind-iranian-pista' && (
          <Button
            onClick={handleGrindIranianPista}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-emerald-600 text-white shadow-lg"
          >
            🌱 Step 2: Grind Fine Iranian Green Pistachios with Cardamom
          </Button>
        )}

        {step === 'knead-cardamom-slab' && (
          <Button
            onClick={handleKneadCardamomSlab}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-green-500 text-black shadow-lg"
          >
            🌾 Step 3: Layer Emerald Pista Over Golden Mawa Slab
          </Button>
        )}

        {step === 'cut-silver-diamonds' && (
          <Button
            onClick={handleCutSilverDiamonds}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-emerald-400 via-green-500 to-amber-300 text-black shadow-lg"
          >
            👑 Step 4: Apply Silver Vark & Cut Diamond Barfi Slices
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewBarfiBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Pista Mawa Barfi Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
