import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Gem, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKajuKatli() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(6200);
  const [step, setStep] = useState<'cashew' | 'cook' | 'roll' | 'cut' | 'served'>('cashew');

  const handleGrindCashew = () => {
    if (step !== 'cashew') return;
    sounds.playPop();
    setStep('cook');
    toast.info('🌰 Premium Goan whole cashews powdered into velvet-fine flour!');
  };

  const handleCookKajuDough = () => {
    if (step !== 'cook') return;
    sounds.playChime();
    setStep('roll');
    toast.info('🔥 Simmered in single-thread sugar syrup until silky smooth fudge paste forms!');
  };

  const handleApplySilverVark = () => {
    if (step !== 'roll') return;
    sounds.playPop();
    setStep('cut');
    toast.info('✨ Rolled flat and crowned with authentic edible silver chandi vark leaf!');
  };

  const handleScoreDiamondCuts = () => {
    if (step !== 'cut') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 480;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('💎 ROYAL DIAMOND KAJU KATLI CUTS BOXED with Silver Vark Sheen (+480 Pts)');
  };

  const handleNewKajuKatli = () => {
    sounds.playPop();
    setStep('cashew');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-200 via-white to-slate-200 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gem className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kaju Katli Diamond Cut Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Goan Cashew Powder, Ek Taar Syrup, Silver Vark & 45° Diamond Cuts</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Royal Halwai Record</span>
          <strong className="text-amber-300 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score} Pts</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Diamond Precision</span>
          <span className="font-display font-black text-xl text-amber-300">💎 45.0° Geometric</span>
        </div>
      </div>

      {/* Kaju Katli Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-36 border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative skew-x-12",
          step === 'cashew' ? "border-amber-100/40 bg-amber-50/10 rounded-xl" :
          step === 'cook' ? "border-amber-200 bg-amber-100/20 scale-105 rounded-xl" :
          step === 'roll' ? "border-slate-200 bg-gradient-to-tr from-slate-200 via-white to-amber-100 scale-110 shadow-slate-200/50 rounded-xl" :
          step === 'cut' ? "border-amber-300 bg-gradient-to-tr from-amber-100 via-white to-amber-200 scale-115 shadow-amber-300/60 rounded-xl" :
          "border-emerald-500 bg-emerald-500/20 scale-110 rounded-xl"
        )}>
          <div className="-skew-x-12 text-center">
            {step === 'cashew' && <span className="font-mono text-xs text-amber-100">🌰 Goan Cashew Powder</span>}
            {step === 'cook' && <span className="font-display font-bold text-amber-200">🔥 Silky Fudge Dough</span>}
            {step === 'roll' && <span className="font-display font-bold text-slate-800">✨ Silver Vark Applied</span>}
            {step === 'cut' && <span className="font-display font-bold text-amber-900">💎 45° Diamond Slices</span>}
            {step === 'served' && <span className="font-display font-bold text-emerald-400">✨ Gift Box Ready!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'cashew' && (
          <Button
            onClick={handleGrindCashew}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌰 Step 1: Grind Premium Cashews to Velvet Powder
          </Button>
        )}

        {step === 'cook' && (
          <Button
            onClick={handleCookKajuDough}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-200 text-black shadow-lg"
          >
            🔥 Step 2: Simmer in Ek-Taar Chashni into Smooth Paste
          </Button>
        )}

        {step === 'roll' && (
          <Button
            onClick={handleApplySilverVark}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-slate-200 text-black shadow-lg"
          >
            ✨ Step 3: Roll Flat & Crown with Edible Silver Vark
          </Button>
        )}

        {step === 'cut' && (
          <Button
            onClick={handleScoreDiamondCuts}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-300 via-white to-emerald-400 text-black shadow-lg"
          >
            💎 Step 4: Score Precise 45° Diamond Cuts & Box
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewKajuKatli}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cut Next Diamond Kaju Katli Tray (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
