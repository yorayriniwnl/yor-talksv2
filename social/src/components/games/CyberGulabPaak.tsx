import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGulabPaak() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(66000);
  const [step, setStep] = useState<'distill-chaitri-rose' | 'simmer-mawa-ghee' | 'infuse-gulkand-fudge' | 'slice-royal-paak' | 'served'>('distill-chaitri-rose');

  const handleDistillChaitriRose = () => {
    if (step !== 'distill-chaitri-rose') return;
    sounds.playPop();
    setStep('simmer-mawa-ghee');
    toast.info('🌹 Distilled fresh organic Chaitri rose petals into fragrant rose extract!');
  };

  const handleSimmerMawaGhee = () => {
    if (step !== 'simmer-mawa-ghee') return;
    sounds.playPop();
    setStep('infuse-gulkand-fudge');
    toast.info('🧈 Simmered creamy whole buffalo mawa with pure A2 cow ghee in copper kadhai!');
  };

  const handleInfuseGulkandFudge = () => {
    if (step !== 'infuse-gulkand-fudge') return;
    sounds.playPop();
    setStep('slice-royal-paak');
    toast.info('🌸 Infused organic Damask rose gulkand, green cardamom & crystal sugar into lush pink fudge!');
  };

  const handleSliceRoyalPaak = () => {
    if (step !== 'slice-royal-paak') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1580;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI MEWARI GULAB PAAK SERVED FRESH! (+1580 Pts)');
  };

  const handleNewGulabPaakBatch = () => {
    sounds.playPop();
    setStep('distill-chaitri-rose');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Gulab Paak Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Chaitri Rose Distill, Mawa Ghee Simmer, Gulkand Fudge & Silver Vark</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Mewar Score</span>
          <strong className="text-pink-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score} Pts</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Rose Fragrance</span>
          <span className="font-display font-black text-xl text-pink-400">✨ 100% Chaitri</span>
        </div>
      </div>

      {/* Gulab Paak Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'distill-chaitri-rose' ? "border-pink-300 bg-pink-300/10" :
          step === 'simmer-mawa-ghee' ? "border-amber-500 bg-amber-500/20 scale-105 shadow-amber-500/40" :
          step === 'infuse-gulkand-fudge' ? "border-pink-500 bg-gradient-to-tr from-pink-400 via-rose-500 to-amber-400 scale-110 shadow-pink-500/50" :
          step === 'slice-royal-paak' ? "border-rose-200 bg-gradient-to-r from-pink-300 via-rose-400 to-amber-300 scale-115 shadow-rose-200/60" :
          "border-pink-400 bg-pink-400/20 scale-110"
        )}>
          {/* Gulab Paak Icon */}
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-pink-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌹</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'distill-chaitri-rose' && <span className="font-mono text-[0.65rem] text-pink-200 block -mt-24">🌹 Chaitri Rose Petals</span>}
            {step === 'simmer-mawa-ghee' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🧈 Creamy Buffalo Mawa</span>}
            {step === 'infuse-gulkand-fudge' && <span className="font-display font-bold text-xs text-pink-300 block -mt-24">🌸 Lush Rose Gulkand Fudge</span>}
            {step === 'slice-royal-paak' && <span className="font-display font-bold text-xs text-rose-100 block -mt-24">👑 Silver Vark Royal Slices</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-pink-400 block -mt-24">👑 Shahi Mewari Gulab Paak!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'distill-chaitri-rose' && (
          <Button
            onClick={handleDistillChaitriRose}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌹 Step 1: Distill Fresh Organic Chaitri Rose Petals
          </Button>
        )}

        {step === 'simmer-mawa-ghee' && (
          <Button
            onClick={handleSimmerMawaGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🧈 Step 2: Simmer Buffalo Mawa with Pure A2 Cow Ghee
          </Button>
        )}

        {step === 'infuse-gulkand-fudge' && (
          <Button
            onClick={handleInfuseGulkandFudge}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-pink-600 text-white shadow-lg"
          >
            🌸 Step 3: Infuse Rose Gulkand, Cardamom & Sugar Syrup
          </Button>
        )}

        {step === 'slice-royal-paak' && (
          <Button
            onClick={handleSliceRoyalPaak}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-white shadow-lg"
          >
            👑 Step 4: Top Silver Vark, Almond Slivers & Slice Royal Paak
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGulabPaakBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Gulab Paak Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
