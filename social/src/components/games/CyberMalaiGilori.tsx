import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMalaiGilori() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(58500);
  const [step, setStep] = useState<'simmer-malai-sheets' | 'blend-gulkand-mawa' | 'fold-triangular-gilori' | 'pin-clove-silver' | 'served'>('simmer-malai-sheets');

  const handleSimmerMalaiSheets = () => {
    if (step !== 'simmer-malai-sheets') return;
    sounds.playPop();
    setStep('blend-gulkand-mawa');
    toast.info('🥛 Skimmed paper-thin clotted malai sheets from simmering rich buffalo milk!');
  };

  const handleBlendGulkandMawa = () => {
    if (step !== 'blend-gulkand-mawa') return;
    sounds.playPop();
    setStep('fold-triangular-gilori');
    toast.info('🌹 Blended rose petal gulkand, crushed almond-pista mawa & kewra water!');
  };

  const handleFoldTriangularGilori = () => {
    if (step !== 'fold-triangular-gilori') return;
    sounds.playPop();
    setStep('pin-clove-silver');
    toast.info('🍃 Folded delicate malai sheet into an authentic Awadhi triangular paan gilori!');
  };

  const handlePinCloveSilver = () => {
    if (step !== 'pin-clove-silver') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1480;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI AWADHI MALAI GILORI SERVED FRESH! (+1480 Pts)');
  };

  const handleNewGiloriBatch = () => {
    sounds.playPop();
    setStep('simmer-malai-sheets');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-400 via-emerald-500 to-amber-300 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Malai Gilori Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Paper-Thin Malai Sheet, Damask Rose Gulkand Mawa, Triangular Fold & Clove Pin</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Awadh Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Awadhi Malai Texture</span>
          <span className="font-display font-black text-xl text-rose-400">✨ 100% Silky</span>
        </div>
      </div>

      {/* Gilori Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer-malai-sheets' ? "border-amber-100 bg-amber-100/10" :
          step === 'blend-gulkand-mawa' ? "border-rose-400 bg-rose-400/20 scale-105 shadow-rose-400/40" :
          step === 'fold-triangular-gilori' ? "border-emerald-400 bg-gradient-to-tr from-rose-300 via-emerald-400 to-amber-200 scale-110 shadow-emerald-400/50" :
          step === 'pin-clove-silver' ? "border-amber-100 bg-gradient-to-r from-emerald-300 via-rose-300 to-slate-100 scale-115 shadow-amber-100/60" :
          "border-emerald-400 bg-emerald-400/20 scale-110"
        )}>
          {/* Gilori Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-rose-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🍃</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer-malai-sheets' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🥛 Thin Malai Sheets</span>}
            {step === 'blend-gulkand-mawa' && <span className="font-display font-bold text-xs text-rose-400 block -mt-24">🌹 Rose Gulkand Mawa</span>}
            {step === 'fold-triangular-gilori' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">🍃 Triangular Gilori Paan</span>}
            {step === 'pin-clove-silver' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Silver Vark & Clove Pin</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Awadhi Malai Gilori!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer-malai-sheets' && (
          <Button
            onClick={handleSimmerMalaiSheets}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Skim Paper-Thin Malai Sheets from Buffalo Milk
          </Button>
        )}

        {step === 'blend-gulkand-mawa' && (
          <Button
            onClick={handleBlendGulkandMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🌹 Step 2: Blend Rose Gulkand, Crushed Dry Fruit Mawa & Kewra
          </Button>
        )}

        {step === 'fold-triangular-gilori' && (
          <Button
            onClick={handleFoldTriangularGilori}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-emerald-600 text-white shadow-lg"
          >
            🍃 Step 3: Fold Malai Sheet into Awadhi Triangular Paan Envelope
          </Button>
        )}

        {step === 'pin-clove-silver' && (
          <Button
            onClick={handlePinCloveSilver}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-rose-400 via-emerald-400 to-amber-200 text-black shadow-lg"
          >
            👑 Step 4: Apply Silver Vark & Pin with Aromatic Laung Clove
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGiloriBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Malai Gilori Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
