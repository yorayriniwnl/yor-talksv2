import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberBanarasiLalPeda() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(33000);
  const [step, setStep] = useState<'roast-mawa' | 'amber-caramel' | 'sugar-spice' | 'kashi-seal' | 'served'>('roast-mawa');

  const handleRoastMawa = () => {
    if (step !== 'roast-mawa') return;
    sounds.playPop();
    setStep('amber-caramel');
    toast.info('🔥 Slow roasting thick buffalo milk khoya in heavy cast iron kadhai on wood embers!');
  };

  const handleAmberCaramel = () => {
    if (step !== 'amber-caramel') return;
    sounds.playPop();
    setStep('sugar-spice');
    toast.info('🍯 Khoya roasted until signature Banarasi reddish-amber caramel tint with pure ghee aroma!');
  };

  const handleSugarSpice = () => {
    if (step !== 'sugar-spice') return;
    sounds.playPop();
    setStep('kashi-seal');
    toast.info('✨ Blended aromatic green cardamom, jaiphal nutmeg & crunchy tagar boora sugar!');
  };

  const handleKashiSealStamp = () => {
    if (step !== 'kashi-seal') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1180;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 KASHI BANARASI LAL PEDA STAMPED WITH TEMPLE MOTIF & SERVED! (+1180 Pts)');
  };

  const handleNewLalPedaBatch = () => {
    sounds.playPop();
    setStep('roast-mawa');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-rose-700 to-amber-900 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Banarasi Lal Peda Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Dark Amber Roasted Mawa, Kashi Temple Seal, Tagar Sugar & Pistachio</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Ghats Roast Heat</span>
          <span className="font-display font-black text-xl text-rose-500">✨ 100% Lal Caramel</span>
        </div>
      </div>

      {/* Lal Peda Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'roast-mawa' ? "border-amber-200 bg-amber-100/10" :
          step === 'amber-caramel' ? "border-amber-600 bg-gradient-to-tr from-amber-700 via-rose-800 to-amber-900 scale-105 shadow-amber-700/40" :
          step === 'sugar-spice' ? "border-amber-400 bg-gradient-to-tr from-amber-600 via-rose-700 to-amber-800 scale-110 shadow-rose-600/50" :
          step === 'kashi-seal' ? "border-yellow-400 bg-gradient-to-r from-amber-700 via-rose-700 to-amber-900 scale-115 shadow-yellow-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Peda Stamp Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-yellow-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🪔</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'roast-mawa' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥛 Buffalo Milk Khoya</span>}
            {step === 'amber-caramel' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🔥 Dark Amber Caramel</span>}
            {step === 'sugar-spice' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">✨ Elaichi & Tagar Boora</span>}
            {step === 'kashi-seal' && <span className="font-display font-bold text-xs text-yellow-200 block -mt-24">🪔 Wooden Temple Stamp</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Banarasi Lal Peda!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'roast-mawa' && (
          <Button
            onClick={handleRoastMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔥 Step 1: Slow Roast Buffalo Milk Khoya on Cast Iron Embers
          </Button>
        )}

        {step === 'amber-caramel' && (
          <Button
            onClick={handleAmberCaramel}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-700 text-white shadow-lg"
          >
            🍯 Step 2: Roast to Signature Reddish-Amber Lal Caramel Tint
          </Button>
        )}

        {step === 'sugar-spice' && (
          <Button
            onClick={handleSugarSpice}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            ✨ Step 3: Blend Cardamom, Nutmeg & Tagar Boora Sugar
          </Button>
        )}

        {step === 'kashi-seal' && (
          <Button
            onClick={handleKashiSealStamp}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-lg"
          >
            🪔 Step 4: Press with Wooden Kashi Temple Motif Stamp
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewLalPedaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Kashi Banarasi Lal Peda Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
