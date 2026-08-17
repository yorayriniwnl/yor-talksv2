import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKesarGhevar() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(48000);
  const [step, setStep] = useState<'whip-ghee-ice' | 'pour-honeycomb-fry' | 'soak-saffron-syrup' | 'spread-mawa-malai' | 'served'>('whip-ghee-ice');

  const handleWhipGheeIce = () => {
    if (step !== 'whip-ghee-ice') return;
    sounds.playPop();
    setStep('pour-honeycomb-fry');
    toast.info('🧈 Whipped cold desi cow ghee with ice cubes into creamy white emulsion!');
  };

  const handlePourHoneycombFry = () => {
    if (step !== 'pour-honeycomb-fry') return;
    sounds.playPop();
    setStep('soak-saffron-syrup');
    toast.info('🔥 Poured batter in center of sizzling ghee mold to form intricate honeycomb mesh!');
  };

  const handleSoakSaffronSyrup = () => {
    if (step !== 'soak-saffron-syrup') return;
    sounds.playPop();
    setStep('spread-mawa-malai');
    toast.info('🍯 Drizzled warm cardamom & Kashmiri saffron chashni through the pores!');
  };

  const handleSpreadMawaMalai = () => {
    if (step !== 'spread-mawa-malai') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1340;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL KESAR MALAI GHEVAR SERVED FRESH! (+1340 Pts)');
  };

  const handleNewGhevarBatch = () => {
    sounds.playPop();
    setStep('whip-ghee-ice');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kesar Malai Ghevar Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Jaipur Honeycomb Mesh, Desi Ghee Fry, Saffron Glaze & Mawa Malai Frosting</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Jaipur Halwai Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Honeycomb Netting</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Crisp Mesh</span>
        </div>
      </div>

      {/* Ghevar Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'whip-ghee-ice' ? "border-amber-100 bg-amber-100/10" :
          step === 'pour-honeycomb-fry' ? "border-amber-500 bg-amber-500/20 scale-105 shadow-amber-500/40" :
          step === 'soak-saffron-syrup' ? "border-yellow-400 bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 scale-110 shadow-yellow-400/50" :
          step === 'spread-mawa-malai' ? "border-yellow-100 bg-gradient-to-r from-amber-100 via-yellow-300 to-emerald-400 scale-115 shadow-yellow-100/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Ghevar Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🥮</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'whip-ghee-ice' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🧈 Whipped Cold Ghee</span>}
            {step === 'pour-honeycomb-fry' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🔥 Honeycomb Mesh Fry</span>}
            {step === 'soak-saffron-syrup' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🍯 Kesar Chashni Glaze</span>}
            {step === 'spread-mawa-malai' && <span className="font-display font-bold text-xs text-yellow-100 block -mt-24">👑 Mawa Malai & Silver Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Kesar Ghevar!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'whip-ghee-ice' && (
          <Button
            onClick={handleWhipGheeIce}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🧈 Step 1: Whip Desi Cow Ghee with Ice into Creamy Emulsion
          </Button>
        )}

        {step === 'pour-honeycomb-fry' && (
          <Button
            onClick={handlePourHoneycombFry}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🔥 Step 2: Pour Batter in Hot Ghee Mold to Form Honeycomb Mesh
          </Button>
        )}

        {step === 'soak-saffron-syrup' && (
          <Button
            onClick={handleSoakSaffronSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-600 text-white shadow-lg"
          >
            🍯 Step 3: Drizzle Warm Saffron Cardamom Syrup through Honeycomb
          </Button>
        )}

        {step === 'spread-mawa-malai' && (
          <Button
            onClick={handleSpreadMawaMalai}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-300 via-yellow-400 to-rose-400 text-black shadow-lg"
          >
            👑 Step 4: Top with Thick Mawa Malai, Pistachios & Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGhevarBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Kesar Malai Ghevar Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
