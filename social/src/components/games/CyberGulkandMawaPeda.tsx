import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGulkandMawaPeda() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(76000);
  const [step, setStep] = useState<'roast-caramel-mawa' | 'fold-dryfruit-cardamom' | 'stuff-gulkand-core' | 'emboss-silver-vark' | 'served'>('roast-caramel-mawa');

  const handleRoastCaramelMawa = () => {
    if (step !== 'roast-caramel-mawa') return;
    sounds.playPop();
    setStep('fold-dryfruit-cardamom');
    toast.info('🔥 Roasted fresh mawa khoya to golden caramelized aroma in heavy brass kadhai!');
  };

  const handleFoldDryfruitCardamom = () => {
    if (step !== 'fold-dryfruit-cardamom') return;
    sounds.playPop();
    setStep('stuff-gulkand-core');
    toast.info('🌰 Folded crushed pistachios, roasted cashews & fragrant green cardamom powder!');
  };

  const handleStuffGulkandCore = () => {
    if (step !== 'stuff-gulkand-core') return;
    sounds.playPop();
    setStep('emboss-silver-vark');
    toast.info('🌹 Stuffed center cavity with organic Damask rose gulkand & crunchy melon seeds (magaz)!');
  };

  const handleEmbossSilverVark = () => {
    if (step !== 'emboss-silver-vark') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1680;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI GULKAND MAWA PEDA SERVED FRESH! (+1680 Pts)');
  };

  const handleNewPedaBatch = () => {
    sounds.playPop();
    setStep('roast-caramel-mawa');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-amber-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Gulkand Mawa Peda Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Caramel Mawa Roast, Dryfruit Cardamom Fold, Rose Gulkand Core & Silver Vark</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Bikaner Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Mawa Caramelization</span>
          <span className="font-display font-black text-xl text-rose-400">✨ 100% Shahi</span>
        </div>
      </div>

      {/* Peda Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'roast-caramel-mawa' ? "border-amber-300 bg-amber-300/10" :
          step === 'fold-dryfruit-cardamom' ? "border-amber-500 bg-amber-500/20 scale-105 shadow-amber-500/40" :
          step === 'stuff-gulkand-core' ? "border-rose-500 bg-gradient-to-tr from-rose-500 via-amber-500 to-rose-600 scale-110 shadow-rose-500/50" :
          step === 'emboss-silver-vark' ? "border-amber-200 bg-gradient-to-r from-amber-300 via-rose-400 to-amber-400 scale-115 shadow-amber-200/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Peda Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🫓</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'roast-caramel-mawa' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🔥 Caramelized Mawa Khoya</span>}
            {step === 'fold-dryfruit-cardamom' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🌰 Pista & Elaichi Fold</span>}
            {step === 'stuff-gulkand-core' && <span className="font-display font-bold text-xs text-rose-300 block -mt-24">🌹 Damask Rose Gulkand Core</span>}
            {step === 'emboss-silver-vark' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Silver Vark & Magaz Seal</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Gulkand Mawa Peda!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'roast-caramel-mawa' && (
          <Button
            onClick={handleRoastCaramelMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔥 Step 1: Roast Mawa Khoya in Brass Kadhai to Golden Caramel
          </Button>
        )}

        {step === 'fold-dryfruit-cardamom' && (
          <Button
            onClick={handleFoldDryfruitCardamom}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🌰 Step 2: Fold Crushed Pistachios, Cashews & Elaichi
          </Button>
        )}

        {step === 'stuff-gulkand-core' && (
          <Button
            onClick={handleStuffGulkandCore}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🌹 Step 3: Stuff Organic Rose Gulkand & Melon Seeds (Magaz)
          </Button>
        )}

        {step === 'emboss-silver-vark' && (
          <Button
            onClick={handleEmbossSilverVark}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-lg"
          >
            👑 Step 4: Emboss Royal Brass Seal Stamp & Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewPedaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Gulkand Peda Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
