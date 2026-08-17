import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberChikki() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(19000);
  const [step, setStep] = useState<'roast' | 'jaggery' | 'roll' | 'score' | 'served'>('roast');

  const handleRoastNuts = () => {
    if (step !== 'roast') return;
    sounds.playPop();
    setStep('jaggery');
    toast.info('🥜 Roasted crunchy peanuts, cashews & almonds in brass cauldron until fragrant!');
  };

  const handleMeltGurHardCrack = () => {
    if (step !== 'jaggery') return;
    sounds.playPop();
    setStep('roll');
    toast.info('🔥 Melted organic jaggery to exact 150°C hard-crack bubble stage!');
  };

  const handleRollBrassPin = () => {
    if (step !== 'roll') return;
    sounds.playPop();
    setStep('score');
    toast.info('✨ Rolled hot jaggery-nut mixture into razor-thin glossy crunchy slab with heavy brass pin!');
  };

  const handleDiamondScoreChikki = () => {
    if (step !== 'score') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 900;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 CRISPY LONAVALA DRY FRUIT CHIKKI CRACKED & SERVED! (+900 Pts)');
  };

  const handleNewChikkiBatch = () => {
    sounds.playPop();
    setStep('roast');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-500 to-yellow-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Lonavala Dry Fruit Chikki Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Nut Roast, Hard-Crack Gur & Brass Roller Diamond Snap</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Crunch Crispness</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Glossy Snap</span>
        </div>
      </div>

      {/* Chikki Slab Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-36 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'roast' ? "border-amber-400 bg-amber-500/10" :
          step === 'jaggery' ? "border-amber-700 bg-amber-700/30 scale-105 shadow-amber-700/40" :
          step === 'roll' ? "border-yellow-500 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 scale-110 shadow-yellow-500/50" :
          step === 'score' ? "border-amber-400 bg-gradient-to-tr from-amber-700 via-yellow-500 to-amber-800 scale-115 shadow-amber-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Diamond Snap Icon */}
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center bg-black/40 rotate-45">
            <span className="text-2xl -rotate-45">🥜</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'roast' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🥜 Nut Roasting</span>}
            {step === 'jaggery' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🔥 Hard-Crack Gur Melt</span>}
            {step === 'roll' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">✨ Brass Roller Flatten</span>}
            {step === 'score' && <span className="font-display font-bold text-xs text-amber-200 block -mt-24">📐 Diamond Scoring</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Crispy Chikki Snap!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'roast' && (
          <Button
            onClick={handleRoastNuts}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥜 Step 1: Roast Peanuts, Cashews & Almonds in Brass Kadai
          </Button>
        )}

        {step === 'jaggery' && (
          <Button
            onClick={handleMeltGurHardCrack}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-700 text-white shadow-lg"
          >
            🔥 Step 2: Melt Organic Gur to 150°C Hard-Crack Bubble Stage
          </Button>
        )}

        {step === 'roll' && (
          <Button
            onClick={handleRollBrassPin}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            ✨ Step 3: Roll Mixture with Heavy Brass Pin into Glossy Thin Slab
          </Button>
        )}

        {step === 'score' && (
          <Button
            onClick={handleDiamondScoreChikki}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white shadow-lg"
          >
            📐 Step 4: Diamond Cut & Snap Crispy Lonavala Chikki Pieces
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewChikkiBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Roll Next Royal Lonavala Chikki Slab (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
