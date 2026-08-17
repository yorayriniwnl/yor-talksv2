import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberChumChum() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(29000);
  const [step, setStep] = useState<'shape' | 'caramel-boil' | 'khoya-stuff' | 'coconut-garnish' | 'served'>('shape');

  const handleShapeOblongChena = () => {
    if (step !== 'shape') return;
    sounds.playPop();
    setStep('caramel-boil');
    toast.info('🥛 Shaped soft rich chena into authentic Porabari oblong cylindrical dumplings!');
  };

  const handleCaramelSyrupBoil = () => {
    if (step !== 'caramel-boil') return;
    sounds.playPop();
    setStep('khoya-stuff');
    toast.info('🔥 Simmered in caramelized saffron sugar syrup until rich golden amber!');
  };

  const handleStuffKhoyaMawa = () => {
    if (step !== 'khoya-stuff') return;
    sounds.playPop();
    setStep('coconut-garnish');
    toast.info('🧈 Slit and stuffed with rich cardamom khoya mawa & thick kesar malai cream!');
  };

  const handleGarnishCoconutPista = () => {
    if (step !== 'coconut-garnish') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1120;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL BENGALI MALAI CHUM CHUM GARNISHED & SERVED! (+1120 Pts)');
  };

  const handleNewChumChumBatch = () => {
    sounds.playPop();
    setStep('shape');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Bengali Malai Chum Chum Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Oblong Chena Shape, Amber Caramel Boil, Khoya Mawa Slit & Coconut Dust</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Amber Caramel Glow</span>
          <span className="font-display font-black text-xl text-rose-300">✨ 100% Khoya Mawa</span>
        </div>
      </div>

      {/* Chum Chum Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-52 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'shape' ? "border-amber-200 bg-amber-100/10" :
          step === 'caramel-boil' ? "border-amber-500 bg-gradient-to-tr from-amber-700 via-yellow-600 to-amber-800 scale-105 shadow-amber-600/40" :
          step === 'khoya-stuff' ? "border-rose-400 bg-gradient-to-r from-amber-600 via-rose-500 to-amber-700 scale-110 shadow-rose-500/50" :
          step === 'coconut-garnish' ? "border-yellow-200 bg-gradient-to-r from-pink-500 via-yellow-200 to-amber-500 scale-115 shadow-yellow-200/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Cylinder Icon */}
          <div className="w-24 h-14 rounded-full border-2 border-dashed border-yellow-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🪷</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'shape' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-20">🥛 Oblong Cylindrical Chena</span>}
            {step === 'caramel-boil' && <span className="font-display font-bold text-xs text-amber-300 block -mt-20">🔥 Amber Caramelized Chashni</span>}
            {step === 'khoya-stuff' && <span className="font-display font-bold text-xs text-rose-300 block -mt-20">🧈 Cardamom Khoya Mawa Slit</span>}
            {step === 'coconut-garnish' && <span className="font-display font-bold text-xs text-yellow-200 block -mt-20">🥥 Desiccated Coconut & Silver Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Shahi Malai Chum Chum!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'shape' && (
          <Button
            onClick={handleShapeOblongChena}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Shape Soft Chena into Oblong Cylindrical Dumplings
          </Button>
        )}

        {step === 'caramel-boil' && (
          <Button
            onClick={handleCaramelSyrupBoil}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🔥 Step 2: Simmer in Caramelized Saffron Chashni to Amber Glow
          </Button>
        )}

        {step === 'khoya-stuff' && (
          <Button
            onClick={handleStuffKhoyaMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🧈 Step 3: Slit Center & Stuff with Creamy Cardamom Khoya Mawa
          </Button>
        )}

        {step === 'coconut-garnish' && (
          <Button
            onClick={handleGarnishCoconutPista}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white shadow-lg"
          >
            🥥 Step 4: Roll in Fine Desiccated Coconut & Garnish Pistas
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewChumChumBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Malai Chum Chum Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
