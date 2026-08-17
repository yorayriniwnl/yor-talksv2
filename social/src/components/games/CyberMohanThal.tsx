import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMohanThal() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(51000);
  const [step, setStep] = useState<'rub-besan-dhrabo' | 'roast-ghee-uruli' | 'infuse-kesar-chashni' | 'set-pistachio-cubes' | 'served'>('rub-besan-dhrabo');

  const handleRubBesanDhrabo = () => {
    if (step !== 'rub-besan-dhrabo') return;
    sounds.playPop();
    setStep('roast-ghee-uruli');
    toast.info('🌾 Rubbed coarse gram flour with warm desi ghee & milk into crumbly Dhrabo texture!');
  };

  const handleRoastGheeUruli = () => {
    if (step !== 'roast-ghee-uruli') return;
    sounds.playPop();
    setStep('infuse-kesar-chashni');
    toast.info('🔥 Slow roasted Dhrabo in copper uruli with pure ghee until nutty amber gold!');
  };

  const handleInfuseKesarChashni = () => {
    if (step !== 'infuse-kesar-chashni') return;
    sounds.playPop();
    setStep('set-pistachio-cubes');
    toast.info('🍯 Stirred two-string Kashmiri saffron & cardamom syrup into the roasted besan!');
  };

  const handleSetPistachioCubes = () => {
    if (step !== 'set-pistachio-cubes') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1380;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI MOHAN THAL SERVED FRESH! (+1380 Pts)');
  };

  const handleNewMohanThalBatch = () => {
    sounds.playPop();
    setStep('rub-besan-dhrabo');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-600 to-amber-700 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shahi Mohan Thal Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Grainy Dhrabo Besan, Copper Uruli Ghee Roast, Saffron Chashni & Pistachio Cubes</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kathiawadi Score</span>
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
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Grainy</span>
        </div>
      </div>

      {/* Mohan Thal Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'rub-besan-dhrabo' ? "border-amber-200 bg-amber-200/10" :
          step === 'roast-ghee-uruli' ? "border-amber-600 bg-amber-600/20 scale-105 shadow-amber-600/40" :
          step === 'infuse-kesar-chashni' ? "border-yellow-400 bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-500 scale-110 shadow-yellow-400/50" :
          step === 'set-pistachio-cubes' ? "border-amber-100 bg-gradient-to-r from-amber-200 via-yellow-400 to-emerald-400 scale-115 shadow-amber-100/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Mohan Thal Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🟨</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'rub-besan-dhrabo' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🌾 Grainy Dhrabo Rub</span>}
            {step === 'roast-ghee-uruli' && <span className="font-display font-bold text-xs text-amber-500 block -mt-24">🔥 Uruli Ghee Roasting</span>}
            {step === 'infuse-kesar-chashni' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🍯 2-Taar Kesar Chashni</span>}
            {step === 'set-pistachio-cubes' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Almond Pistachio Cubes</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Mohan Thal!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'rub-besan-dhrabo' && (
          <Button
            onClick={handleRubBesanDhrabo}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Rub Coarse Besan with Ghee & Milk for Grainy Dhrabo
          </Button>
        )}

        {step === 'roast-ghee-uruli' && (
          <Button
            onClick={handleRoastGheeUruli}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🔥 Step 2: Slow Roast Dhrabo in Copper Uruli with Pure Desi Ghee
          </Button>
        )}

        {step === 'infuse-kesar-chashni' && (
          <Button
            onClick={handleInfuseKesarChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🍯 Step 3: Stir Warm 2-String Saffron & Cardamom Chashni
          </Button>
        )}

        {step === 'set-pistachio-cubes' && (
          <Button
            onClick={handleSetPistachioCubes}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 text-black shadow-lg"
          >
            👑 Step 4: Garnish with Slivered Almonds & Cut into Golden Cubes
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewMohanThalBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Mohan Thal Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
