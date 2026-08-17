import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Play, RotateCcw, Sparkles, CheckCircle2, Utensils, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberDosa() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(4600);
  const [step, setStep] = useState<'empty' | 'batter' | 'ghee_masala' | 'crispy' | 'flipped'>('empty');
  const [tawaTemp, setTawaTemp] = useState(180);

  const handlePourBatter = () => {
    if (step !== 'empty') return;
    sounds.playPop();
    setStep('batter');
    toast.info('🥣 Fermented batter swirled in smooth circular concentric rings!');
  };

  const handleAddGheeAndMasala = () => {
    if (step !== 'batter') return;
    sounds.playPop();
    setStep('ghee_masala');
    toast.info('🧈 Pure desi ghee drizzled & fiery Podi gunpowder masala sprinkled!');
  };

  const handleCrispAndStuff = () => {
    if (step !== 'ghee_masala') return;
    sounds.playChime();
    setStep('crispy');
    toast.info('🥔 Spiced potato masala placed! Golden crispy edges lifting from tawa.');
  };

  const handleFlipDosa = () => {
    if (step !== 'crispy') return;
    sounds.playChime();
    triggerConfetti();
    setStep('flipped');
    setScore((s) => {
      const nextScore = s + 350;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('🌟 PERFECT CRISPY GHEE ROAST DOSA! Folded & served with Coconut Chutney (+350 Pts)');
  };

  const handleNewDosa = () => {
    sounds.playPop();
    setStep('empty');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Dosa Master Flip Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Batter Swirl, Ghee Roast, Podi Masala & Golden Fold</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Chef Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Cast-Iron Tawa Temp</span>
          <span className="font-display font-black text-xl text-amber-400">🔥 {tawaTemp}°C Hot</span>
        </div>
      </div>

      {/* Interactive Cast-Iron Tawa Canvas View */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        {/* Tawa Visual */}
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative",
          step === 'empty' ? "border-zinc-800 bg-zinc-900" :
          step === 'batter' ? "border-amber-900 bg-amber-100/10 scale-105" :
          step === 'ghee_masala' ? "border-amber-600 bg-gradient-to-tr from-amber-500/20 to-orange-500/20 scale-105" :
          step === 'crispy' ? "border-amber-400 bg-gradient-to-tr from-amber-400/40 to-yellow-500/30 scale-105 shadow-xl" :
          "border-emerald-500 bg-emerald-500/20 scale-100"
        )}>
          {step === 'empty' && <span className="font-mono text-xs text-zinc-500">Cast-Iron Tawa Ready</span>}
          {step === 'batter' && <span className="font-display font-bold text-amber-200">🥣 Batter Swirled</span>}
          {step === 'ghee_masala' && <span className="font-display font-bold text-amber-400">🧈 Ghee & Podi Sizzling</span>}
          {step === 'crispy' && <span className="font-display font-bold text-yellow-300">🥔 Crispy Roast & Potato Stuffing</span>}
          {step === 'flipped' && <span className="font-display font-bold text-emerald-400">✨ Folded Dosa Served!</span>}
        </div>
      </div>

      {/* Step Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {step === 'empty' && (
          <Button
            onClick={handlePourBatter}
            className="col-span-2 rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥣 Step 1: Pour & Swirl Batter
          </Button>
        )}

        {step === 'batter' && (
          <Button
            onClick={handleAddGheeAndMasala}
            className="col-span-2 rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🧈 Step 2: Drizzle Ghee & Podi Masala
          </Button>
        )}

        {step === 'ghee_masala' && (
          <Button
            onClick={handleCrispAndStuff}
            className="col-span-2 rounded-2xl h-12 text-xs font-bold font-mono bg-orange-500 text-white shadow-lg"
          >
            🥔 Step 3: Add Potato Masala & Crisp
          </Button>
        )}

        {step === 'crispy' && (
          <Button
            onClick={handleFlipDosa}
            className="col-span-2 rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 to-emerald-500 text-black shadow-lg"
          >
            ✨ Step 4: Golden Triangular Flip!
          </Button>
        )}

        {step === 'flipped' && (
          <Button
            onClick={handleNewDosa}
            className="col-span-2 rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Ghee Roast Dosa (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
