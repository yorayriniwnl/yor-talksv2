import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberSitabhog() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(31000);
  const [step, setStep] = useState<'knead-rice' | 'press-vermicelli' | 'fry-nikuti' | 'soak-kesar' | 'served'>('knead-rice');

  const handleKneadRice = () => {
    if (step !== 'knead-rice') return;
    sounds.playPop();
    setStep('press-vermicelli');
    toast.info('🌾 Kneaded fragrant Govindobhog aromatic rice flour & soft chena into fine dough!');
  };

  const handlePressVermicelli = () => {
    if (step !== 'press-vermicelli') return;
    sounds.playPop();
    setStep('fry-nikuti');
    toast.info('🔥 Pressed dough through brass sieve into smoking pure desi ghee for rice-like strands!');
  };

  const handleFryNikuti = () => {
    if (step !== 'fry-nikuti') return;
    sounds.playPop();
    setStep('soak-kesar');
    toast.info('🍯 Deep-fried miniature baby gulab jamuns (nikuti) in ghee until dark golden!');
  };

  const handleSoakKesarGarnish = () => {
    if (step !== 'soak-kesar') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1160;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL BARDHAMAN SITABHOG GARNISHED & SERVED! (+1160 Pts)');
  };

  const handleNewSitabhogBatch = () => {
    sounds.playPop();
    setStep('knead-rice');
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
              Cyber Bardhaman Sitabhog Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Govindobhog Rice Strands, Baby Nikuti Jamuns, Saffron Syrup & Silver Vark</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Govindobhog Aroma</span>
          <span className="font-display font-black text-xl text-yellow-400">✨ 100% Royal Ghee</span>
        </div>
      </div>

      {/* Sitabhog Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'knead-rice' ? "border-amber-100 bg-amber-50/10" :
          step === 'press-vermicelli' ? "border-yellow-300 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'fry-nikuti' ? "border-amber-600 bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-700 scale-110 shadow-amber-600/50" :
          step === 'soak-kesar' ? "border-yellow-200 bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 scale-115 shadow-yellow-200/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Strands Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🍚</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'knead-rice' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🌾 Govindobhog Rice & Chena</span>}
            {step === 'press-vermicelli' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🔥 Ghee Fried Rice Strands</span>}
            {step === 'fry-nikuti' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🍯 Baby Nikuti Gulab Jamuns</span>}
            {step === 'soak-kesar' && <span className="font-display font-bold text-xs text-yellow-200 block -mt-24">✨ Kesar Chashni & Silver Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Bardhaman Sitabhog!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'knead-rice' && (
          <Button
            onClick={handleKneadRice}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Knead Aromatic Govindobhog Rice Flour with Soft Chena
          </Button>
        )}

        {step === 'press-vermicelli' && (
          <Button
            onClick={handlePressVermicelli}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🔥 Step 2: Press Through Brass Sieve into Hot Desi Ghee
          </Button>
        )}

        {step === 'fry-nikuti' && (
          <Button
            onClick={handleFryNikuti}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🍯 Step 3: Fry Miniature Baby Gulab Jamun Nikutis
          </Button>
        )}

        {step === 'soak-kesar' && (
          <Button
            onClick={handleSoakKesarGarnish}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 text-black shadow-lg"
          >
            ✨ Step 4: Mix with Saffron Sugar Syrup & Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewSitabhogBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Bardhaman Sitabhog Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
