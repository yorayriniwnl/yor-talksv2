import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberAgraPetha() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(43000);
  const [step, setStep] = useState<'cure-ash-gourd' | 'blanch-cauldron' | 'simmer-kewra-syrup' | 'saffron-crystal-coat' | 'served'>('cure-ash-gourd');

  const handleCureAshGourd = () => {
    if (step !== 'cure-ash-gourd') return;
    sounds.playPop();
    setStep('blanch-cauldron');
    toast.info('🍈 Pricked fresh ash gourd cubes and cured in lime water for crisp diamond firmness!');
  };

  const handleBlanchCauldron = () => {
    if (step !== 'blanch-cauldron') return;
    sounds.playPop();
    setStep('simmer-kewra-syrup');
    toast.info('🔥 Blanched cured petha in boiling copper cauldrons with pure alum!');
  };

  const handleSimmerKewraSyrup = () => {
    if (step !== 'simmer-kewra-syrup') return;
    sounds.playPop();
    setStep('saffron-crystal-coat');
    toast.info('🍯 Slow boiled petha cubes in fragrant kewra rose sugar syrup until translucent!');
  };

  const handleSaffronCrystalCoat = () => {
    if (step !== 'saffron-crystal-coat') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1280;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL AGRA KESAR ANGOORI PETHA CRYSTALLIZED & SERVED! (+1280 Pts)');
  };

  const handleNewAgraPethaBatch = () => {
    sounds.playPop();
    setStep('cure-ash-gourd');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-emerald-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Agra Angoori Petha Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Ash Gourd Curing, Kewra Rose Syrup & Saffron Crystal Spheres</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Crystal Translucency</span>
          <span className="font-display font-black text-xl text-yellow-300">✨ 100% Diamond Pure</span>
        </div>
      </div>

      {/* Agra Petha Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'cure-ash-gourd' ? "border-emerald-200 bg-emerald-100/10" :
          step === 'blanch-cauldron' ? "border-amber-300 bg-amber-200/20 scale-105 shadow-amber-300/40" :
          step === 'simmer-kewra-syrup' ? "border-yellow-300 bg-gradient-to-tr from-yellow-100 via-amber-300 to-yellow-400 scale-110 shadow-yellow-300/50" :
          step === 'saffron-crystal-coat' ? "border-amber-400 bg-gradient-to-r from-yellow-200 via-white to-amber-400 scale-115 shadow-yellow-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Petha Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-yellow-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">💎</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'cure-ash-gourd' && <span className="font-mono text-[0.65rem] text-emerald-200 block -mt-24">🍈 Cured Ash Gourd</span>}
            {step === 'blanch-cauldron' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🔥 Copper Cauldron Blanch</span>}
            {step === 'simmer-kewra-syrup' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">✨ Kewra Rose Chashni</span>}
            {step === 'saffron-crystal-coat' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Angoori Petha Crystals</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Agra Petha!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'cure-ash-gourd' && (
          <Button
            onClick={handleCureAshGourd}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🍈 Step 1: Prick Ash Gourd & Cure in Lime Water for Firmness
          </Button>
        )}

        {step === 'blanch-cauldron' && (
          <Button
            onClick={handleBlanchCauldron}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🔥 Step 2: Blanch Cubes in Boiling Copper Cauldron with Alum
          </Button>
        )}

        {step === 'simmer-kewra-syrup' && (
          <Button
            onClick={handleSimmerKewraSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-400 text-black shadow-lg"
          >
            ✨ Step 3: Slow Simmer in Fragrant Kewra Rose Sugar Syrup
          </Button>
        )}

        {step === 'saffron-crystal-coat' && (
          <Button
            onClick={handleSaffronCrystalCoat}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-black shadow-lg"
          >
            💎 Step 4: Garnish with Kashmiri Saffron & Pistachio Dust
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewAgraPethaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Agra Petha Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
