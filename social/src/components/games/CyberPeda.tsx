import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberPeda() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(9900);
  const [step, setStep] = useState<'khoya' | 'caramel' | 'shape' | 'boora' | 'served'>('khoya');

  const handleSimmerKhoya = () => {
    if (step !== 'khoya') return;
    sounds.playPop();
    setStep('caramel');
    toast.info('🥛 Rich buffalo milk mawa simmered slowly in heavy iron kadhai!');
  };

  const handleSlowCaramelize = () => {
    if (step !== 'caramel') return;
    sounds.playPop();
    setStep('shape');
    toast.info('🔥 Khoya cooked and stirred constantly until deep caramel golden-brown fudge!');
  };

  const handleStampMathuraPeda = () => {
    if (step !== 'shape') return;
    sounds.playChime();
    setStep('boora');
    toast.info('👑 Warm pedas hand-shaped and embossed with traditional Mathura floral seal!');
  };

  const handleRollBooraSugar = () => {
    if (step !== 'boora') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 620;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('✨ SHUDH MATHURA CARAMEL PEDA EMBOSSED & SERVED (+620 Pts)');
  };

  const handleNewPeda = () => {
    sounds.playPop();
    setStep('khoya');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-700 to-yellow-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Peda Mathura Caramel Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Slow-Caramelized Khoya, Cardamom Sugar & Floral Wooden Stamp Emboss</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Braj Halwai Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Caramelization Depth</span>
          <span className="font-display font-black text-xl text-amber-500">✨ 100% Rich Brown</span>
        </div>
      </div>

      {/* Peda Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'khoya' ? "border-amber-200 bg-amber-100/10" :
          step === 'caramel' ? "border-amber-600 bg-gradient-to-tr from-amber-700 to-amber-900 scale-105" :
          step === 'shape' ? "border-amber-500 bg-gradient-to-tr from-amber-600 to-yellow-600 scale-110 shadow-amber-600/50" :
          step === 'boora' ? "border-amber-300 bg-gradient-to-tr from-amber-200 via-amber-500 to-amber-700 scale-115 shadow-amber-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Floral Center Emboss */}
          <div className="w-16 h-16 rounded-full border border-dashed border-border/60 flex items-center justify-center">
            <span className="text-xl">🏵️</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'khoya' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-16">🥛 Fresh Mawa</span>}
            {step === 'caramel' && <span className="font-display font-bold text-xs text-amber-300 block -mt-16">🔥 Brown Caramel</span>}
            {step === 'shape' && <span className="font-display font-bold text-xs text-black block -mt-16">🏵️ Floral Stamp</span>}
            {step === 'boora' && <span className="font-display font-bold text-xs text-black block -mt-16">✨ Boora Sugar Dust</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-16">👑 Mathura Peda!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'khoya' && (
          <Button
            onClick={handleSimmerKhoya}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer Fresh Buffalo Milk Mawa in Iron Kadhai
          </Button>
        )}

        {step === 'caramel' && (
          <Button
            onClick={handleSlowCaramelize}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-700 text-white shadow-lg"
          >
            🔥 Step 2: Slow-Caramelize into Rich Golden-Brown Fudge
          </Button>
        )}

        {step === 'shape' && (
          <Button
            onClick={handleStampMathuraPeda}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🏵️ Step 3: Hand-Shape & Emboss with Mathura Floral Seal
          </Button>
        )}

        {step === 'boora' && (
          <Button
            onClick={handleRollBooraSugar}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-600 text-black shadow-lg"
          >
            ✨ Step 4: Dust in Tagar Boora Sugar & Saffron Pistachios
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewPeda}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Shape Next Mathura Caramel Peda (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
