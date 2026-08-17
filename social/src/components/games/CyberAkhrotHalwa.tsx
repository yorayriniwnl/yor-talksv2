import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberAkhrotHalwa() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(25000);
  const [step, setStep] = useState<'crack' | 'roast' | 'simmer' | 'garnish' | 'served'>('crack');

  const handleCrackKashmiriWalnuts = () => {
    if (step !== 'crack') return;
    sounds.playPop();
    setStep('roast');
    toast.info('🌰 Cracked fresh Kashmiri walnuts & ground coarsely in stone mortar!');
  };

  const handleRoastDesiGhee = () => {
    if (step !== 'roast') return;
    sounds.playPop();
    setStep('simmer');
    toast.info('🔥 Roasted coarse walnut granules in pure Himalayan desi ghee with green cardamom!');
  };

  const handleSimmerMilkHoney = () => {
    if (step !== 'simmer') return;
    sounds.playPop();
    setStep('garnish');
    toast.info('🥛 Simmered rich milk, Kashmiri saffron & organic forest honey into luscious halwa!');
  };

  const handleGarnishPistaGold = () => {
    if (step !== 'garnish') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1040;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL KASHMIRI AKHROT HALWA GARNISHED & SERVED! (+1040 Pts)');
  };

  const handleNewHalwaBatch = () => {
    sounds.playPop();
    setStep('crack');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-600 to-yellow-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kashmiri Akhrot Halwa Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Walnut Mortar Crush, Ghee Roast, Saffron Honey Simmer & Pista Garnish</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Walnut Nutty Aroma</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Shahi Ghee</span>
        </div>
      </div>

      {/* Halwa Deg Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-36 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'crack' ? "border-amber-800 bg-amber-950/40" :
          step === 'roast' ? "border-amber-600 bg-amber-900/40 scale-105 shadow-amber-600/40" :
          step === 'simmer' ? "border-yellow-500 bg-gradient-to-tr from-amber-800 via-yellow-500 to-amber-900 scale-110 shadow-yellow-500/50" :
          step === 'garnish' ? "border-amber-400 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-800 scale-115 shadow-amber-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Halwa Icon */}
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌰</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'crack' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-20">🌰 Walnut Mortar Crush</span>}
            {step === 'roast' && <span className="font-display font-bold text-xs text-amber-300 block -mt-20">🔥 Himalayan Ghee Roast</span>}
            {step === 'simmer' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">🥛 Saffron & Honey Simmer</span>}
            {step === 'garnish' && <span className="font-display font-bold text-xs text-amber-200 block -mt-20">✨ Pistachio & Gold Flakes</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Shahi Akhrot Halwa!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'crack' && (
          <Button
            onClick={handleCrackKashmiriWalnuts}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌰 Step 1: Crack Kashmiri Walnuts & Grind Coarsely in Mortar
          </Button>
        )}

        {step === 'roast' && (
          <Button
            onClick={handleRoastDesiGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-700 text-white shadow-lg"
          >
            🔥 Step 2: Roast Walnut Granules in Pure Himalayan Desi Ghee
          </Button>
        )}

        {step === 'simmer' && (
          <Button
            onClick={handleSimmerMilkHoney}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🥛 Step 3: Simmer Milk, Kashmiri Kesar Saffron & Forest Honey
          </Button>
        )}

        {step === 'garnish' && (
          <Button
            onClick={handleGarnishPistaGold}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white shadow-lg"
          >
            ✨ Step 4: Garnish with Slivered Pistachios & Edible Gold Leaf
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewHalwaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Akhrot Halwa Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
