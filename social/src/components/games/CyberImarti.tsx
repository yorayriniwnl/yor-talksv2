import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberImarti() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(12400);
  const [step, setStep] = useState<'batter' | 'pipe' | 'fry' | 'chashni' | 'served'>('batter');

  const handleWhipUradBatter = () => {
    if (step !== 'batter') return;
    sounds.playPop();
    setStep('pipe');
    toast.info('🪷 Fine urad dal batter aerated & infused with pure natural saffron extract!');
  };

  const handlePipeFloralRosette = () => {
    if (step !== 'pipe') return;
    sounds.playPop();
    setStep('fry');
    toast.info('✨ Piped intricate circular rosette floral gear petals through muslin cloth potli!');
  };

  const handleCrispyGheeFry = () => {
    if (step !== 'fry') return;
    sounds.playChime();
    setStep('chashni');
    toast.info('🔥 Fried crispy in simmering desi ghee until lattice ring patterns harden!');
  };

  const handleSoakHotChashni = () => {
    if (step !== 'chashni') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 720;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 CRISPY ORANGE SAFFRON IMARTI ROSETTE DUNKED & SERVED (+720 Pts)');
  };

  const handleNewImarti = () => {
    sounds.playPop();
    setStep('batter');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Imarti Saffron Rosette Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Aerated Urad Batter, Cloth Potli Piping & Saffron Chashni</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Rosette Petal Precision</span>
          <span className="font-display font-black text-xl text-orange-500">🌸 100% Floral Lattice</span>
        </div>
      </div>

      {/* Imarti Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'batter' ? "border-amber-200 bg-amber-50/10" :
          step === 'pipe' ? "border-orange-400 bg-orange-500/20 scale-105" :
          step === 'fry' ? "border-orange-500 bg-gradient-to-tr from-orange-600 to-amber-600 scale-110 shadow-orange-600/50" :
          step === 'chashni' ? "border-amber-400 bg-gradient-to-tr from-orange-400 via-amber-400 to-yellow-400 scale-115 shadow-orange-500/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Circular Gear Rosette Loops */}
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-orange-400/80 flex items-center justify-center animate-spin-slow">
            <span className="text-xl">🏵️</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'batter' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-16">🥛 Aerated Batter</span>}
            {step === 'pipe' && <span className="font-display font-bold text-xs text-orange-300 block -mt-16">🌸 Rosette Loops</span>}
            {step === 'fry' && <span className="font-display font-bold text-xs text-orange-200 block -mt-16">🔥 Crispy Lattice</span>}
            {step === 'chashni' && <span className="font-display font-bold text-xs text-black block -mt-16">🍯 Saffron Glaze</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-16">👑 Royal Imarti!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'batter' && (
          <Button
            onClick={handleWhipUradBatter}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Aerate Whipped Urad Dal Batter with Saffron
          </Button>
        )}

        {step === 'pipe' && (
          <Button
            onClick={handlePipeFloralRosette}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-500 text-black shadow-lg"
          >
            🌸 Step 2: Pipe Double Circular Rosette Petals with Potli
          </Button>
        )}

        {step === 'fry' && (
          <Button
            onClick={handleCrispyGheeFry}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-600 text-white shadow-lg"
          >
            🔥 Step 3: Fry in Simmering Desi Ghee until Crispy
          </Button>
        )}

        {step === 'chashni' && (
          <Button
            onClick={handleSoakHotChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-500 text-black shadow-lg"
          >
            🍯 Step 4: Dunk in Piping-Hot Cardamom Saffron Chashni
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewImarti}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Pipe Next Shahi Imarti Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
