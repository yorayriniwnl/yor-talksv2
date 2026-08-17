import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Play, RotateCcw, Sparkles, CheckCircle2, Utensils, Star, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberJalebi() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(5400);
  const [step, setStep] = useState<'squeeze' | 'frying' | 'chashni' | 'rabri' | 'served'>('squeeze');

  const handleSqueezeSpiral = () => {
    if (step !== 'squeeze') return;
    sounds.playPop();
    setStep('frying');
    toast.info('🌀 Fermented saffron batter squeezed in 3.5 perfect concentric spirals!');
  };

  const handleFryCrispy = () => {
    if (step !== 'frying') return;
    sounds.playChime();
    setStep('chashni');
    toast.info('🔥 Sizzled in pure desi ghee until crunchy, golden, and translucent!');
  };

  const handleDipChashni = () => {
    if (step !== 'chashni') return;
    sounds.playPop();
    setStep('rabri');
    toast.info('🍯 Soaked in warm saffron-cardamom sugar syrup until bursting with sweetness!');
  };

  const handleServeWithRabri = () => {
    if (step !== 'rabri') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 420;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('🌟 CRUNCHY PIPING HOT JALEBI SERVED with Thick Malai Rabri (+420 Pts)');
  };

  const handleNewJalebi = () => {
    sounds.playPop();
    setStep('squeeze');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Jalebi Swirl Master Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Concentric Spirals, Ghee Sizzle, Saffron Chashni & Malai Rabri</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Spiral Accuracy</span>
          <span className="font-display font-black text-xl text-amber-400">🌀 99.4% Perfect</span>
        </div>
      </div>

      {/* Jalebi Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'squeeze' ? "border-amber-200/40 bg-amber-100/10" :
          step === 'frying' ? "border-amber-500 bg-amber-500/20 scale-105" :
          step === 'chashni' ? "border-orange-500 bg-gradient-to-tr from-amber-500 to-orange-500 scale-110 shadow-orange-500/50" :
          step === 'rabri' ? "border-yellow-400 bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-200 scale-110 shadow-amber-400/50" :
          "border-emerald-500 bg-emerald-500/20 scale-105"
        )}>
          <div className="text-center">
            {step === 'squeeze' && <span className="font-mono text-xs text-amber-200">🌀 Batter Ready</span>}
            {step === 'frying' && <span className="font-display font-bold text-amber-300">🔥 Desi Ghee Sizzling</span>}
            {step === 'chashni' && <span className="font-display font-bold text-white">🍯 Saffron Chashni Soaked</span>}
            {step === 'rabri' && <span className="font-display font-bold text-white">🥛 Malai Rabri Topped</span>}
            {step === 'served' && <span className="font-display font-bold text-emerald-400">✨ Crunchy Jalebi Served!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'squeeze' && (
          <Button
            onClick={handleSqueezeSpiral}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌀 Step 1: Squeeze 3.5 Concentric Spirals in Ghee
          </Button>
        )}

        {step === 'frying' && (
          <Button
            onClick={handleFryCrispy}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🔥 Step 2: Sizzle to Golden Translucent Crunch
          </Button>
        )}

        {step === 'chashni' && (
          <Button
            onClick={handleDipChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-500 text-white shadow-lg"
          >
            🍯 Step 3: Plunge in Warm Saffron-Cardamom Chashni
          </Button>
        )}

        {step === 'rabri' && (
          <Button
            onClick={handleServeWithRabri}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 to-emerald-500 text-black shadow-lg"
          >
            ✨ Step 4: Plate with Thick Malai Rabri & Serve
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewJalebi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Squeeze Next Saffron Jalebi (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
