import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMalaiLaddooRoyal() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(90000);
  const [step, setStep] = useState<'simmer-malai-chenna' | 'infuse-saffron-cardamom' | 'roll-spherical-laddoo' | 'garnish-pista-silver' | 'served'>('simmer-malai-chenna');

  const handleSimmerMalaiChenna = () => {
    if (step !== 'simmer-malai-chenna') return;
    sounds.playPop();
    setStep('infuse-saffron-cardamom');
    toast.info('🥛 Simmered clotted malai cream & soft chenna into velvety rich laddoo dough!');
  };

  const handleInfuseSaffronCardamom = () => {
    if (step !== 'infuse-saffron-cardamom') return;
    sounds.playPop();
    setStep('roll-spherical-laddoo');
    toast.info('🌸 Infused aromatic Kashmir saffron milk, roasted green cardamom & powdered sugar!');
  };

  const handleRollSphericalLaddoo = () => {
    if (step !== 'roll-spherical-laddoo') return;
    sounds.playPop();
    setStep('garnish-pista-silver');
    toast.info('🧈 Hand-rolled into ultra-soft melt-in-mouth spherical malai laddoos!');
  };

  const handleGarnishPistaSilver = () => {
    if (step !== 'garnish-pista-silver') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1820;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI MALAI LADDOO SERVED FRESH! (+1820 Pts)');
  };

  const handleNewLaddooBatch = () => {
    sounds.playPop();
    setStep('simmer-malai-chenna');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-200 via-yellow-400 to-amber-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Malai Laddoo Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Malai Chenna Simmer, Saffron Cardamom Infusion, Spherical Roll & Silver Vark</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Mathura Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Cream Melt Factor</span>
          <span className="font-display font-black text-xl text-yellow-400">✨ 100% Melt</span>
        </div>
      </div>

      {/* Laddoo Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer-malai-chenna' ? "border-amber-100 bg-amber-100/10" :
          step === 'infuse-saffron-cardamom' ? "border-yellow-300 bg-yellow-300/20 scale-105 shadow-yellow-300/40" :
          step === 'roll-spherical-laddoo' ? "border-amber-400 bg-gradient-to-tr from-amber-200 via-yellow-300 to-amber-400 scale-110 shadow-amber-400/50" :
          step === 'garnish-pista-silver' ? "border-yellow-200 bg-gradient-to-r from-yellow-200 via-amber-300 to-amber-400 scale-115 shadow-yellow-200/60" :
          "border-amber-300 bg-amber-300/20 scale-110"
        )}>
          {/* Laddoo Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌕</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer-malai-chenna' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🥛 Velvety Malai Chenna</span>}
            {step === 'infuse-saffron-cardamom' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🌸 Saffron & Cardamom Milk</span>}
            {step === 'roll-spherical-laddoo' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🧈 Spherical Malai Laddoo</span>}
            {step === 'garnish-pista-silver' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Pista, Rose & Silver Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">👑 Shahi Malai Laddoo!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer-malai-chenna' && (
          <Button
            onClick={handleSimmerMalaiChenna}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer Clotted Malai & Chenna into Velvety Dough
          </Button>
        )}

        {step === 'infuse-saffron-cardamom' && (
          <Button
            onClick={handleInfuseSaffronCardamom}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌸 Step 2: Infuse Kashmir Saffron & Roasted Cardamom
          </Button>
        )}

        {step === 'roll-spherical-laddoo' && (
          <Button
            onClick={handleRollSphericalLaddoo}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🧈 Step 3: Hand-Roll into Soft Spherical Malai Laddoos
          </Button>
        )}

        {step === 'garnish-pista-silver' && (
          <Button
            onClick={handleGarnishPistaSilver}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-500 text-black shadow-lg"
          >
            👑 Step 4: Garnish Roasted Pistachios & 24K Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewLaddooBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Malai Laddoo Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
