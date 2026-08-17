import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMawaKachori() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(68000);
  const [step, setStep] = useState<'knead-moyen-dough' | 'stuff-dryfruit-mawa' | 'ghee-fry-golden' | 'soak-kesar-chashni' | 'served'>('knead-moyen-dough');

  const handleKneadMoyenDough = () => {
    if (step !== 'knead-moyen-dough') return;
    sounds.playPop();
    setStep('stuff-dryfruit-mawa');
    toast.info('🫓 Kneaded flaky maida dough with warm desi ghee moyen for crisp layers!');
  };

  const handleStuffDryfruitMawa = () => {
    if (step !== 'stuff-dryfruit-mawa') return;
    sounds.playPop();
    setStep('ghee-fry-golden');
    toast.info('🥜 Stuffed roasted khoya mawa, slivered almonds, pistachios, saffron & green cardamom!');
  };

  const handleGheeFryGolden = () => {
    if (step !== 'ghee-fry-golden') return;
    sounds.playPop();
    setStep('soak-kesar-chashni');
    toast.info('🔥 Deep-fried on slow flame in pure desi ghee until blistered golden & crisp!');
  };

  const handleSoakKesarChashni = () => {
    if (step !== 'soak-kesar-chashni') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1600;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI JODHPURI MAWA KACHORI SERVED FRESH! (+1600 Pts)');
  };

  const handleNewKachoriBatch = () => {
    sounds.playPop();
    setStep('knead-moyen-dough');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Mawa Kachori Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Ghee Moyen Dough, Dryfruit Mawa Stuff, Ghee Deep Fry & Kesar Chashni</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Jodhpur Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kachori Crisp</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Khasta</span>
        </div>
      </div>

      {/* Mawa Kachori Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'knead-moyen-dough' ? "border-amber-200 bg-amber-200/10" :
          step === 'stuff-dryfruit-mawa' ? "border-yellow-400 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'ghee-fry-golden' ? "border-orange-500 bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-600 scale-110 shadow-orange-500/50" :
          step === 'soak-kesar-chashni' ? "border-amber-300 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 scale-115 shadow-amber-300/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Kachori Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🫓</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'knead-moyen-dough' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🫓 Ghee Moyen Dough</span>}
            {step === 'stuff-dryfruit-mawa' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🥜 Dryfruit Mawa Stuffing</span>}
            {step === 'ghee-fry-golden' && <span className="font-display font-bold text-xs text-orange-400 block -mt-24">🔥 Pure Desi Ghee Fry</span>}
            {step === 'soak-kesar-chashni' && <span className="font-display font-bold text-xs text-amber-200 block -mt-24">👑 Kesar Chashni Infusion</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Jodhpuri Mawa Kachori!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'knead-moyen-dough' && (
          <Button
            onClick={handleKneadMoyenDough}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🫓 Step 1: Knead Flaky Maida Dough with Warm Desi Ghee Moyen
          </Button>
        )}

        {step === 'stuff-dryfruit-mawa' && (
          <Button
            onClick={handleStuffDryfruitMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🥜 Step 2: Stuff Roasted Khoya Mawa, Almonds, Pista & Cardamom
          </Button>
        )}

        {step === 'ghee-fry-golden' && (
          <Button
            onClick={handleGheeFryGolden}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-600 text-white shadow-lg"
          >
            🔥 Step 3: Deep-Fry on Slow Flame in Pure Desi Ghee
          </Button>
        )}

        {step === 'soak-kesar-chashni' && (
          <Button
            onClick={handleSoakKesarChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-600 text-black shadow-lg"
          >
            👑 Step 4: Puncture Window & Pour Saffron Kesar Chashni
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewKachoriBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Fry Next Mawa Kachori Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
