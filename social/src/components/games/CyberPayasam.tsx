import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberPayasam() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(14000);
  const [step, setStep] = useState<'simmer' | 'infuse' | 'nuts' | 'matka' | 'served'>('simmer');

  const handleSimmerMilkRice = () => {
    if (step !== 'simmer') return;
    sounds.playPop();
    setStep('infuse');
    toast.info('🥛 Fragrant Gobindobhog rice slow-simmered in whole milk in heavy brass uruli!');
  };

  const handleInfuseSaffronCardamom = () => {
    if (step !== 'infuse') return;
    sounds.playPop();
    setStep('nuts');
    toast.info('✨ Infused with crushed green cardamom, saffron threads & condensed milk!');
  };

  const handleGheeRoastDryFruits = () => {
    if (step !== 'nuts') return;
    sounds.playChime();
    setStep('matka');
    toast.info('🥜 Golden cashews & plump raisins roasted in hot desi ghee poured in!');
  };

  const handleServeClayMatka = () => {
    if (step !== 'matka') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 780;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KHEER PAYASAM SERVED IN TERRACOTTA MATKA (+780 Pts)');
  };

  const handleNewPayasam = () => {
    sounds.playPop();
    setStep('simmer');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-200 via-yellow-400 to-amber-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kheer Payasam Shahi Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Brass Uruli Milk Simmer, Saffron Infusion & Roasted Cashews</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Creamy Reduction</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Shahi Kheer</span>
        </div>
      </div>

      {/* Payasam Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer' ? "border-amber-100 bg-amber-50/10" :
          step === 'infuse' ? "border-yellow-300 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'nuts' ? "border-amber-500 bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-500 scale-110 shadow-amber-500/50" :
          step === 'matka' ? "border-amber-700 bg-amber-800/40 scale-115 shadow-amber-800/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Terracotta Uruli Matka */}
          <div className="w-28 h-28 rounded-full border-2 border-dashed border-amber-400/80 flex items-center justify-center bg-black/30">
            <span className="text-3xl">🏺</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-20">🥛 Milk Simmer</span>}
            {step === 'infuse' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">🌸 Saffron Infusion</span>}
            {step === 'nuts' && <span className="font-display font-bold text-xs text-black block -mt-20">🥜 Ghee Cashews</span>}
            {step === 'matka' && <span className="font-display font-bold text-xs text-amber-200 block -mt-20">🏺 Clay Matka Pour</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Royal Payasam!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer' && (
          <Button
            onClick={handleSimmerMilkRice}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Slow-Simmer Gobindobhog Rice in Full-Fat Cow Milk
          </Button>
        )}

        {step === 'infuse' && (
          <Button
            onClick={handleInfuseSaffronCardamom}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-400 text-black shadow-lg"
          >
            🌸 Step 2: Infuse Saffron Strands & Green Cardamom
          </Button>
        )}

        {step === 'nuts' && (
          <Button
            onClick={handleGheeRoastDryFruits}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🥜 Step 3: Roast Cashews & Raisins in Desi Ghee & Stir
          </Button>
        )}

        {step === 'matka' && (
          <Button
            onClick={handleServeClayMatka}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-600 text-white shadow-lg"
          >
            🏺 Step 4: Pour into Chilled Terracotta Clay Matka
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewPayasam}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Simmer Next Shahi Payasam Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
