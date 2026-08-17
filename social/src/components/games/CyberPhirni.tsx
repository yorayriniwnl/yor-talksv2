import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberPhirni() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(20000);
  const [step, setStep] = useState<'grind' | 'simmer' | 'mango' | 'shikora' | 'served'>('grind');

  const handleGrindBasmati = () => {
    if (step !== 'grind') return;
    sounds.playPop();
    setStep('simmer');
    toast.info('🌾 Soaked aromatic Basmati rice and ground to coarse fragrant grain paste!');
  };

  const handleSimmerKesarMilk = () => {
    if (step !== 'simmer') return;
    sounds.playPop();
    setStep('mango');
    toast.info('🔥 Simmered rice paste in rich buffalo milk with Kashmiri kesar & cardamom!');
  };

  const handleFoldMangoPulp = () => {
    if (step !== 'mango') return;
    sounds.playPop();
    setStep('shikora');
    toast.info('🥭 Swirled in sweet fresh Ratnagiri Alphonso mango puree!');
  };

  const handleLadleTerracottaShikora = () => {
    if (step !== 'shikora') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 920;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 CHILLED KESAR MANGO PHIRNI IN CLAY SHIKORA SERVED! (+920 Pts)');
  };

  const handleNewPhirniBatch = () => {
    sounds.playPop();
    setStep('grind');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kesar Mango Phirni Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Basmati Grind, Saffron Milk Simmer & Terracotta Shikora Chill</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Terracotta Aromatics</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Chilled Clay Matka</span>
        </div>
      </div>

      {/* Phirni Shikora Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'grind' ? "border-amber-100 bg-amber-50/10" :
          step === 'simmer' ? "border-yellow-400 bg-yellow-500/20 scale-105 shadow-yellow-500/40" :
          step === 'mango' ? "border-orange-500 bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-500 scale-110 shadow-orange-500/50" :
          step === 'shikora' ? "border-amber-700 bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-800 scale-115 shadow-amber-700/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Terracotta Shikora Center */}
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-amber-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🥭</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'grind' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-20">🌾 Basmati Rice Grind</span>}
            {step === 'simmer' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">🔥 Saffron Milk Simmer</span>}
            {step === 'mango' && <span className="font-display font-bold text-xs text-black block -mt-20">🥭 Alphonso Pulp Fold</span>}
            {step === 'shikora' && <span className="font-display font-bold text-xs text-amber-100 block -mt-20">🏺 Terracotta Shikora Chill</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Royal Mango Phirni!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'grind' && (
          <Button
            onClick={handleGrindBasmati}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Grind Soaked Basmati Rice into Coarse Grain Paste
          </Button>
        )}

        {step === 'simmer' && (
          <Button
            onClick={handleSimmerKesarMilk}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🔥 Step 2: Simmer with Whole Buffalo Milk & Kashmiri Saffron
          </Button>
        )}

        {step === 'mango' && (
          <Button
            onClick={handleFoldMangoPulp}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-500 text-white shadow-lg"
          >
            🥭 Step 3: Fold in Fresh Sweet Ratnagiri Alphonso Mango Pulp
          </Button>
        )}

        {step === 'shikora' && (
          <Button
            onClick={handleLadleTerracottaShikora}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white shadow-lg"
          >
            🏺 Step 4: Ladle into Porous Clay Shikoras & Chill on Ice Bed
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewPhirniBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Simmer Next Royal Kesar Mango Phirni Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
