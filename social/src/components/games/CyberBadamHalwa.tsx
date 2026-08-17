import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberBadamHalwa() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(57000);
  const [step, setStep] = useState<'blanch-mamra-almonds' | 'ghee-roast-paste' | 'infuse-kashmiri-saffron' | 'garnish-gold-pistachio' | 'served'>('blanch-mamra-almonds');

  const handleBlanchMamraAlmonds = () => {
    if (step !== 'blanch-mamra-almonds') return;
    sounds.playPop();
    setStep('ghee-roast-paste');
    toast.info('🌰 Blanched golden Mamra almonds into rich creamy almond paste with rose water!');
  };

  const handleGheeRoastPaste = () => {
    if (step !== 'ghee-roast-paste') return;
    sounds.playPop();
    setStep('infuse-kashmiri-saffron');
    toast.info('🔥 Roasted badam paste in heavy copper lagan with fragrant A2 Gir cow ghee!');
  };

  const handleInfuseKashmiriSaffron = () => {
    if (step !== 'infuse-kashmiri-saffron') return;
    sounds.playPop();
    setStep('garnish-gold-pistachio');
    toast.info('✨ Infused organic Mongra Kashmiri saffron strings & green cardamom sugar syrup!');
  };

  const handleGarnishGoldPistachio = () => {
    if (step !== 'garnish-gold-pistachio') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1460;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KASHMIRI BADAM HALWA SERVED FRESH! (+1460 Pts)');
  };

  const handleNewHalwaBatch = () => {
    sounds.playPop();
    setStep('blanch-mamra-almonds');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-600 to-amber-700 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Badam Halwa Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Mamra Almond Paste, A2 Gir Cow Ghee, Kashmiri Saffron & Gold Leaf Garnish</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kashmir Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Saffron Aroma</span>
          <span className="font-display font-black text-xl text-amber-400">✨ Mongra Grade 1</span>
        </div>
      </div>

      {/* Halwa Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'blanch-mamra-almonds' ? "border-amber-100 bg-amber-100/10" :
          step === 'ghee-roast-paste' ? "border-amber-600 bg-amber-600/20 scale-105 shadow-amber-600/40" :
          step === 'infuse-kashmiri-saffron' ? "border-yellow-400 bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-700 scale-110 shadow-yellow-400/50" :
          step === 'garnish-gold-pistachio' ? "border-amber-200 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-600 scale-115 shadow-amber-200/60" :
          "border-yellow-400 bg-yellow-400/20 scale-110"
        )}>
          {/* Halwa Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌰</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'blanch-mamra-almonds' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🌰 Blanched Badam Paste</span>}
            {step === 'ghee-roast-paste' && <span className="font-display font-bold text-xs text-amber-500 block -mt-24">🔥 A2 Ghee Copper Roast</span>}
            {step === 'infuse-kashmiri-saffron' && <span className="font-display font-bold text-xs text-yellow-400 block -mt-24">✨ Mongra Saffron Infusion</span>}
            {step === 'garnish-gold-pistachio' && <span className="font-display font-bold text-xs text-amber-200 block -mt-24">👑 Gold Vark & Pistachios</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Kashmiri Badam Halwa!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'blanch-mamra-almonds' && (
          <Button
            onClick={handleBlanchMamraAlmonds}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌰 Step 1: Blanch & Grind Mamra Badam into Fine Almond Paste
          </Button>
        )}

        {step === 'ghee-roast-paste' && (
          <Button
            onClick={handleGheeRoastPaste}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🔥 Step 2: Slow Roast Badam Paste in A2 Ghee Copper Lagan
          </Button>
        )}

        {step === 'infuse-kashmiri-saffron' && (
          <Button
            onClick={handleInfuseKashmiriSaffron}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            ✨ Step 3: Infuse Pure Kashmiri Mongra Saffron & Cardamom
          </Button>
        )}

        {step === 'garnish-gold-pistachio' && (
          <Button
            onClick={handleGarnishGoldPistachio}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600 text-black shadow-lg"
          >
            👑 Step 4: Garnish with 24K Gold Leaf & Slivered Pistachios
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewHalwaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Badam Halwa Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
