import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberShrikhand() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(15000);
  const [step, setStep] = useState<'chakka' | 'whip' | 'kesar' | 'nuts' | 'served'>('chakka');

  const handleHangCurdChakka = () => {
    if (step !== 'chakka') return;
    sounds.playPop();
    setStep('whip');
    toast.info('🥛 Hung fresh dahi in muslin cloth overnight to create thick velvety Chakka!');
  };

  const handleWhipSugar = () => {
    if (step !== 'whip') return;
    sounds.playPop();
    setStep('kesar');
    toast.info('✨ Whipped with fine powdered sugar until silken and glossy!');
  };

  const handleInfuseKesarCardamom = () => {
    if (step !== 'kesar') return;
    sounds.playPop();
    setStep('nuts');
    toast.info('🌸 Infused with warm saffron kesar milk & freshly crushed green cardamom!');
  };

  const handleGarnishPuriServe = () => {
    if (step !== 'nuts') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 800;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL KESAR PISTA SHRIKHAND & PUFFED PURIS SERVED! (+800 Pts)');
  };

  const handleNewBatch = () => {
    sounds.playPop();
    setStep('chakka');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shrikhand Puri Shahi Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Muslin Chakka Straining, Kesar Milk Whip & Pista Garnish</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Velvet Texture</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Silken Chakka</span>
        </div>
      </div>

      {/* Shrikhand Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'chakka' ? "border-amber-100 bg-amber-50/10" :
          step === 'whip' ? "border-yellow-200 bg-yellow-100/20 scale-105 shadow-yellow-200/30" :
          step === 'kesar' ? "border-yellow-400 bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 scale-110 shadow-yellow-400/50" :
          step === 'nuts' ? "border-amber-500 bg-amber-500/30 scale-115 shadow-amber-500/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Terracotta Bowl */}
          <div className="w-28 h-28 rounded-full border-2 border-dashed border-amber-400/80 flex items-center justify-center bg-black/30">
            <span className="text-3xl">🥣</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'chakka' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-20">🥛 Hung Dahi Chakka</span>}
            {step === 'whip' && <span className="font-display font-bold text-xs text-yellow-200 block -mt-20">✨ Sugar Whip</span>}
            {step === 'kesar' && <span className="font-display font-bold text-xs text-black block -mt-20">🌸 Saffron Kesar</span>}
            {step === 'nuts' && <span className="font-display font-bold text-xs text-amber-200 block -mt-20">🥜 Pista Almond Flakes</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Shrikhand & Puris!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'chakka' && (
          <Button
            onClick={handleHangCurdChakka}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Strain Fresh Hung Dahi in Muslin Cloth for Thick Chakka
          </Button>
        )}

        {step === 'whip' && (
          <Button
            onClick={handleWhipSugar}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-300 text-black shadow-lg"
          >
            ✨ Step 2: Whip with Fine Powdered Sugar Until Silky
          </Button>
        )}

        {step === 'kesar' && (
          <Button
            onClick={handleInfuseKesarCardamom}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-400 text-black shadow-lg"
          >
            🌸 Step 3: Fold in Saffron Kesar Milk & Green Cardamom
          </Button>
        )}

        {step === 'nuts' && (
          <Button
            onClick={handleGarnishPuriServe}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black shadow-lg"
          >
            🥜 Step 4: Garnish with Pista Flakes & Serve with Hot Puffed Puris
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Whip Next Royal Kesar Shrikhand Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
