import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMawaGujiyaRoyal() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(82000);
  const [step, setStep] = useState<'knead-ghee-pastry' | 'stuff-caramel-mawa' | 'crimp-sunray-flutes' | 'fry-chashni-dip' | 'served'>('knead-ghee-pastry');

  const handleKneadGheePastry = () => {
    if (step !== 'knead-ghee-pastry') return;
    sounds.playPop();
    setStep('stuff-caramel-mawa');
    toast.info('🌾 Kneaded refined pastry with melted pure cow ghee moyen!');
  };

  const handleStuffCaramelMawa = () => {
    if (step !== 'stuff-caramel-mawa') return;
    sounds.playPop();
    setStep('crimp-sunray-flutes');
    toast.info('🥥 Stuffed rich caramelized khoya mawa, grated coconut, kishmish & roasted almonds!');
  };

  const handleCrimpSunrayFlutes = () => {
    if (step !== 'crimp-sunray-flutes') return;
    sounds.playPop();
    setStep('fry-chashni-dip');
    toast.info('🥟 Hand-crimped ornate sun-ray fluted edges in traditional katori goja half-moon shape!');
  };

  const handleFryChashniDip = () => {
    if (step !== 'fry-chashni-dip') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1740;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI DRY FRUIT MAWA GUJIYA SERVED CRISP! (+1740 Pts)');
  };

  const handleNewGujiyaBatch = () => {
    sounds.playPop();
    setStep('knead-ghee-pastry');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Mawa Gujiya Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Ghee Pastry Knead, Caramel Mawa Stuffing, Fluted Crimp & Chashni Dip</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Braj Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Pastry Flakiness</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Khasta</span>
        </div>
      </div>

      {/* Gujiya Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'knead-ghee-pastry' ? "border-amber-200 bg-amber-200/10" :
          step === 'stuff-caramel-mawa' ? "border-amber-500 bg-amber-500/20 scale-105 shadow-amber-500/40" :
          step === 'crimp-sunray-flutes' ? "border-yellow-400 bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 scale-110 shadow-yellow-400/50" :
          step === 'fry-chashni-dip' ? "border-amber-300 bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 scale-115 shadow-amber-300/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Gujiya Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🥟</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'knead-ghee-pastry' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🌾 Ghee Pastry Moyen</span>}
            {step === 'stuff-caramel-mawa' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🥥 Khoya Mawa & Coconut</span>}
            {step === 'crimp-sunray-flutes' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🥟 Sunray Hand-Crimped</span>}
            {step === 'fry-chashni-dip' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Ghee Fry & Kesar Chashni</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Mawa Gujiya!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'knead-ghee-pastry' && (
          <Button
            onClick={handleKneadGheePastry}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Knead Refined Pastry with Pure Cow Ghee Moyen
          </Button>
        )}

        {step === 'stuff-caramel-mawa' && (
          <Button
            onClick={handleStuffCaramelMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🥥 Step 2: Stuff Caramelized Mawa, Coconut & Almonds
          </Button>
        )}

        {step === 'crimp-sunray-flutes' && (
          <Button
            onClick={handleCrimpSunrayFlutes}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🥟 Step 3: Hand-Crimp Half-Moon Sun-Ray Fluted Edges
          </Button>
        )}

        {step === 'fry-chashni-dip' && (
          <Button
            onClick={handleFryChashniDip}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 text-black shadow-lg"
          >
            👑 Step 4: Golden Ghee Deep Fry & Saffron Chashni Glaze
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGujiyaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Mawa Gujiya Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
