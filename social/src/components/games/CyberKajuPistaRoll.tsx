import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKajuPistaRoll() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(41000);
  const [step, setStep] = useState<'roll-kaju-sheet' | 'prepare-pista-core' | 'roll-cylinder' | 'silver-vark-slice' | 'served'>('roll-kaju-sheet');

  const handleRollKajuSheet = () => {
    if (step !== 'roll-kaju-sheet') return;
    sounds.playPop();
    setStep('prepare-pista-core');
    toast.info('🥜 Rolled premium cashew nut paste dough into thin rectangular royal sheet!');
  };

  const handlePreparePistaCore = () => {
    if (step !== 'prepare-pista-core') return;
    sounds.playPop();
    setStep('roll-cylinder');
    toast.info('💚 Prepared fragrant green cardamom pistachio mawa filling for inner core!');
  };

  const handleRollCylinder = () => {
    if (step !== 'roll-cylinder') return;
    sounds.playPop();
    setStep('silver-vark-slice');
    toast.info('✨ Rolled dual kaju-pista layers tightly into uniform cylindrical logs!');
  };

  const handleSilverVarkSlice = () => {
    if (step !== 'silver-vark-slice') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1260;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL KAJU PISTA ROLL WRAPPED IN SILVER VARK & SLICED! (+1260 Pts)');
  };

  const handleNewKajuPistaRollBatch = () => {
    sounds.playPop();
    setStep('roll-kaju-sheet');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-amber-300 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kaju Pista Roll Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Fine Cashew Paste, Pistachio Elaichi Core & Edible Silver Vark</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Silver Vark Sheen</span>
          <span className="font-display font-black text-xl text-emerald-400">✨ 100% Royal Polish</span>
        </div>
      </div>

      {/* Kaju Pista Roll Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'roll-kaju-sheet' ? "border-amber-100 bg-amber-100/10" :
          step === 'prepare-pista-core' ? "border-emerald-400 bg-emerald-500/20 scale-105 shadow-emerald-500/40" :
          step === 'roll-cylinder' ? "border-teal-400 bg-gradient-to-tr from-emerald-400 via-amber-100 to-teal-500 scale-110 shadow-teal-400/50" :
          step === 'silver-vark-slice' ? "border-slate-100 bg-gradient-to-r from-slate-200 via-emerald-400 to-amber-200 scale-115 shadow-slate-200/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Roll Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🪵</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'roll-kaju-sheet' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🥜 Rolled Cashew Sheet</span>}
            {step === 'prepare-pista-core' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">💚 Pistachio Elaichi Core</span>}
            {step === 'roll-cylinder' && <span className="font-display font-bold text-xs text-teal-300 block -mt-24">✨ Dual Spiral Log</span>}
            {step === 'silver-vark-slice' && <span className="font-display font-bold text-xs text-slate-100 block -mt-24">💎 Silver Vark & Slices</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Kaju Pista Roll!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'roll-kaju-sheet' && (
          <Button
            onClick={handleRollKajuSheet}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥜 Step 1: Roll Fine Cashew Nut Dough into Uniform Sheet
          </Button>
        )}

        {step === 'prepare-pista-core' && (
          <Button
            onClick={handlePreparePistaCore}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-emerald-600 text-white shadow-lg"
          >
            💚 Step 2: Prepare Emerald Pistachio & Cardamom Mawa Filling
          </Button>
        )}

        {step === 'roll-cylinder' && (
          <Button
            onClick={handleRollCylinder}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-teal-600 text-white shadow-lg"
          >
            ✨ Step 3: Roll Dual Layers Tightly into Cylindrical Spiral
          </Button>
        )}

        {step === 'silver-vark-slice' && (
          <Button
            onClick={handleSilverVarkSlice}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-slate-200 via-emerald-400 to-amber-200 text-black shadow-lg"
          >
            💎 Step 4: Apply Edible Silver Vark & Slice into Royal Logs
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewKajuPistaRollBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Kaju Pista Roll Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
