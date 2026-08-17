import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberBalushahi() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(11800);
  const [step, setStep] = useState<'dough' | 'shape' | 'fry' | 'chashni' | 'served'>('dough');

  const handleKneadFlakyDough = () => {
    if (step !== 'dough') return;
    sounds.playPop();
    setStep('shape');
    toast.info('🧈 Soft maida, curd & desi ghee gently folded into thousands of flaky dough layers!');
  };

  const handleShapeDimpledDiscs = () => {
    if (step !== 'shape') return;
    sounds.playPop();
    setStep('fry');
    toast.info('✨ Round dough discs rolled & thumb-indented at center for even heat expansion!');
  };

  const handleSlowSimmerGhee = () => {
    if (step !== 'fry') return;
    sounds.playChime();
    setStep('chashni');
    toast.info('🔥 Fried gently over low-heat desi ghee until golden, crispy & flaked to core!');
  };

  const handleSoakSaffronChashni = () => {
    if (step !== 'chashni') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 700;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 CRISPY FLAKY SAFFRON GLAZED BALUSHAHI DUNKED & SERVED (+700 Pts)');
  };

  const handleNewBalushahi = () => {
    sounds.playPop();
    setStep('dough');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Balushahi Flaky Glazed Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Layered Maida Dough, Low-Flame Ghee Fry & Saffron Sugar Glaze</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Flaky Crust Bloom</span>
          <span className="font-display font-black text-xl text-amber-500">✨ 100% Layered Flakes</span>
        </div>
      </div>

      {/* Balushahi Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'dough' ? "border-amber-100 bg-amber-50/10" :
          step === 'shape' ? "border-amber-300 bg-amber-300/20 scale-105" :
          step === 'fry' ? "border-amber-500 bg-gradient-to-tr from-amber-600 to-yellow-600 scale-110 shadow-amber-600/50" :
          step === 'chashni' ? "border-amber-400 bg-gradient-to-tr from-amber-300 via-yellow-300 to-amber-500 scale-115 shadow-yellow-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Center Dimple Indentation */}
          <div className="w-12 h-12 rounded-full border border-dashed border-border/60 flex items-center justify-center bg-black/20">
            <span className="text-base">🥜</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'dough' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-16">🧈 Layered Dough</span>}
            {step === 'shape' && <span className="font-display font-bold text-xs text-amber-300 block -mt-16">🍩 Dimpled Disc</span>}
            {step === 'fry' && <span className="font-display font-bold text-xs text-amber-200 block -mt-16">🔥 Golden Ghee Bloom</span>}
            {step === 'chashni' && <span className="font-display font-bold text-xs text-black block -mt-16">🍯 Saffron Glaze</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-16">👑 Royal Balushahi!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'dough' && (
          <Button
            onClick={handleKneadFlakyDough}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🧈 Step 1: Gently Fold Soft Maida & Desi Ghee Dough Layers
          </Button>
        )}

        {step === 'shape' && (
          <Button
            onClick={handleShapeDimpledDiscs}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🍩 Step 2: Hand-Roll & Thumb-Dimple Round Discs
          </Button>
        )}

        {step === 'fry' && (
          <Button
            onClick={handleSlowSimmerGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🔥 Step 3: Slow-Fry in Low-Flame Ghee until Flakes Bloom
          </Button>
        )}

        {step === 'chashni' && (
          <Button
            onClick={handleSoakSaffronChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black shadow-lg"
          >
            🍯 Step 4: Dunk in Warm Saffron Chashni & Pistachio Slivers
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewBalushahi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Fry Next Royal Balushahi Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
