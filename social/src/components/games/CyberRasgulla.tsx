import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Trophy, Play, RotateCcw, Sparkles, CheckCircle2, Utensils, Star, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberRasgulla() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(5600);
  const [step, setStep] = useState<'chenna' | 'knead' | 'boil' | 'soak' | 'served'>('chenna');

  const handleCurdleChenna = () => {
    if (step !== 'chenna') return;
    sounds.playPop();
    setStep('knead');
    toast.info('🥛 Fresh milk curdled into soft, moisture-rich Chenna curd!');
  };

  const handleKneadSpheres = () => {
    if (step !== 'knead') return;
    sounds.playPop();
    setStep('boil');
    toast.info('⚪ Kneaded with gentle palm pressure into crack-free, silky smooth spheres!');
  };

  const handleBoilBubblingSyrup = () => {
    if (step !== 'boil') return;
    sounds.playChime();
    setStep('soak');
    toast.info('🔥 Boiled vigorously in bubbling cardamom sugar syrup until doubled in size & super spongy!');
  };

  const handleServeChilledSyrup = () => {
    if (step !== 'soak') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 450;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('🌟 MELT-IN-MOUTH SPONGY ROSOGOLLA SERVED with Chilled Cardamom Rose Syrup (+450 Pts)');
  };

  const handleNewRasgulla = () => {
    sounds.playPop();
    setStep('chenna');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Rasgulla Spongy Dip Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Chenna Kneading, Bubbling Syrup Boil & Spongy Elasticity</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kolkata High Score</span>
          <strong className="text-cyan-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score} Pts</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Sponge Bounce</span>
          <span className="font-display font-black text-xl text-cyan-400">⚪ 99.8% Elastic</span>
        </div>
      </div>

      {/* Rasgulla Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'chenna' ? "border-cyan-200/40 bg-cyan-100/10" :
          step === 'knead' ? "border-white bg-white/20 scale-105" :
          step === 'boil' ? "border-cyan-300 bg-gradient-to-tr from-cyan-400/30 via-white/40 to-cyan-200/30 scale-110 shadow-cyan-400/50" :
          step === 'soak' ? "border-cyan-400 bg-gradient-to-tr from-cyan-300 to-white scale-120 shadow-cyan-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          <div className="text-center">
            {step === 'chenna' && <span className="font-mono text-xs text-cyan-200">🥛 Fresh Chenna</span>}
            {step === 'knead' && <span className="font-display font-bold text-white">⚪ Smooth Sphere</span>}
            {step === 'boil' && <span className="font-display font-bold text-cyan-100">🔥 Bubbling Syrup Boil</span>}
            {step === 'soak' && <span className="font-display font-bold text-cyan-900">✨ Spongy & Juicy</span>}
            {step === 'served' && <span className="font-display font-bold text-emerald-400">✨ Chilled Sweet!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'chenna' && (
          <Button
            onClick={handleCurdleChenna}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Curdle Fresh Cow Milk into Soft Chenna
          </Button>
        )}

        {step === 'knead' && (
          <Button
            onClick={handleKneadSpheres}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-white text-black shadow-lg"
          >
            ⚪ Step 2: Knead Smooth Crack-Free Spheres
          </Button>
        )}

        {step === 'boil' && (
          <Button
            onClick={handleBoilBubblingSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-cyan-500 text-black shadow-lg"
          >
            🔥 Step 3: Boil in Cardamom Sugar Water to Double Size
          </Button>
        )}

        {step === 'soak' && (
          <Button
            onClick={handleServeChilledSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-cyan-400 to-emerald-500 text-black shadow-lg"
          >
            ✨ Step 4: Plate in Chilled Rose Saffron Syrup & Serve
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewRasgulla}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Boil Next Spongy Rasgulla (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
