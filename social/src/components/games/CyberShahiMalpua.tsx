import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberShahiMalpua() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(46500);
  const [step, setStep] = useState<'whisk-mawa-batter' | 'ghee-shallow-fry' | 'saffron-syrup-dunk' | 'thick-rabdi-topping' | 'served'>('whisk-mawa-batter');

  const handleWhiskMawaBatter = () => {
    if (step !== 'whisk-mawa-batter') return;
    sounds.playPop();
    setStep('ghee-shallow-fry');
    toast.info('🌾 Whisked smooth flour, mawa khoya, saunf fennel seeds & whole milk batter!');
  };

  const handleGheeShallowFry = () => {
    if (step !== 'ghee-shallow-fry') return;
    sounds.playPop();
    setStep('saffron-syrup-dunk');
    toast.info('🔥 Shallow fried crispy golden malpuas in fragrant desi cow ghee pans!');
  };

  const handleSaffronSyrupDunk = () => {
    if (step !== 'saffron-syrup-dunk') return;
    sounds.playPop();
    setStep('thick-rabdi-topping');
    toast.info('🍯 Soaked warm malpuas in cardamom & Kashmiri saffron sugar chashni!');
  };

  const handleThickRabdiTopping = () => {
    if (step !== 'thick-rabdi-topping') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1320;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL MALAI RABDI MALPUA SERVED FRESH! (+1320 Pts)');
  };

  const handleNewMalpuaBatch = () => {
    sounds.playPop();
    setStep('whisk-mawa-batter');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-rose-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shahi Malpua Rabdi Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Fennel Mawa Pancakes, Desi Ghee Frying, Saffron Chashni & Thick Rabdi</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Pushkar Halwai Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kesar Rabdi Cream</span>
          <span className="font-display font-black text-xl text-yellow-400">🍯 100% Lacchedar</span>
        </div>
      </div>

      {/* Malpua Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'whisk-mawa-batter' ? "border-amber-200 bg-amber-200/10" :
          step === 'ghee-shallow-fry' ? "border-amber-400 bg-amber-500/20 scale-105 shadow-amber-400/40" :
          step === 'saffron-syrup-dunk' ? "border-orange-400 bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 scale-110 shadow-orange-400/50" :
          step === 'thick-rabdi-topping' ? "border-yellow-200 bg-gradient-to-r from-amber-200 via-yellow-400 to-emerald-400 scale-115 shadow-yellow-200/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Malpua Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🥞</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'whisk-mawa-batter' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🌾 Saunf Mawa Batter</span>}
            {step === 'ghee-shallow-fry' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🔥 Pure Desi Ghee Fry</span>}
            {step === 'saffron-syrup-dunk' && <span className="font-display font-bold text-xs text-orange-300 block -mt-24">🍯 Kesar Chashni Soaking</span>}
            {step === 'thick-rabdi-topping' && <span className="font-display font-bold text-xs text-yellow-100 block -mt-24">👑 Lacchedar Rabdi Topping</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Rabdi Malpua!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'whisk-mawa-batter' && (
          <Button
            onClick={handleWhiskMawaBatter}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Whisk Mawa Khoya, Flour, Saunf & Milk Batter
          </Button>
        )}

        {step === 'ghee-shallow-fry' && (
          <Button
            onClick={handleGheeShallowFry}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🔥 Step 2: Shallow Fry Lacy Golden Malpuas in Pure Ghee
          </Button>
        )}

        {step === 'saffron-syrup-dunk' && (
          <Button
            onClick={handleSaffronSyrupDunk}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-600 text-white shadow-lg"
          >
            🍯 Step 3: Dunk Hot Crispy Malpuas in Kesar Cardamom Syrup
          </Button>
        )}

        {step === 'thick-rabdi-topping' && (
          <Button
            onClick={handleThickRabdiTopping}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-400 text-black shadow-lg"
          >
            👑 Step 4: Smear Thick Lacchedar Rabdi & Pistachios
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewMalpuaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Rabdi Malpua Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
