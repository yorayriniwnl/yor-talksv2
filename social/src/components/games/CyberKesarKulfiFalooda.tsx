import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown, IceCream } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKesarKulfiFalooda() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(54000);
  const [step, setStep] = useState<'churn-matka-kulfi' | 'extrude-falooda-sev' | 'bloom-sabja-seeds' | 'drizzle-rose-rabdi' | 'served'>('churn-matka-kulfi');

  const handleChurnMatkaKulfi = () => {
    if (step !== 'churn-matka-kulfi') return;
    sounds.playPop();
    setStep('extrude-falooda-sev');
    toast.info('🧊 Churned rich saffron clotted cream in terracotta pots into frozen Matka Kulfi!');
  };

  const handleExtrudeFaloodaSev = () => {
    if (step !== 'extrude-falooda-sev') return;
    sounds.playPop();
    setStep('bloom-sabja-seeds');
    toast.info('🍜 Pressed silky translucent cornstarch falooda sev into iced water bath!');
  };

  const handleBloomSabjaSeeds = () => {
    if (step !== 'bloom-sabja-seeds') return;
    sounds.playPop();
    setStep('drizzle-rose-rabdi');
    toast.info('🌱 Bloomed aromatic sweet basil sabja seeds in kewra scented rose water!');
  };

  const handleDrizzleRoseRabdi = () => {
    if (step !== 'drizzle-rose-rabdi') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1420;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KESAR KULFI FALOODA SERVED FRESH! (+1420 Pts)');
  };

  const handleNewKulfiBatch = () => {
    sounds.playPop();
    setStep('churn-matka-kulfi');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-yellow-400 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kulfi Falooda Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Terracotta Saffron Kulfi, Silky Falooda Sev, Sabja Seeds & Damask Rose Rabdi</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Chowpatty Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Chilled Perfection</span>
          <span className="font-display font-black text-xl text-rose-400">✨ -8°C Chilled</span>
        </div>
      </div>

      {/* Kulfi Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'churn-matka-kulfi' ? "border-yellow-200 bg-yellow-200/10" :
          step === 'extrude-falooda-sev' ? "border-amber-400 bg-amber-400/20 scale-105 shadow-amber-400/40" :
          step === 'bloom-sabja-seeds' ? "border-emerald-400 bg-gradient-to-tr from-yellow-400 via-emerald-500 to-rose-500 scale-110 shadow-emerald-400/50" :
          step === 'drizzle-rose-rabdi' ? "border-rose-400 bg-gradient-to-r from-pink-400 via-rose-500 to-yellow-300 scale-115 shadow-rose-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Kulfi Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-rose-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🍨</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'churn-matka-kulfi' && <span className="font-mono text-[0.65rem] text-yellow-200 block -mt-24">🧊 Saffron Matka Kulfi</span>}
            {step === 'extrude-falooda-sev' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🍜 Silky Falooda Sev</span>}
            {step === 'bloom-sabja-seeds' && <span className="font-display font-bold text-xs text-emerald-300 block -mt-24">🌱 Bloomed Sabja Seeds</span>}
            {step === 'drizzle-rose-rabdi' && <span className="font-display font-bold text-xs text-rose-300 block -mt-24">👑 Rose Syrup & Malai Rabdi</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Kulfi Falooda!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'churn-matka-kulfi' && (
          <Button
            onClick={handleChurnMatkaKulfi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🧊 Step 1: Churn Saffron Clotted Cream in Frozen Matka Pots
          </Button>
        )}

        {step === 'extrude-falooda-sev' && (
          <Button
            onClick={handleExtrudeFaloodaSev}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🍜 Step 2: Extrude Silky Translucent Falooda Sev into Ice Bath
          </Button>
        )}

        {step === 'bloom-sabja-seeds' && (
          <Button
            onClick={handleBloomSabjaSeeds}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-emerald-600 text-white shadow-lg"
          >
            🌱 Step 3: Bloom Sweet Basil Sabja Seeds in Scented Kewra
          </Button>
        )}

        {step === 'drizzle-rose-rabdi' && (
          <Button
            onClick={handleDrizzleRoseRabdi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-pink-500 via-rose-500 to-yellow-400 text-white shadow-lg"
          >
            👑 Step 4: Drizzle Damask Rose Syrup & Thick Malai Rabdi
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewKulfiBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Serve Next Royal Kulfi Falooda Glass (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
