import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberPaanPeda() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(72000);
  const [step, setStep] = useState<'simmer-paan-khoya' | 'stuff-rose-gulkand' | 'press-brass-stamp' | 'vark-chironji-garnish' | 'served'>('simmer-paan-khoya');

  const handleSimmerPaanKhoya = () => {
    if (step !== 'simmer-paan-khoya') return;
    sounds.playPop();
    setStep('stuff-rose-gulkand');
    toast.info('🌿 Simmered rich buffalo khoya with real betel paan leaf extract, cardamom & pista paste!');
  };

  const handleStuffRoseGulkand = () => {
    if (step !== 'stuff-rose-gulkand') return;
    sounds.playPop();
    setStep('press-brass-stamp');
    toast.info('🌹 Stuffed organic Damask rose gulkand, sweetened saunf & chuhara into peda center!');
  };

  const handlePressBrassStamp = () => {
    if (step !== 'press-brass-stamp') return;
    sounds.playPop();
    setStep('vark-chironji-garnish');
    toast.info('🪙 Pressed traditional fluted brass seal stamp to emboss royal paan insignia!');
  };

  const handleVarkChironjiGarnish = () => {
    if (step !== 'vark-chironji-garnish') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1640;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI PAAN GULKAND PEDA SERVED FRESH! (+1640 Pts)');
  };

  const handleNewPedaBatch = () => {
    sounds.playPop();
    setStep('simmer-paan-khoya');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-rose-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Paan Peda Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Paan Khoya Simmer, Rose Gulkand Core, Brass Stamp & Silver Vark</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Awadh Score</span>
          <strong className="text-emerald-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score} Pts</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Paan Gulkand Essence</span>
          <span className="font-display font-black text-xl text-emerald-400">✨ 100% Shahi</span>
        </div>
      </div>

      {/* Paan Peda Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer-paan-khoya' ? "border-emerald-300 bg-emerald-300/10" :
          step === 'stuff-rose-gulkand' ? "border-rose-400 bg-rose-400/20 scale-105 shadow-rose-400/40" :
          step === 'press-brass-stamp' ? "border-emerald-500 bg-gradient-to-tr from-emerald-500 via-teal-500 to-rose-500 scale-110 shadow-emerald-500/50" :
          step === 'vark-chironji-garnish' ? "border-emerald-200 bg-gradient-to-r from-emerald-300 via-teal-400 to-rose-400 scale-115 shadow-emerald-200/60" :
          "border-emerald-400 bg-emerald-400/20 scale-110"
        )}>
          {/* Peda Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🌿</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer-paan-khoya' && <span className="font-mono text-[0.65rem] text-emerald-200 block -mt-24">🌿 Paan Extract Khoya</span>}
            {step === 'stuff-rose-gulkand' && <span className="font-display font-bold text-xs text-rose-300 block -mt-24">🌹 Rose Gulkand Center</span>}
            {step === 'press-brass-stamp' && <span className="font-display font-bold text-xs text-emerald-300 block -mt-24">🪙 Fluted Brass Seal Stamp</span>}
            {step === 'vark-chironji-garnish' && <span className="font-display font-bold text-xs text-emerald-100 block -mt-24">👑 Silver Vark & Chironji</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Paan Gulkand Peda!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer-paan-khoya' && (
          <Button
            onClick={handleSimmerPaanKhoya}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌿 Step 1: Simmer Khoya with Fresh Paan Leaf Extract & Cardamom
          </Button>
        )}

        {step === 'stuff-rose-gulkand' && (
          <Button
            onClick={handleStuffRoseGulkand}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🌹 Step 2: Stuff Organic Damask Rose Gulkand & Sweet Saunf Core
          </Button>
        )}

        {step === 'press-brass-stamp' && (
          <Button
            onClick={handlePressBrassStamp}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-emerald-600 text-white shadow-lg"
          >
            🪙 Step 3: Emboss with Fluted Brass Royal Seal Stamp
          </Button>
        )}

        {step === 'vark-chironji-garnish' && (
          <Button
            onClick={handleVarkChironjiGarnish}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-emerald-500 via-teal-500 to-rose-500 text-white shadow-lg"
          >
            👑 Step 4: Top Edible Silver Vark & Chironji Garnish
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewPedaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Paan Peda Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
