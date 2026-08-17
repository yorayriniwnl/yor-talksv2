import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGondLaddu() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(17000);
  const [step, setStep] = useState<'gond' | 'roast' | 'nuts' | 'bind' | 'served'>('gond');

  const handlePopGondGhee = () => {
    if (step !== 'gond') return;
    sounds.playPop();
    setStep('roast');
    toast.info('🔥 Popped edible gond crystals in hot desi ghee into crispy snow-white pearls!');
  };

  const handleRoastAttaSonth = () => {
    if (step !== 'roast') return;
    sounds.playPop();
    setStep('nuts');
    toast.info('🌾 Roasted coarse wheat atta with dry ginger sonth & nutmeg until aromatic golden brown!');
  };

  const handleFoldMakhanaNuts = () => {
    if (step !== 'nuts') return;
    sounds.playPop();
    setStep('bind');
    toast.info('✨ Folded in crunchy roasted makhana, cashews, almonds & melon seeds!');
  };

  const handleBindJaggeryLaddu = () => {
    if (step !== 'bind') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 850;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI GOND LADDU BOUND WITH ORGANIC GUR SERVED! (+850 Pts)');
  };

  const handleNewLadduBatch = () => {
    sounds.playPop();
    setStep('gond');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-700 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shahi Gond Laddu Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Ghee Gond Pop, Atta Sonth Roast & Organic Gur Binding</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Immunity Boost</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Ayurvedic Energy</span>
        </div>
      </div>

      {/* Laddu Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'gond' ? "border-amber-100 bg-amber-50/10" :
          step === 'roast' ? "border-amber-500 bg-amber-600/20 scale-105 shadow-amber-600/40" :
          step === 'nuts' ? "border-yellow-400 bg-yellow-500/30 scale-110 shadow-yellow-500/50" :
          step === 'bind' ? "border-amber-700 bg-gradient-to-tr from-amber-600 via-yellow-600 to-amber-800 scale-115 shadow-amber-800/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Sphere Center */}
          <div className="w-28 h-28 rounded-full border-2 border-dashed border-amber-400/80 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🪔</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'gond' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-20">🔥 Gond Ghee Pop</span>}
            {step === 'roast' && <span className="font-display font-bold text-xs text-amber-400 block -mt-20">🌾 Atta Sonth Roast</span>}
            {step === 'nuts' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">🥜 Makhana Dry Fruits</span>}
            {step === 'bind' && <span className="font-display font-bold text-xs text-black block -mt-20">🍯 Gur Laddu Binding</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Royal Gond Laddu!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'gond' && (
          <Button
            onClick={handlePopGondGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔥 Step 1: Fry Edible Gond in Hot Ghee into Crunchy White Pearls
          </Button>
        )}

        {step === 'roast' && (
          <Button
            onClick={handleRoastAttaSonth}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🌾 Step 2: Roast Whole Wheat Atta with Dry Ginger Sonth & Nutmeg
          </Button>
        )}

        {step === 'nuts' && (
          <Button
            onClick={handleFoldMakhanaNuts}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-400 text-black shadow-lg"
          >
            🥜 Step 3: Fold in Ghee-Roasted Makhana, Cashews & Almonds
          </Button>
        )}

        {step === 'bind' && (
          <Button
            onClick={handleBindJaggeryLaddu}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white shadow-lg"
          >
            🍯 Step 4: Pour Warm Organic Gur Syrup & Bind into Round Laddus
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewLadduBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Bind Next Royal Shahi Gond Laddu Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
