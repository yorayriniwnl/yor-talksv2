import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberSoanPapdi() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(10500);
  const [step, setStep] = useState<'syrup' | 'besan' | 'stretch' | 'set' | 'served'>('syrup');

  const handleBoilSyrup = () => {
    if (step !== 'syrup') return;
    sounds.playPop();
    setStep('besan');
    toast.info('🍯 Sugar & glucose syrup boiled to precise soft-ball golden thread consistency!');
  };

  const handleRoastBesanGhee = () => {
    if (step !== 'besan') return;
    sounds.playPop();
    setStep('stretch');
    toast.info('🧈 Roasted nutty gram flour (besan) & maida blended into warm desi ghee!');
  };

  const handleStretchFlakyRibbons = () => {
    if (step !== 'stretch') return;
    sounds.playChime();
    setStep('set');
    toast.info('✨ Hot spun sugar vigorously pulled, stretched & folded into thousands of ultra-thin flaky ribbons!');
  };

  const handleSetPistachioCubes = () => {
    if (step !== 'set') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 650;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 CRISPY FLAKY DESI GHEE SOAN PAPDI SET & CUT (+650 Pts)');
  };

  const handleNewSoanPapdi = () => {
    sounds.playPop();
    setStep('syrup');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Soan Papdi Flaky Ribbon Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Spun Sugar Threads, Desi Ghee Besan, Stretched Flakes & Pistachio Cubes</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Flaky Ribbon Count</span>
          <span className="font-display font-black text-xl text-yellow-400">✨ 10,000+ Threads</span>
        </div>
      </div>

      {/* Soan Papdi Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-40 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'syrup' ? "border-yellow-200 bg-yellow-100/10" :
          step === 'besan' ? "border-amber-400 bg-amber-400/20 scale-105" :
          step === 'stretch' ? "border-yellow-400 bg-gradient-to-tr from-amber-300 via-yellow-200 to-amber-500 scale-110 shadow-yellow-500/50" :
          step === 'set' ? "border-yellow-300 bg-gradient-to-tr from-yellow-100 via-amber-200 to-yellow-400 scale-115 shadow-yellow-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Cardamom & Pistachio Top Bits */}
          <div className="flex gap-2 text-xl">
            <span>✨</span>
            <span>🥜</span>
            <span>✨</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'syrup' && <span className="font-mono text-[0.65rem] text-yellow-200 block -mt-16">🍯 Sugar Syrup</span>}
            {step === 'besan' && <span className="font-display font-bold text-xs text-amber-300 block -mt-16">🧈 Roasted Besan</span>}
            {step === 'stretch' && <span className="font-display font-bold text-xs text-black block -mt-16">🌾 10,000 Flaky Threads</span>}
            {step === 'set' && <span className="font-display font-bold text-xs text-black block -mt-16">🧊 Cut Square Cubes</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-16">👑 Royal Soan Papdi!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'syrup' && (
          <Button
            onClick={handleBoilSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🍯 Step 1: Boil Sugar & Glucose Syrup to Thread Consistency
          </Button>
        )}

        {step === 'besan' && (
          <Button
            onClick={handleRoastBesanGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🧈 Step 2: Roast Besan in Pure Desi Ghee & Cardamom
          </Button>
        )}

        {step === 'stretch' && (
          <Button
            onClick={handleStretchFlakyRibbons}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌾 Step 3: Pull & Stretch Hot Spun Sugar into 10,000 Flaky Ribbons
          </Button>
        )}

        {step === 'set' && (
          <Button
            onClick={handleSetPistachioCubes}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-black shadow-lg"
          >
            🧊 Step 4: Press into Brass Tray with Pistachios & Cut Cubes
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewSoanPapdi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Spin Next Flaky Soan Papdi Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
