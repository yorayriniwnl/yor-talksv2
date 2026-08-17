import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGhewar() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(8200);
  const [step, setStep] = useState<'drip' | 'honeycomb' | 'chashni' | 'rabri' | 'served'>('drip');

  const handleDripChilledBatter = () => {
    if (step !== 'drip') return;
    sounds.playPop();
    setStep('honeycomb');
    toast.info('🧊 Ice-chilled flour & ghee batter dripped from height into smoking hot desi ghee!');
  };

  const handleCrispMeshDisc = () => {
    if (step !== 'honeycomb') return;
    sounds.playChime();
    setStep('chashni');
    toast.info('🔥 Intricate circular honeycomb lattice formed and fried to golden crispness!');
  };

  const handleDunkSaffronSyrup = () => {
    if (step !== 'chashni') return;
    sounds.playPop();
    setStep('rabri');
    toast.info('🍯 Dunked gently into warm saffron-cardamom chashni until sweetness permeates mesh!');
  };

  const handleSpreadMalaiRabri = () => {
    if (step !== 'rabri') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 560;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL RAJASTHANI MALAI GHEWAR CROWNED & SERVED (+560 Pts)');
  };

  const handleNewGhewar = () => {
    sounds.playPop();
    setStep('drip');
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
              Cyber Ghewar Honeycomb Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Chilled Batter Drip, Porous Honeycomb Mesh & Thick Malai Rabri</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Honeycomb Porosity</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Crisp Lattice</span>
        </div>
      </div>

      {/* Ghewar Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'drip' ? "border-amber-200/40 bg-amber-100/10" :
          step === 'honeycomb' ? "border-amber-400 bg-amber-400/20 scale-105 border-dashed" :
          step === 'chashni' ? "border-orange-400 bg-gradient-to-tr from-amber-500 to-orange-400 scale-110 shadow-orange-400/50" :
          step === 'rabri' ? "border-amber-300 bg-gradient-to-tr from-yellow-100 via-amber-300 to-yellow-400 scale-115 shadow-amber-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Inner Donut Ring */}
          <div className="w-14 h-14 rounded-full bg-zinc-950 border-2 border-border/40 flex items-center justify-center">
            <span className="text-[0.6rem] font-mono text-muted-foreground">Ring</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'drip' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-16">💧 Chilled Drip</span>}
            {step === 'honeycomb' && <span className="font-display font-bold text-xs text-amber-300 block -mt-16">🔥 Honeycomb Mesh</span>}
            {step === 'chashni' && <span className="font-display font-bold text-xs text-black block -mt-16">🍯 Chashni Soak</span>}
            {step === 'rabri' && <span className="font-display font-bold text-xs text-black block -mt-16">✨ Malai & Pista</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-16">👑 Royal Ghewar!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'drip' && (
          <Button
            onClick={handleDripChilledBatter}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            💧 Step 1: Drip Ice-Chilled Batter into Smoking Hot Desi Ghee
          </Button>
        )}

        {step === 'honeycomb' && (
          <Button
            onClick={handleCrispMeshDisc}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-400 text-black shadow-lg"
          >
            🔥 Step 2: Form Circular Porous Honeycomb Mesh Disc
          </Button>
        )}

        {step === 'chashni' && (
          <Button
            onClick={handleDunkSaffronSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-500 text-white shadow-lg"
          >
            🍯 Step 3: Dunk in Warm Saffron-Cardamom Chashni
          </Button>
        )}

        {step === 'rabri' && (
          <Button
            onClick={handleSpreadMalaiRabri}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-500 text-black shadow-lg"
          >
            ✨ Step 4: Layer Thick Malai Rabri & Pistachio Almond Flakes
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGhewar}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Bake Next Rajasthani Malai Ghewar (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
