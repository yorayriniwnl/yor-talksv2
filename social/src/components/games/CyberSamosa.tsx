import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Play, RotateCcw, Sparkles, CheckCircle2, Utensils, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberSamosa() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(4800);
  const [step, setStep] = useState<'cone' | 'filling' | 'crimped' | 'fried' | 'served'>('cone');

  const handleFoldCone = () => {
    if (step !== 'cone') return;
    sounds.playPop();
    setStep('filling');
    toast.info('🥟 Ajwain maida dough folded into a neat triangular cone!');
  };

  const handleAddSpicedAloo = () => {
    if (step !== 'filling') return;
    sounds.playPop();
    setStep('crimped');
    toast.info('🥔 Stuffed with fragrant coriander-cumin spiced aloo matar filling!');
  };

  const handleDeepFry = () => {
    if (step !== 'crimped') return;
    sounds.playChime();
    setStep('fried');
    toast.info('🔥 Sizzled in golden oil until flaky, crispy, and blistered!');
  };

  const handleServeWithChutneys = () => {
    if (step !== 'fried') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 380;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('🌟 CRISPY HOT SAMOSA SERVED with Saunth (Sweet Imli) & Teekhi Pudina Chutneys (+380 Pts)');
  };

  const handleNewSamosa = () => {
    sounds.playPop();
    setStep('cone');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Samosa Chai Tap Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Dough Cone, Spiced Aloo Stuffing, Flaky Fry & Imli Chutney</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Halwai High Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kadhai Heat</span>
          <span className="font-display font-black text-xl text-amber-400">🔥 175°C Crisp</span>
        </div>
      </div>

      {/* Samosa Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-40 h-40 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative rotate-45",
          step === 'cone' ? "border-amber-200/40 bg-amber-100/10" :
          step === 'filling' ? "border-amber-500 bg-amber-500/20 scale-105" :
          step === 'crimped' ? "border-amber-600 bg-amber-600/30 scale-105" :
          step === 'fried' ? "border-amber-400 bg-gradient-to-tr from-amber-500 to-orange-600 scale-110 shadow-amber-500/50" :
          "border-emerald-500 bg-emerald-500/20 scale-105"
        )}>
          <div className="-rotate-45 text-center">
            {step === 'cone' && <span className="font-mono text-xs text-amber-200">🥟 Dough Cone</span>}
            {step === 'filling' && <span className="font-display font-bold text-amber-300">🥔 Spiced Aloo Stuffed</span>}
            {step === 'crimped' && <span className="font-display font-bold text-amber-100">🔒 Seams Crimped</span>}
            {step === 'fried' && <span className="font-display font-bold text-white">🔥 Golden & Flaky</span>}
            {step === 'served' && <span className="font-display font-bold text-emerald-400">✨ Chutneys Served!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'cone' && (
          <Button
            onClick={handleFoldCone}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥟 Step 1: Fold Ajwain Dough Cone
          </Button>
        )}

        {step === 'filling' && (
          <Button
            onClick={handleAddSpicedAloo}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🥔 Step 2: Stuff Spiced Aloo Matar Masala
          </Button>
        )}

        {step === 'crimped' && (
          <Button
            onClick={handleDeepFry}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-500 text-white shadow-lg"
          >
            🔥 Step 3: Deep Fry in Hot Oil to Golden Crisp
          </Button>
        )}

        {step === 'fried' && (
          <Button
            onClick={handleServeWithChutneys}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 to-emerald-500 text-black shadow-lg"
          >
            ✨ Step 4: Plate with Imli & Mint Chutneys
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewSamosa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Fry Next Crispy Samosa (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
