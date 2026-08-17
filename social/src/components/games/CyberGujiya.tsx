import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGujiya() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(8900);
  const [step, setStep] = useState<'dough' | 'stuffing' | 'seal' | 'fry' | 'served'>('dough');

  const handleRollFineDough = () => {
    if (step !== 'dough') return;
    sounds.playPop();
    setStep('stuffing');
    toast.info('🌾 Fine maida flour kneaded with pure desi ghee and rolled into delicate thin discs!');
  };

  const handleStuffMawaPista = () => {
    if (step !== 'stuffing') return;
    sounds.playPop();
    setStep('seal');
    toast.info('🥥 Stuffed generously with roasted sweet mawa (khoya), coconut, cardamom & chopped pistachios!');
  };

  const handleSealFlutedCrescent = () => {
    if (step !== 'seal') return;
    sounds.playChime();
    setStep('fry');
    toast.info('🌙 Fluted edges crimped tightly in crescent moon shape with brass Gujiya mold!');
  };

  const handleFryGoldenGhee = () => {
    if (step !== 'fry') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 580;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('✨ CRISPY DESI GHEE MAWA GUJIYA DIPPED & SERVED (+580 Pts)');
  };

  const handleNewGujiya = () => {
    sounds.playPop();
    setStep('dough');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-500 to-yellow-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Gujiya Mawa Crescent Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Roasted Khoya Mawa, Desiccated Coconut & Fluted Golden Crescent Crust</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Holi Halwai Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Khoya Richness</span>
          <span className="font-display font-black text-xl text-rose-400">✨ 100% Shudh Desi Ghee</span>
        </div>
      </div>

      {/* Gujiya Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-52 h-28 rounded-t-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'dough' ? "border-amber-200/40 bg-amber-100/10" :
          step === 'stuffing' ? "border-amber-400 bg-amber-400/20 scale-105 border-dashed" :
          step === 'seal' ? "border-rose-400 bg-gradient-to-tr from-amber-400 to-rose-400 scale-110 shadow-rose-400/50" :
          step === 'fry' ? "border-amber-500 bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 scale-115 shadow-amber-500/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Fluted Edge Trim */}
          <div className="absolute top-0 inset-x-0 border-b-2 border-dashed border-border/40 h-2" />

          <div className="text-center pointer-events-none">
            {step === 'dough' && <span className="font-mono text-[0.65rem] text-amber-200 block mt-2">🌾 Fine Maida Disc</span>}
            {step === 'stuffing' && <span className="font-display font-bold text-xs text-amber-300 block mt-2">🥥 Sweet Khoya Mawa</span>}
            {step === 'seal' && <span className="font-display font-bold text-xs text-black block mt-2">🌙 Fluted Crescent Edge</span>}
            {step === 'fry' && <span className="font-display font-bold text-xs text-black block mt-2">🔥 Crispy Desi Ghee Fry</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block mt-2">✨ Shudh Mawa Gujiya!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'dough' && (
          <Button
            onClick={handleRollFineDough}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Knead Fine Maida Dough & Roll Delicate Thin Discs
          </Button>
        )}

        {step === 'stuffing' && (
          <Button
            onClick={handleStuffMawaPista}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-400 text-black shadow-lg"
          >
            🥥 Step 2: Stuff with Roasted Khoya Mawa, Coconut & Pistachios
          </Button>
        )}

        {step === 'seal' && (
          <Button
            onClick={handleSealFlutedCrescent}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-500 text-white shadow-lg"
          >
            🌙 Step 3: Seal with Fluted Crescent Moon Edge Pattern
          </Button>
        )}

        {step === 'fry' && (
          <Button
            onClick={handleFryGoldenGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 text-black shadow-lg"
          >
            🔥 Step 4: Fry in Pure Desi Ghee & Dunk in Rose Sugar Nectar
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGujiya}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Royal Mawa Gujiya (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
