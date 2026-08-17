import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberChurmaLadoo() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(70000);
  const [step, setStep] = useState<'fry-atta-muthiya' | 'grind-coarse-crumbs' | 'fold-bura-dryfruits' | 'shape-royal-laddu' | 'served'>('fry-atta-muthiya');

  const handleFryAttaMuthiya = () => {
    if (step !== 'fry-atta-muthiya') return;
    sounds.playPop();
    setStep('grind-coarse-crumbs');
    toast.info('🫓 Kneaded coarse wheat flour with A2 cow ghee and deep-fried golden muthiyas in copper kadhai!');
  };

  const handleGrindCoarseCrumbs = () => {
    if (step !== 'grind-coarse-crumbs') return;
    sounds.playPop();
    setStep('fold-bura-dryfruits');
    toast.info('🌾 Ground warm golden muthiyas into fragrant coarse churma crumbs on stone sil-batta!');
  };

  const handleFoldBuraDryfruits = () => {
    if (step !== 'fold-bura-dryfruits') return;
    sounds.playPop();
    setStep('shape-royal-laddu');
    toast.info('🥜 Folded powdered bura sugar, green cardamom, saffron, chironji nuts, cashews & almonds!');
  };

  const handleShapeRoyalLaddu = () => {
    if (step !== 'shape-royal-laddu') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1620;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI RAJASTHANI CHURMA LADDU SERVED FRESH! (+1620 Pts)');
  };

  const handleNewLadduBatch = () => {
    sounds.playPop();
    setStep('fry-atta-muthiya');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-700 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Churma Laddu Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Atta Muthiya Fry, Sil-Batta Grind, Bura & Saffron Ghee Shape</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Marwar Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Churma Ghee Infusion</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Desi A2</span>
        </div>
      </div>

      {/* Churma Laddu Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'fry-atta-muthiya' ? "border-amber-300 bg-amber-300/10" :
          step === 'grind-coarse-crumbs' ? "border-yellow-400 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'fold-bura-dryfruits' ? "border-orange-500 bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-600 scale-110 shadow-orange-500/50" :
          step === 'shape-royal-laddu' ? "border-amber-300 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 scale-115 shadow-amber-300/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Laddu Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🫓</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'fry-atta-muthiya' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🫓 Golden Atta Muthiyas</span>}
            {step === 'grind-coarse-crumbs' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🌾 Sil-Batta Churma Crumbs</span>}
            {step === 'fold-bura-dryfruits' && <span className="font-display font-bold text-xs text-orange-400 block -mt-24">🥜 Bura Sugar & Saffron Ghee</span>}
            {step === 'shape-royal-laddu' && <span className="font-display font-bold text-xs text-amber-200 block -mt-24">👑 Golden Spherical Laddu</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Churma Laddu!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'fry-atta-muthiya' && (
          <Button
            onClick={handleFryAttaMuthiya}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🫓 Step 1: Deep-Fry Coarse Wheat Atta Muthiyas in Pure Desi Ghee
          </Button>
        )}

        {step === 'grind-coarse-crumbs' && (
          <Button
            onClick={handleGrindCoarseCrumbs}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌾 Step 2: Grind Golden Muthiyas into Warm Coarse Churma
          </Button>
        )}

        {step === 'fold-bura-dryfruits' && (
          <Button
            onClick={handleFoldBuraDryfruits}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-600 text-white shadow-lg"
          >
            🥜 Step 3: Fold Bura Sugar, Cardamom, Chironji & Hot A2 Ghee
          </Button>
        )}

        {step === 'shape-royal-laddu' && (
          <Button
            onClick={handleShapeRoyalLaddu}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-700 text-black shadow-lg"
          >
            👑 Step 4: Shape Warm Golden Spherical Shahi Churma Laddus
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewLadduBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Shape Next Churma Laddu Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
