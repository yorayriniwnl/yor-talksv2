import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMalaiPaan() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(35000);
  const [step, setStep] = useState<'simmer-malai' | 'shape-gilori' | 'fill-gulkand' | 'silver-vark' | 'served'>('simmer-malai');

  const handleSimmerMalai = () => {
    if (step !== 'simmer-malai') return;
    sounds.playPop();
    setStep('shape-gilori');
    toast.info('🥛 Simmered full-cream buffalo milk into delicate, paper-thin royal malai sheets!');
  };

  const handleShapeGilori = () => {
    if (step !== 'shape-gilori') return;
    sounds.playPop();
    setStep('fill-gulkand');
    toast.info('📐 Cut malai sheets and folded into traditional Awadhi triangular gilori paan pockets!');
  };

  const handleFillGulkand = () => {
    if (step !== 'fill-gulkand') return;
    sounds.playPop();
    setStep('silver-vark');
    toast.info('🌹 Stuffed with rich saffron khoya, pistachio slivers & fragrant Damask rose gulkand!');
  };

  const handleSilverVarkWrap = () => {
    if (step !== 'silver-vark') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1200;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL AWADHI MALAI PAAN GILORI WRAPPED IN SILVER VARK & SERVED! (+1200 Pts)');
  };

  const handleNewMalaiPaanBatch = () => {
    sounds.playPop();
    setStep('simmer-malai');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-amber-300 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Awadhi Malai Paan Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Paper-Thin Malai Sheet, Gulkand Khoya Core, Silver Vark & Pistachio</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Shahi Halwai Score</span>
          <strong className="text-emerald-400 font-bold">{highScore} Pts</strong>
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
          <span className="font-display font-black text-xl text-teal-400">✨ 100% Silk Sheet</span>
        </div>
      </div>

      {/* Malai Paan Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer-malai' ? "border-amber-100 bg-amber-50/10" :
          step === 'shape-gilori' ? "border-emerald-400 bg-emerald-500/20 scale-105 shadow-emerald-500/40" :
          step === 'fill-gulkand' ? "border-rose-400 bg-gradient-to-tr from-emerald-500 via-rose-500 to-amber-300 scale-110 shadow-rose-500/50" :
          step === 'silver-vark' ? "border-slate-200 bg-gradient-to-r from-emerald-400 via-slate-100 to-yellow-300 scale-115 shadow-slate-200/60" :
          "border-emerald-400 bg-emerald-500/20 scale-110"
        )}>
          {/* Paan Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🍃</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer-malai' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🥛 Paper-Thin Malai Sheet</span>}
            {step === 'shape-gilori' && <span className="font-display font-bold text-xs text-emerald-300 block -mt-24">📐 Triangular Gilori Fold</span>}
            {step === 'fill-gulkand' && <span className="font-display font-bold text-xs text-rose-300 block -mt-24">🌹 Rose Gulkand & Khoya</span>}
            {step === 'silver-vark' && <span className="font-display font-bold text-xs text-slate-100 block -mt-24">✨ Silver Vark & Pista Garnish</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Awadhi Malai Paan!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer-malai' && (
          <Button
            onClick={handleSimmerMalai}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer Full-Cream Milk into Silk Malai Sheet
          </Button>
        )}

        {step === 'shape-gilori' && (
          <Button
            onClick={handleShapeGilori}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-emerald-600 text-white shadow-lg"
          >
            📐 Step 2: Fold Malai into Triangular Gilori Paan Pocket
          </Button>
        )}

        {step === 'fill-gulkand' && (
          <Button
            onClick={handleFillGulkand}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🌹 Step 3: Fill with Saffron Khoya, Pistachio & Rose Gulkand
          </Button>
        )}

        {step === 'silver-vark' && (
          <Button
            onClick={handleSilverVarkWrap}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-200 text-black shadow-lg"
          >
            ✨ Step 4: Wrap in Edible Silver Vark & Garnish with Pistachios
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewMalaiPaanBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Malai Paan Gilori Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
