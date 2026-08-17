import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Droplets, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberRasmalai() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(7600);
  const [step, setStep] = useState<'chenna' | 'rabri' | 'soak' | 'garnish' | 'served'>('chenna');

  const handleKneadChenna = () => {
    if (step !== 'chenna') return;
    sounds.playPop();
    setStep('rabri');
    toast.info('🥛 Soft fresh chenna kneaded and flattened into delicate spongy discs!');
  };

  const handleBoilSaffronRabri = () => {
    if (step !== 'rabri') return;
    sounds.playChime();
    setStep('soak');
    toast.info('🔥 Whole milk simmered with Kashmiri saffron strands (Kesar) & cardamom into golden Rabri!');
  };

  const handleSoakInCream = () => {
    if (step !== 'soak') return;
    sounds.playPop();
    setStep('garnish');
    toast.info('🍯 Poached chenna discs immersed into chilled saffron rabri — absorbed creamy nectar!');
  };

  const handleGarnishPista = () => {
    if (step !== 'garnish') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 540;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL KESAR PISTA RASMALAI SERVED IN SILVER BOWL (+540 Pts)');
  };

  const handleNewRasmalai = () => {
    sounds.playPop();
    setStep('chenna');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Rasmalai Saffron Milk Dip Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Spongy Chenna Discs, Thick Kesar Rabri & Crushed Pistachios</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Royal Halwai Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Saffron Infusion</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Zafrani Rabri</span>
        </div>
      </div>

      {/* Rasmalai Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'chenna' ? "border-slate-200 bg-white/20" :
          step === 'rabri' ? "border-amber-400 bg-amber-400/20 scale-105" :
          step === 'soak' ? "border-yellow-400 bg-gradient-to-tr from-amber-400 to-yellow-300 scale-110 shadow-yellow-400/50" :
          step === 'garnish' ? "border-yellow-300 bg-gradient-to-tr from-yellow-200 via-amber-300 to-yellow-500 scale-115 shadow-amber-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          <div className="text-center">
            {step === 'chenna' && <span className="font-mono text-xs text-slate-100">⚪ Flat Chenna Disc</span>}
            {step === 'rabri' && <span className="font-display font-bold text-amber-300">🔥 Golden Saffron Rabri</span>}
            {step === 'soak' && <span className="font-display font-bold text-black">🥛 Creamy Milk Soak</span>}
            {step === 'garnish' && <span className="font-display font-bold text-black">✨ Pista Almond Flakes</span>}
            {step === 'served' && <span className="font-display font-bold text-emerald-400">✨ Royal Rasmalai!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'chenna' && (
          <Button
            onClick={handleKneadChenna}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            ⚪ Step 1: Knead Soft Fresh Chenna into Flat Spongy Discs
          </Button>
        )}

        {step === 'rabri' && (
          <Button
            onClick={handleBoilSaffronRabri}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-400 text-black shadow-lg"
          >
            🔥 Step 2: Simmer Whole Milk with Saffron (Kesar) into Golden Rabri
          </Button>
        )}

        {step === 'soak' && (
          <Button
            onClick={handleSoakInCream}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-400 text-black shadow-lg"
          >
            🥛 Step 3: Immerse Spongy Discs in Chilled Saffron Cream
          </Button>
        )}

        {step === 'garnish' && (
          <Button
            onClick={handleGarnishPista}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-400 to-emerald-500 text-black shadow-lg"
          >
            ✨ Step 4: Garnish with Pistachio Flakes & Serve in Silver Bowl
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewRasmalai}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Prepare Next Royal Kesar Rasmalai (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
