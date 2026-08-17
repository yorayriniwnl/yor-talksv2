import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberDilkhushak() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(64500);
  const [step, setStep] = useState<'roast-besan-ghee' | 'fold-khoya-mawa' | 'press-royal-slab' | 'cut-diamond-chakki' | 'served'>('roast-besan-ghee');

  const handleRoastBesanGhee = () => {
    if (step !== 'roast-besan-ghee') return;
    sounds.playPop();
    setStep('fold-khoya-mawa');
    toast.info('🧈 Roasted coarse stone-ground besan in golden A2 Gir cow ghee in copper lagan!');
  };

  const handleFoldKhoyaMawa = () => {
    if (step !== 'fold-khoya-mawa') return;
    sounds.playPop();
    setStep('press-royal-slab');
    toast.info('🥥 Folded fresh creamy khoya mawa, green cardamom & saffron sugar syrup!');
  };

  const handlePressRoyalSlab = () => {
    if (step !== 'press-royal-slab') return;
    sounds.playPop();
    setStep('cut-diamond-chakki');
    toast.info('✨ Pressed into thick square slab, garnished with 24K silver vark & slivered pistachios!');
  };

  const handleCutDiamondChakki = () => {
    if (step !== 'cut-diamond-chakki') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1560;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI MEWARI DILKHUSHAK SERVED FRESH! (+1560 Pts)');
  };

  const handleNewDilkhushakBatch = () => {
    sounds.playPop();
    setStep('roast-besan-ghee');
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
              Cyber Dilkhushak Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Ghee Besan Roast, Khoya Mawa Fold, Silver Vark Slab & Diamond Chakki</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Aroma Level</span>
          <span className="font-display font-black text-xl text-amber-500">✨ 100% Ghee Roast</span>
        </div>
      </div>

      {/* Dilkhushak Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'roast-besan-ghee' ? "border-amber-100 bg-amber-100/10" :
          step === 'fold-khoya-mawa' ? "border-amber-500 bg-amber-500/20 scale-105 shadow-amber-500/40" :
          step === 'press-royal-slab' ? "border-yellow-400 bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-600 scale-110 shadow-yellow-400/50" :
          step === 'cut-diamond-chakki' ? "border-amber-200 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 scale-115 shadow-amber-200/60" :
          "border-yellow-400 bg-yellow-400/20 scale-110"
        )}>
          {/* Dilkhushak Icon */}
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🫓</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'roast-besan-ghee' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🧈 A2 Ghee Besan Roast</span>}
            {step === 'fold-khoya-mawa' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🥥 Creamy Khoya Mawa</span>}
            {step === 'press-royal-slab' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">✨ Silver Vark Royal Slab</span>}
            {step === 'cut-diamond-chakki' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Diamond Chakki Cuts</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Mewari Dilkhushak!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'roast-besan-ghee' && (
          <Button
            onClick={handleRoastBesanGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🧈 Step 1: Roast Coarse Besan in Pure A2 Cow Ghee
          </Button>
        )}

        {step === 'fold-khoya-mawa' && (
          <Button
            onClick={handleFoldKhoyaMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🥥 Step 2: Fold Fresh Khoya Mawa & Saffron Cardamom Chashni
          </Button>
        )}

        {step === 'press-royal-slab' && (
          <Button
            onClick={handlePressRoyalSlab}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            ✨ Step 3: Press Thick Slab & Garnish Silver Vark & Pistachios
          </Button>
        )}

        {step === 'cut-diamond-chakki' && (
          <Button
            onClick={handleCutDiamondChakki}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 text-black shadow-lg"
          >
            👑 Step 4: Precision Cut Traditional Diamond Chakki Pieces
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewDilkhushakBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Mewari Dilkhushak Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
