import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKesarGujiya() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(61500);
  const [step, setStep] = useState<'knead-moyen-dough' | 'roast-chironji-mawa' | 'fold-fluted-crescent' | 'fry-saffron-chashni' | 'served'>('knead-moyen-dough');

  const handleKneadMoyenDough = () => {
    if (step !== 'knead-moyen-dough') return;
    sounds.playPop();
    setStep('roast-chironji-mawa');
    toast.info('🌾 Kneaded silky maida dough with warm desi ghee moyen into pliable golden discs!');
  };

  const handleRoastChironjiMawa = () => {
    if (step !== 'roast-chironji-mawa') return;
    sounds.playPop();
    setStep('fold-fluted-crescent');
    toast.info('🥥 Roasted fresh khoya mawa with chironji nuts, dry grated coconut & green cardamom!');
  };

  const handleFoldFlutedCrescent = () => {
    if (step !== 'fold-fluted-crescent') return;
    sounds.playPop();
    setStep('fry-saffron-chashni');
    toast.info('🌙 Stuffed and crimped crescent edges with authentic Mathura floral brass cutter!');
  };

  const handleFrySaffronChashni = () => {
    if (step !== 'fry-saffron-chashni') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1520;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KESAR GUJIYA SERVED FRESH! (+1520 Pts)');
  };

  const handleNewGujiyaBatch = () => {
    sounds.playPop();
    setStep('knead-moyen-dough');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kesar Gujiya Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Ghee Moyen Dough, Chironji Dry Fruit Mawa, Fluted Crescent & Saffron Chashni</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Flakiness</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Khasta</span>
        </div>
      </div>

      {/* Gujiya Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'knead-moyen-dough' ? "border-amber-100 bg-amber-100/10" :
          step === 'roast-chironji-mawa' ? "border-amber-500 bg-amber-500/20 scale-105 shadow-amber-500/40" :
          step === 'fold-fluted-crescent' ? "border-yellow-400 bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-600 scale-110 shadow-yellow-400/50" :
          step === 'fry-saffron-chashni' ? "border-amber-200 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 scale-115 shadow-amber-200/60" :
          "border-yellow-400 bg-yellow-400/20 scale-110"
        )}>
          {/* Gujiya Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🥟</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'knead-moyen-dough' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🌾 Ghee Moyen Dough</span>}
            {step === 'roast-chironji-mawa' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🥥 Roasted Chironji Mawa</span>}
            {step === 'fold-fluted-crescent' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🌙 Fluted Crescent Edge</span>}
            {step === 'fry-saffron-chashni' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Ghee Fry & Saffron Dip</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Kesar Gujiya!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'knead-moyen-dough' && (
          <Button
            onClick={handleKneadMoyenDough}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Knead Fine Maida Flour with Warm Desi Ghee Moyen
          </Button>
        )}

        {step === 'roast-chironji-mawa' && (
          <Button
            onClick={handleRoastChironjiMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🥥 Step 2: Roast Khoya Mawa with Chironji Nuts & Grated Coconut
          </Button>
        )}

        {step === 'fold-fluted-crescent' && (
          <Button
            onClick={handleFoldFlutedCrescent}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌙 Step 3: Stuff & Crimp Fluted Crescent Edges with Brass Mold
          </Button>
        )}

        {step === 'fry-saffron-chashni' && (
          <Button
            onClick={handleFrySaffronChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 text-black shadow-lg"
          >
            👑 Step 4: Deep Fry in Desi Ghee & Dip in Saffron Rose Syrup
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGujiyaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Gujiya Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
