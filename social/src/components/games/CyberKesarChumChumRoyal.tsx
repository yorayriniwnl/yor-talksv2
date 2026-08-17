import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKesarChumChumRoyal() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(86000);
  const [step, setStep] = useState<'shape-chenna-logs' | 'boil-saffron-syrup' | 'slit-stuff-mawa-malai' | 'garnish-pista-silver' | 'served'>('shape-chenna-logs');

  const handleShapeChennaLogs = () => {
    if (step !== 'shape-chenna-logs') return;
    sounds.playPop();
    setStep('boil-saffron-syrup');
    toast.info('🥛 Hand-rolled smooth saffron chenna into cylindrical chum-chum logs!');
  };

  const handleBoilSaffronSyrup = () => {
    if (step !== 'boil-saffron-syrup') return;
    sounds.playPop();
    setStep('slit-stuff-mawa-malai');
    toast.info('🌸 Boiled in piping hot saffron cardamom chashni until spongy and puffed!');
  };

  const handleSlitStuffMawaMalai = () => {
    if (step !== 'slit-stuff-mawa-malai') return;
    sounds.playPop();
    setStep('garnish-pista-silver');
    toast.info('🧈 Slit lengthwise and stuffed rich sweetened khoya mawa & thick malai cream!');
  };

  const handleGarnishPistaSilver = () => {
    if (step !== 'garnish-pista-silver') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1780;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KESAR CHUM CHUM SERVED FRESH! (+1780 Pts)');
  };

  const handleNewChumChumBatch = () => {
    sounds.playPop();
    setStep('shape-chenna-logs');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kesar Chum Chum Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Chenna Log Shaping, Saffron Syrup Boil, Mawa Cream Stuffing & Silver Garnish</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Bengal Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Sponginess Index</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Spongy</span>
        </div>
      </div>

      {/* Chum Chum Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'shape-chenna-logs' ? "border-amber-200 bg-amber-200/10" :
          step === 'boil-saffron-syrup' ? "border-yellow-400 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'slit-stuff-mawa-malai' ? "border-amber-500 bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 scale-110 shadow-amber-500/50" :
          step === 'garnish-pista-silver' ? "border-yellow-300 bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-500 scale-115 shadow-yellow-300/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Chum Chum Icon */}
          <div className="w-24 h-16 rounded-2xl border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🫔</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'shape-chenna-logs' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥛 Cylindrical Chenna Logs</span>}
            {step === 'boil-saffron-syrup' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🌸 Saffron Syrup Boil</span>}
            {step === 'slit-stuff-mawa-malai' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🧈 Stuffed Mawa Khoya Cream</span>}
            {step === 'garnish-pista-silver' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Pista & Silver Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Kesar Chum Chum!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'shape-chenna-logs' && (
          <Button
            onClick={handleShapeChennaLogs}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Roll Saffron Chenna into Cylindrical Chum-Chum Logs
          </Button>
        )}

        {step === 'boil-saffron-syrup' && (
          <Button
            onClick={handleBoilSaffronSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌸 Step 2: Boil in Saffron Cardamom Chashni until Spongy
          </Button>
        )}

        {step === 'slit-stuff-mawa-malai' && (
          <Button
            onClick={handleSlitStuffMawaMalai}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🧈 Step 3: Slit Lengthwise & Stuff Sweetened Mawa Khoya Cream
          </Button>
        )}

        {step === 'garnish-pista-silver' && (
          <Button
            onClick={handleGarnishPistaSilver}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-400 via-amber-500 to-amber-600 text-black shadow-lg"
          >
            👑 Step 4: Garnish Crushed Pistachios & Edible Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewChumChumBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Kesar Chum Chum Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
