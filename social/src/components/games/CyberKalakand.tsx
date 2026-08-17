import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKalakand() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(11200);
  const [step, setStep] = useState<'milk' | 'danedar' | 'caramel' | 'set' | 'served'>('milk');

  const handleSimmerMilk = () => {
    if (step !== 'milk') return;
    sounds.playPop();
    setStep('danedar');
    toast.info('🥛 Rich whole buffalo milk simmered & reduced over slow woodfire kadhai!');
  };

  const handleCurdleDanedar = () => {
    if (step !== 'danedar') return;
    sounds.playPop();
    setStep('caramel');
    toast.info('✨ Alum added to create signature grainy Danedar moist curd texture!');
  };

  const handleCaramelizeCore = () => {
    if (step !== 'caramel') return;
    sounds.playChime();
    setStep('set');
    toast.info('🔥 Inner core caramelized into deep golden-brown while retaining ivory exterior!');
  };

  const handleSetAlwarSquares = () => {
    if (step !== 'set') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 680;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 SHUDH ALWAR DANEDAR KALAKAND MILK CAKE SET & SERVED (+680 Pts)');
  };

  const handleNewKalakand = () => {
    sounds.playPop();
    setStep('milk');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-600 to-yellow-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kalakand Alwar Milk Cake Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Danedar Granular Curd, Caramel Brown Center & Cardamom Pistachio Squares</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Alwar Halwai Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Danedar Texture</span>
          <span className="font-display font-black text-xl text-amber-500">✨ 100% Grainy Curd</span>
        </div>
      </div>

      {/* Kalakand Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-40 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'milk' ? "border-amber-100 bg-amber-50/10" :
          step === 'danedar' ? "border-amber-300 bg-amber-200/20 scale-105" :
          step === 'caramel' ? "border-amber-600 bg-gradient-to-tr from-amber-800 via-amber-600 to-amber-200 scale-110 shadow-amber-600/50" :
          step === 'set' ? "border-amber-400 bg-gradient-to-tr from-amber-100 via-amber-700 to-amber-100 scale-115 shadow-amber-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Cardamom & Pistachio Top Bits */}
          <div className="flex gap-2 text-xl">
            <span>✨</span>
            <span>🥜</span>
            <span>✨</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'milk' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-16">🥛 Whole Buffalo Milk</span>}
            {step === 'danedar' && <span className="font-display font-bold text-xs text-amber-300 block -mt-16">🌾 Danedar Granules</span>}
            {step === 'caramel' && <span className="font-display font-bold text-xs text-amber-200 block -mt-16">🔥 Brown Caramel Core</span>}
            {step === 'set' && <span className="font-display font-bold text-xs text-black block -mt-16">🧊 Alwar Milk Cake Box</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-16">👑 Royal Kalakand!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'milk' && (
          <Button
            onClick={handleSimmerMilk}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer & Reduce Whole Buffalo Milk in Iron Kadhai
          </Button>
        )}

        {step === 'danedar' && (
          <Button
            onClick={handleCurdleDanedar}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🌾 Step 2: Add Alum to Form Danedar Moist Granular Curd
          </Button>
        )}

        {step === 'caramel' && (
          <Button
            onClick={handleCaramelizeCore}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-700 text-white shadow-lg"
          >
            🔥 Step 3: Slow Caramelize Core into Rich Golden-Brown
          </Button>
        )}

        {step === 'set' && (
          <Button
            onClick={handleSetAlwarSquares}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 text-black shadow-lg"
          >
            🧊 Step 4: Set in Deep Mawa Moulds & Slice Cardamom Squares
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewKalakand}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Alwar Kalakand Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
