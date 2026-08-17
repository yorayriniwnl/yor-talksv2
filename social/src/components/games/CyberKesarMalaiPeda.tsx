import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKesarMalaiPeda() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(52500);
  const [step, setStep] = useState<'simmer-milk-khoya' | 'knead-saffron-cardamom' | 'roll-peda-discs' | 'emboss-floral-stamp' | 'served'>('simmer-milk-khoya');

  const handleSimmerMilkKhoya = () => {
    if (step !== 'simmer-milk-khoya') return;
    sounds.playPop();
    setStep('knead-saffron-cardamom');
    toast.info('🥛 Simmered full-cream milk in iron kadhai until golden brown Danedar Khoya!');
  };

  const handleKneadSaffronCardamom = () => {
    if (step !== 'knead-saffron-cardamom') return;
    sounds.playPop();
    setStep('roll-peda-discs');
    toast.info('🌾 Kneaded warm mawa with Kashmiri saffron threads, green cardamom & boora sugar!');
  };

  const handleRollPedaDiscs = () => {
    if (step !== 'roll-peda-discs') return;
    sounds.playPop();
    setStep('emboss-floral-stamp');
    toast.info('🟡 Rolled into smooth spherical golden mawa peda discs!');
  };

  const handleEmbossFloralStamp = () => {
    if (step !== 'emboss-floral-stamp') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1400;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KESAR MALAI PEDA SERVED FRESH! (+1400 Pts)');
  };

  const handleNewPedaBatch = () => {
    sounds.playPop();
    setStep('simmer-milk-khoya');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-amber-700 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kesar Malai Peda Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Iron Kadhai Mawa Khoya, Saffron Infusion, Cardamom Knead & Floral Stamp</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Braj Mathura Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Khoya Richness</span>
          <span className="font-display font-black text-xl text-yellow-400">✨ 100% Pure Desi</span>
        </div>
      </div>

      {/* Peda Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer-milk-khoya' ? "border-amber-200 bg-amber-200/10" :
          step === 'knead-saffron-cardamom' ? "border-yellow-400 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'roll-peda-discs' ? "border-amber-500 bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 scale-110 shadow-amber-500/50" :
          step === 'emboss-floral-stamp' ? "border-amber-100 bg-gradient-to-r from-yellow-200 via-amber-400 to-amber-600 scale-115 shadow-amber-100/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Peda Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-yellow-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🥮</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer-milk-khoya' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥛 Simmering Milk Khoya</span>}
            {step === 'knead-saffron-cardamom' && <span className="font-display font-bold text-xs text-yellow-400 block -mt-24">🌾 Saffron & Cardamom Knead</span>}
            {step === 'roll-peda-discs' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🟡 Smooth Peda Discs</span>}
            {step === 'emboss-floral-stamp' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Traditional Floral Stamp</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Kesar Malai Peda!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer-milk-khoya' && (
          <Button
            onClick={handleSimmerMilkKhoya}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer Full-Cream Milk into Rich Danedar Khoya
          </Button>
        )}

        {step === 'knead-saffron-cardamom' && (
          <Button
            onClick={handleKneadSaffronCardamom}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌾 Step 2: Knead with Kashmiri Saffron Threads & Cardamom
          </Button>
        )}

        {step === 'roll-peda-discs' && (
          <Button
            onClick={handleRollPedaDiscs}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🟡 Step 3: Roll into Smooth Golden Mawa Peda Discs
          </Button>
        )}

        {step === 'emboss-floral-stamp' && (
          <Button
            onClick={handleEmbossFloralStamp}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-300 via-amber-500 to-amber-700 text-black shadow-lg"
          >
            👑 Step 4: Emboss with Wooden Stamp & Pistachio Slivers
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewPedaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Kesar Malai Peda Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
