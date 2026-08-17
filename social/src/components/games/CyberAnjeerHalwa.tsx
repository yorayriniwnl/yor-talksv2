import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberAnjeerHalwa() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(37000);
  const [step, setStep] = useState<'soak-figs' | 'roast-cashews' | 'ghee-simmer' | 'saffron-garnish' | 'served'>('soak-figs');

  const handleSoakFigs = () => {
    if (step !== 'soak-figs') return;
    sounds.playPop();
    setStep('roast-cashews');
    toast.info('🍯 Soaked premium Afghan sun-dried anjeer figs and pureed into rich texture!');
  };

  const handleRoastCashews = () => {
    if (step !== 'roast-cashews') return;
    sounds.playPop();
    setStep('ghee-simmer');
    toast.info('🥜 Roasted whole cashews & almonds in pure desi ghee until golden crisp!');
  };

  const handleGheeSimmer = () => {
    if (step !== 'ghee-simmer') return;
    sounds.playPop();
    setStep('saffron-garnish');
    toast.info('🔥 Slow simmered anjeer paste with rich mawa & cow ghee in heavy copper uruli!');
  };

  const handleSaffronGarnish = () => {
    if (step !== 'saffron-garnish') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1220;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI ANJEER HALWA GARNISHED WITH SAFFRON & SERVED! (+1220 Pts)');
  };

  const handleNewAnjeerHalwaBatch = () => {
    sounds.playPop();
    setStep('soak-figs');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-rose-800 to-amber-950 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shahi Anjeer Halwa Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Sun-Dried Figs, Roasted Kaju Almonds, Pure Desi Ghee & Saffron</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Ghee Uruli Simmer</span>
          <span className="font-display font-black text-xl text-amber-500">✨ 100% Rich Fig Crunch</span>
        </div>
      </div>

      {/* Anjeer Halwa Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'soak-figs' ? "border-amber-700 bg-amber-900/10" :
          step === 'roast-cashews' ? "border-yellow-400 bg-amber-800/20 scale-105 shadow-amber-800/40" :
          step === 'ghee-simmer' ? "border-amber-600 bg-gradient-to-tr from-amber-900 via-rose-900 to-amber-950 scale-110 shadow-amber-900/50" :
          step === 'saffron-garnish' ? "border-yellow-300 bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-900 scale-115 shadow-yellow-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Halwa Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🍯</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'soak-figs' && <span className="font-mono text-[0.65rem] text-amber-300 block -mt-24">🍯 Sun-Dried Afghan Figs</span>}
            {step === 'roast-cashews' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🥜 Ghee Roasted Cashews</span>}
            {step === 'ghee-simmer' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🔥 Copper Uruli Simmer</span>}
            {step === 'saffron-garnish' && <span className="font-display font-bold text-xs text-yellow-200 block -mt-24">✨ Kesar Strands & Almonds</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Anjeer Halwa!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'soak-figs' && (
          <Button
            onClick={handleSoakFigs}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🍯 Step 1: Soak Afghan Sun-Dried Figs & Puree into Rich Paste
          </Button>
        )}

        {step === 'roast-cashews' && (
          <Button
            onClick={handleRoastCashews}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🥜 Step 2: Roast Whole Cashews & Almonds in Pure Desi Ghee
          </Button>
        )}

        {step === 'ghee-simmer' && (
          <Button
            onClick={handleGheeSimmer}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-800 text-white shadow-lg"
          >
            🔥 Step 3: Slow Simmer Fig Paste with Mawa & Desi Ghee in Uruli
          </Button>
        )}

        {step === 'saffron-garnish' && (
          <Button
            onClick={handleSaffronGarnish}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black shadow-lg"
          >
            ✨ Step 4: Garnish with Saffron Strands, Nutmeg & Roasted Nuts
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewAnjeerHalwaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Anjeer Halwa Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
