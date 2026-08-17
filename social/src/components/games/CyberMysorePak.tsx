import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Play, RotateCcw, Sparkles, CheckCircle2, Utensils, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMysorePak() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(6800);
  const [step, setStep] = useState<'besan' | 'ghee' | 'pour' | 'slice' | 'served'>('besan');

  const handleRoastBesan = () => {
    if (step !== 'besan') return;
    sounds.playPop();
    setStep('ghee');
    toast.info('🌰 Fine nutty gram flour (Besan) sifted and dry roasted until fragrant golden yellow!');
  };

  const handlePourSmokingGhee = () => {
    if (step !== 'ghee') return;
    sounds.playChime();
    setStep('pour');
    toast.info('🔥 Boiling smoking hot pure Desi Ghee poured continuously creating royal honeycomb froth!');
  };

  const handleTrayPour = () => {
    if (step !== 'pour') return;
    sounds.playPop();
    setStep('slice');
    toast.info('🧈 Poured into heavy rectangular brass tray to set with airy porous texture!');
  };

  const handleSliceMeltInMouth = () => {
    if (step !== 'slice') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 520;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL MELT-IN-MOUTH MYSORE PAK SLICED & SERVED (+520 Pts)');
  };

  const handleNewMysorePak = () => {
    sounds.playPop();
    setStep('besan');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Mysore Pak Ghee Melt Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Nutty Besan, Smoking Desi Ghee Froth & Royal Honeycomb Slices</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Palace Halwai Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Honeycomb Aeration</span>
          <span className="font-display font-black text-xl text-amber-400">🧈 99.9% Ghee Melt</span>
        </div>
      </div>

      {/* Mysore Pak Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-32 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'besan' ? "border-amber-200/40 bg-amber-100/10" :
          step === 'ghee' ? "border-amber-400 bg-amber-400/20 scale-105" :
          step === 'pour' ? "border-yellow-400 bg-gradient-to-tr from-amber-500 to-yellow-400 scale-110 shadow-yellow-400/50" :
          step === 'slice' ? "border-amber-300 bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 scale-115 shadow-amber-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          <div className="text-center">
            {step === 'besan' && <span className="font-mono text-xs text-amber-200">🌰 Roasted Besan</span>}
            {step === 'ghee' && <span className="font-display font-bold text-amber-300">🔥 Smoking Ghee Froth</span>}
            {step === 'pour' && <span className="font-display font-bold text-black">🧈 Brass Tray Set</span>}
            {step === 'slice' && <span className="font-display font-bold text-black">✨ Honeycomb Slices</span>}
            {step === 'served' && <span className="font-display font-bold text-emerald-400">✨ Royal Ghee Melt!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'besan' && (
          <Button
            onClick={handleRoastBesan}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌰 Step 1: Roast Sifted Besan to Fragrant Golden Yellow
          </Button>
        )}

        {step === 'ghee' && (
          <Button
            onClick={handlePourSmokingGhee}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-400 text-black shadow-lg"
          >
            🔥 Step 2: Pour Smoking Boiling Ghee into Frothing Syrup
          </Button>
        )}

        {step === 'pour' && (
          <Button
            onClick={handleTrayPour}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-400 text-black shadow-lg"
          >
            🧈 Step 3: Set in Heavy Rectangular Brass Tray
          </Button>
        )}

        {step === 'slice' && (
          <Button
            onClick={handleSliceMeltInMouth}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 to-emerald-500 text-black shadow-lg"
          >
            ✨ Step 4: Slice into Soft Melt-In-Mouth Blocks & Box
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewMysorePak}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Bake Next Golden Ghee Mysore Pak (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
