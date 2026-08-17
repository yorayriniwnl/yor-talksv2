import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGhevarMalai() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(16000);
  const [step, setStep] = useState<'whip' | 'fry' | 'syrup' | 'rabdi' | 'served'>('whip');

  const handleWhipGheeIce = () => {
    if (step !== 'whip') return;
    sounds.playPop();
    setStep('fry');
    toast.info('🧊 Desi ghee whipped with ice cubes into creamy white emulsion, folded with chilled milk & maida!');
  };

  const handleFryHoneycombDisc = () => {
    if (step !== 'fry') return;
    sounds.playPop();
    setStep('syrup');
    toast.info('🔥 Poured batter in center of piping hot desi ghee, creating crispy golden honeycomb mesh disc!');
  };

  const handleSoakSaffronSyrup = () => {
    if (step !== 'syrup') return;
    sounds.playPop();
    setStep('rabdi');
    toast.info('✨ Soaked in warm saffron kesar & green cardamom chashni!');
  };

  const handleLayerMalaiRabdi = () => {
    if (step !== 'rabdi') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 820;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI MALAI GHEVAR TOPPED WITH THICK RABDI & PISTA! (+820 Pts)');
  };

  const handleNewGhevar = () => {
    sounds.playPop();
    setStep('whip');
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
              Cyber Shahi Malai Ghevar Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Honeycomb Ghee Disc, Saffron Chashni & Thick Malai Rabdi</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Mesh Crispness</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Royal Honeycomb</span>
        </div>
      </div>

      {/* Ghevar Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'whip' ? "border-amber-100 bg-amber-50/10" :
          step === 'fry' ? "border-amber-400 bg-amber-400/20 scale-105 shadow-amber-400/40" :
          step === 'syrup' ? "border-yellow-400 bg-yellow-500/30 scale-110 shadow-yellow-500/50" :
          step === 'rabdi' ? "border-amber-200 bg-gradient-to-tr from-amber-100 via-yellow-200 to-amber-300 scale-115 shadow-amber-200/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Honeycomb Center Hole */}
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-amber-400/80 flex items-center justify-center bg-black/40">
            <span className="text-xl">👑</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'whip' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-20">🧊 Ghee Ice Whip</span>}
            {step === 'fry' && <span className="font-display font-bold text-xs text-amber-400 block -mt-20">🔥 Honeycomb Fry</span>}
            {step === 'syrup' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-20">✨ Saffron Syrup</span>}
            {step === 'rabdi' && <span className="font-display font-bold text-xs text-black block -mt-20">🥛 Thick Malai Rabdi</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Royal Malai Ghevar!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'whip' && (
          <Button
            onClick={handleWhipGheeIce}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🧊 Step 1: Whip Desi Ghee with Ice Cubes & Chilled Milk
          </Button>
        )}

        {step === 'fry' && (
          <Button
            onClick={handleFryHoneycombDisc}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🔥 Step 2: Pour Batter in Piping Hot Ghee to Form Honeycomb Mesh
          </Button>
        )}

        {step === 'syrup' && (
          <Button
            onClick={handleSoakSaffronSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-400 text-black shadow-lg"
          >
            ✨ Step 3: Soak in Warm Saffron Cardamom Chashni
          </Button>
        )}

        {step === 'rabdi' && (
          <Button
            onClick={handleLayerMalaiRabdi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 text-black shadow-lg"
          >
            🥛 Step 4: Layer with Thick Mawa Rabdi, Pista Flakes & Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGhevar}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Fry Next Royal Malai Ghevar Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
