import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMalpuaRabdiRoyal() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(92000);
  const [step, setStep] = useState<'whisk-mawa-fennel-batter' | 'ghee-fry-crispy-lace' | 'dip-saffron-chashni' | 'layer-rabdi-gold' | 'served'>('whisk-mawa-fennel-batter');

  const handleWhiskMawaFennelBatter = () => {
    if (step !== 'whisk-mawa-fennel-batter') return;
    sounds.playPop();
    setStep('ghee-fry-crispy-lace');
    toast.info('🥣 Whisked fresh mawa khoya, crushed fennel seeds & whole milk into rich pancake batter!');
  };

  const handleGheeFryCrispyLace = () => {
    if (step !== 'ghee-fry-crispy-lace') return;
    sounds.playPop();
    setStep('dip-saffron-chashni');
    toast.info('🔥 Fried in bubbling pure desi cow ghee until edges turned golden, crispy and lacy!');
  };

  const handleDipSaffronChashni = () => {
    if (step !== 'dip-saffron-chashni') return;
    sounds.playPop();
    setStep('layer-rabdi-gold');
    toast.info('🌸 Soaked in single-string aromatic saffron cardamom chashni sugar syrup!');
  };

  const handleLayerRabdiGold = () => {
    if (step !== 'layer-rabdi-gold') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1840;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI MALPUA RABDI SERVED FRESH! (+1840 Pts)');
  };

  const handleNewMalpuaBatch = () => {
    sounds.playPop();
    setStep('whisk-mawa-fennel-batter');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Malpua Rabdi Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Mawa Batter Whisk, Desi Ghee Lace Fry, Saffron Chashni Dip & Rabdi Malai</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Pushkar Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Crisp Lace Factor</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Golden</span>
        </div>
      </div>

      {/* Malpua Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'whisk-mawa-fennel-batter' ? "border-amber-200 bg-amber-200/10" :
          step === 'ghee-fry-crispy-lace' ? "border-orange-500 bg-orange-500/20 scale-105 shadow-orange-500/40" :
          step === 'dip-saffron-chashni' ? "border-yellow-400 bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 scale-110 shadow-yellow-400/50" :
          step === 'layer-rabdi-gold' ? "border-amber-300 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 scale-115 shadow-amber-300/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Malpua Icon */}
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🥞</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'whisk-mawa-fennel-batter' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥣 Mawa & Crushed Fennel Batter</span>}
            {step === 'ghee-fry-crispy-lace' && <span className="font-display font-bold text-xs text-orange-400 block -mt-24">🔥 Crispy Desi Ghee Lacy Edges</span>}
            {step === 'dip-saffron-chashni' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🌸 Saffron Cardamom Chashni Dip</span>}
            {step === 'layer-rabdi-gold' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Thick Rabdi & 24K Gold Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">👑 Shahi Malpua Rabdi!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'whisk-mawa-fennel-batter' && (
          <Button
            onClick={handleWhiskMawaFennelBatter}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥣 Step 1: Whisk Fresh Mawa, Crushed Fennel & Milk Batter
          </Button>
        )}

        {step === 'ghee-fry-crispy-lace' && (
          <Button
            onClick={handleGheeFryCrispyLace}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-600 text-white shadow-lg"
          >
            🔥 Step 2: Fry in Pure Desi Ghee for Golden Lacy Edges
          </Button>
        )}

        {step === 'dip-saffron-chashni' && (
          <Button
            onClick={handleDipSaffronChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌸 Step 3: Dip Hot Malpua in Saffron Cardamom Chashni
          </Button>
        )}

        {step === 'layer-rabdi-gold' && (
          <Button
            onClick={handleLayerRabdiGold}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black shadow-lg"
          >
            👑 Step 4: Layer Thick Lachedar Rabdi & 24K Gold Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewMalpuaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Malpua Rabdi Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
