import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGulabPaanGilori() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(80000);
  const [step, setStep] = useState<'roll-malai-sheet' | 'stuff-gulkand-dates' | 'fold-triangular-gilori' | 'seal-clove-vark' | 'served'>('roll-malai-sheet');

  const handleRollMalaiSheet = () => {
    if (step !== 'roll-malai-sheet') return;
    sounds.playPop();
    setStep('stuff-gulkand-dates');
    toast.info('🥛 Rolled ultra-thin clotted malai sheets and cut into delicate diamond paan base!');
  };

  const handleStuffGulkandDates = () => {
    if (step !== 'stuff-gulkand-dates') return;
    sounds.playPop();
    setStep('fold-triangular-gilori');
    toast.info('🌹 Stuffed organic Damask rose gulkand, candied dates, saunf & crushed pistachios!');
  };

  const handleFoldTriangularGilori = () => {
    if (step !== 'fold-triangular-gilori') return;
    sounds.playPop();
    setStep('seal-clove-vark');
    toast.info('🔺 Folded delicate malai sheet into royal triangular gilori paan shape!');
  };

  const handleSealCloveVark = () => {
    if (step !== 'seal-clove-vark') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1720;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI GULAB PAAN GILORI SERVED FRESH! (+1720 Pts)');
  };

  const handleNewGiloriBatch = () => {
    sounds.playPop();
    setStep('roll-malai-sheet');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-emerald-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Rose Paan Gilori Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Malai Sheet Roll, Rose Gulkand Core, Triangular Fold & Clove Seal</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Awadh Score</span>
          <strong className="text-rose-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score} Pts</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Malai Sheet Silkiness</span>
          <span className="font-display font-black text-xl text-rose-400">✨ 100% Shahi</span>
        </div>
      </div>

      {/* Gilori Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'roll-malai-sheet' ? "border-amber-200 bg-amber-200/10" :
          step === 'stuff-gulkand-dates' ? "border-rose-400 bg-rose-400/20 scale-105 shadow-rose-400/40" :
          step === 'fold-triangular-gilori' ? "border-emerald-500 bg-gradient-to-tr from-emerald-500 via-rose-500 to-pink-500 scale-110 shadow-emerald-500/50" :
          step === 'seal-clove-vark' ? "border-rose-300 bg-gradient-to-r from-rose-300 via-pink-400 to-emerald-400 scale-115 shadow-rose-300/60" :
          "border-rose-400 bg-rose-400/20 scale-110"
        )}>
          {/* Gilori Icon */}
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-rose-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌿</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'roll-malai-sheet' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥛 Ultra-Thin Malai Sheet</span>}
            {step === 'stuff-gulkand-dates' && <span className="font-display font-bold text-xs text-rose-300 block -mt-24">🌹 Rose Gulkand & Dates</span>}
            {step === 'fold-triangular-gilori' && <span className="font-display font-bold text-xs text-emerald-300 block -mt-24">🔺 Triangular Malai Paan</span>}
            {step === 'seal-clove-vark' && <span className="font-display font-bold text-xs text-rose-100 block -mt-24">👑 Clove Spike & Silver Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-rose-400 block -mt-24">👑 Shahi Rose Paan Gilori!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'roll-malai-sheet' && (
          <Button
            onClick={handleRollMalaiSheet}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Roll Out Thin Clotted Malai Sheet Diamond Base
          </Button>
        )}

        {step === 'stuff-gulkand-dates' && (
          <Button
            onClick={handleStuffGulkandDates}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🌹 Step 2: Stuff Damask Rose Gulkand, Dates & Pista
          </Button>
        )}

        {step === 'fold-triangular-gilori' && (
          <Button
            onClick={handleFoldTriangularGilori}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-emerald-600 text-white shadow-lg"
          >
            🔺 Step 3: Fold Malai Sheet into Triangular Gilori Paan
          </Button>
        )}

        {step === 'seal-clove-vark' && (
          <Button
            onClick={handleSealCloveVark}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-rose-500 via-pink-500 to-emerald-500 text-white shadow-lg"
          >
            👑 Step 4: Seal with Fragrant Clove & 24K Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGiloriBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Rose Gilori Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
