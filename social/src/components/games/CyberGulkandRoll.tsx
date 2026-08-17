import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberGulkandRoll() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(45000);
  const [step, setStep] = useState<'prepare-kaju-dough' | 'infuse-rose-gulkand' | 'roll-paan-core' | 'silver-vark-garnish' | 'served'>('prepare-kaju-dough');

  const handlePrepareKajuDough = () => {
    if (step !== 'prepare-kaju-dough') return;
    sounds.playPop();
    setStep('infuse-rose-gulkand');
    toast.info('🥜 Prepared smooth silver cashew nut paste dough for outer royal layer!');
  };

  const handleInfuseRoseGulkand = () => {
    if (step !== 'infuse-rose-gulkand') return;
    sounds.playPop();
    setStep('roll-paan-core');
    toast.info('🌹 Infused Damask rose petal gulkand with roasted melon seeds & mawa!');
  };

  const handleRollPaanCore = () => {
    if (step !== 'roll-paan-core') return;
    sounds.playPop();
    setStep('silver-vark-garnish');
    toast.info('✨ Rolled green paan extract & gulkand core tightly inside kaju sheet!');
  };

  const handleSilverVarkGarnish = () => {
    if (step !== 'silver-vark-garnish') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1300;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL KAJU GULKAND PAAN ROLL GARNISHED & SERVED! (+1300 Pts)');
  };

  const handleNewGulkandRollBatch = () => {
    sounds.playPop();
    setStep('prepare-kaju-dough');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-emerald-600 to-amber-400 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kaju Gulkand Paan Roll Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Damask Rose Gulkand, Green Paan Leaf & Silver Vark Cashew Logs</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Rose Petal Aroma</span>
          <span className="font-display font-black text-xl text-rose-400">✨ 100% Damask Pure</span>
        </div>
      </div>

      {/* Gulkand Roll Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'prepare-kaju-dough' ? "border-amber-100 bg-amber-100/10" :
          step === 'infuse-rose-gulkand' ? "border-rose-400 bg-rose-500/20 scale-105 shadow-rose-500/40" :
          step === 'roll-paan-core' ? "border-emerald-400 bg-gradient-to-tr from-emerald-500 via-rose-500 to-amber-200 scale-110 shadow-emerald-400/50" :
          step === 'silver-vark-garnish' ? "border-slate-100 bg-gradient-to-r from-slate-200 via-rose-400 to-emerald-400 scale-115 shadow-slate-200/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Roll Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-rose-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌹</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'prepare-kaju-dough' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🥜 Smooth Cashew Sheet</span>}
            {step === 'infuse-rose-gulkand' && <span className="font-display font-bold text-xs text-rose-400 block -mt-24">🌹 Damask Rose Gulkand</span>}
            {step === 'roll-paan-core' && <span className="font-display font-bold text-xs text-emerald-300 block -mt-24">✨ Green Paan Spiral Core</span>}
            {step === 'silver-vark-garnish' && <span className="font-display font-bold text-xs text-slate-100 block -mt-24">💎 Silver Vark & Pistachio</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Gulkand Paan Roll!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'prepare-kaju-dough' && (
          <Button
            onClick={handlePrepareKajuDough}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥜 Step 1: Roll Fine Cashew Paste into Thin Royal Sheet
          </Button>
        )}

        {step === 'infuse-rose-gulkand' && (
          <Button
            onClick={handleInfuseRoseGulkand}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🌹 Step 2: Mix Damask Rose Gulkand with Melon Seeds & Mawa
          </Button>
        )}

        {step === 'roll-paan-core' && (
          <Button
            onClick={handleRollPaanCore}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-emerald-600 text-white shadow-lg"
          >
            ✨ Step 3: Roll Paan Essence & Gulkand Filling inside Sheet
          </Button>
        )}

        {step === 'silver-vark-garnish' && (
          <Button
            onClick={handleSilverVarkGarnish}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 text-black shadow-lg"
          >
            💎 Step 4: Apply Silver Vark & Slice into Royal Paan Logs
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewGulkandRollBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Gulkand Paan Roll Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
