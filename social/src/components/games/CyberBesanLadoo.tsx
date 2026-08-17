import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberBesanLadoo() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(18000);
  const [step, setStep] = useState<'roast' | 'cool' | 'sugar' | 'shape' | 'served'>('roast');

  const handleRoastBesanGhee = () => {
    if (step !== 'roast') return;
    sounds.playPop();
    setStep('cool');
    toast.info('🔥 Coarse besan slow-roasted in pure desi ghee until nutty, fragrant & golden brown!');
  };

  const handleCoolKadai = () => {
    if (step !== 'cool') return;
    sounds.playPop();
    setStep('sugar');
    toast.info('❄️ Cooled roasted besan mixture to room temperature for perfect grainy texture!');
  };

  const handleMixTagarSugar = () => {
    if (step !== 'sugar') return;
    sounds.playPop();
    setStep('shape');
    toast.info('✨ Folded in crunchy tagar (bura) sugar, cardamom powder & roasted almond slivers!');
  };

  const handleShapeLadoo = () => {
    if (step !== 'shape') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 880;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 MELT-IN-MOUTH SHAHI BESAN LADDOO TOPPED WITH PISTA SERVED! (+880 Pts)');
  };

  const handleNewLadooBatch = () => {
    sounds.playPop();
    setStep('roast');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shahi Besan Ladoo Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Ghee Besan Roast, Danedar Bura Fold & Royal Pista Garnish</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Danedar Texture</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Melt-in-Mouth</span>
        </div>
      </div>

      {/* Ladoo Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'roast' ? "border-yellow-200 bg-yellow-100/10" :
          step === 'cool' ? "border-amber-400 bg-amber-500/20 scale-105 shadow-amber-500/40" :
          step === 'sugar' ? "border-yellow-400 bg-yellow-400/30 scale-110 shadow-yellow-400/50" :
          step === 'shape' ? "border-amber-500 bg-gradient-to-tr from-yellow-400 via-amber-500 to-yellow-600 scale-115 shadow-amber-500/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Sphere Center */}
          <div className="w-28 h-28 rounded-full border-2 border-dashed border-amber-400/80 flex items-center justify-center bg-black/40">
            <span className="text-3xl">✨</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'roast' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-20">🔥 Besan Ghee Roast</span>}
            {step === 'cool' && <span className="font-display font-bold text-xs text-amber-400 block -mt-20">❄️ Kadai Cooling</span>}
            {step === 'sugar' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">🍯 Bura Sugar Fold</span>}
            {step === 'shape' && <span className="font-display font-bold text-xs text-black block -mt-20">👐 Hand Rolling Ladoo</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Royal Besan Ladoo!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'roast' && (
          <Button
            onClick={handleRoastBesanGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔥 Step 1: Slow-Roast Coarse Besan in Desi Ghee in Brass Kadai
          </Button>
        )}

        {step === 'cool' && (
          <Button
            onClick={handleCoolKadai}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            ❄️ Step 2: Cool Mixture to Room Temp for Perfect Danedar Grain
          </Button>
        )}

        {step === 'sugar' && (
          <Button
            onClick={handleMixTagarSugar}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-400 text-black shadow-lg"
          >
            🍯 Step 3: Mix in Crunchy Tagar Bura Sugar & Cardamom Powder
          </Button>
        )}

        {step === 'shape' && (
          <Button
            onClick={handleShapeLadoo}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black shadow-lg"
          >
            👐 Step 4: Hand-Roll into Golden Laddus & Garnish with Pistachios
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewLadooBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Roll Next Royal Danedar Besan Ladoo Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
