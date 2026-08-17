import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKesarSandeshRoyal() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(84000);
  const [step, setStep] = useState<'curdle-fresh-chenna' | 'knead-marble-slab' | 'mould-shonkh-terracotta' | 'gold-vark-garnish' | 'served'>('curdle-fresh-chenna');

  const handleCurdleFreshChenna = () => {
    if (step !== 'curdle-fresh-chenna') return;
    sounds.playPop();
    setStep('knead-marble-slab');
    toast.info('🥛 Curdled fresh cow milk into soft chenna and drained in fine muslin cloth!');
  };

  const handleKneadMarbleSlab = () => {
    if (step !== 'knead-marble-slab') return;
    sounds.playPop();
    setStep('mould-shonkh-terracotta');
    toast.info('🟡 Hand-kneaded smooth chenna on marble slab with bloomed kesar milk & cardamom!');
  };

  const handleMouldShonkhTerracotta = () => {
    if (step !== 'mould-shonkh-terracotta') return;
    sounds.playPop();
    setStep('gold-vark-garnish');
    toast.info('🐚 Pressed saffron chenna into carved terracotta Shonkh & Padma motifs!');
  };

  const handleGoldVarkGarnish = () => {
    if (step !== 'gold-vark-garnish') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1760;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KESAR SANDESH SERVED FRESH! (+1760 Pts)');
  };

  const handleNewSandeshBatch = () => {
    sounds.playPop();
    setStep('curdle-fresh-chenna');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-amber-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kesar Sandesh Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Chenna Curdling, Marble Kneading, Shonkh Mould & Gold Vark Garnish</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Bengal Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Chenna Softness</span>
          <span className="font-display font-black text-xl text-yellow-400">✨ 100% Makhmali</span>
        </div>
      </div>

      {/* Sandesh Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'curdle-fresh-chenna' ? "border-amber-200 bg-amber-200/10" :
          step === 'knead-marble-slab' ? "border-yellow-400 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'mould-shonkh-terracotta' ? "border-amber-500 bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 scale-110 shadow-amber-500/50" :
          step === 'gold-vark-garnish' ? "border-yellow-300 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 scale-115 shadow-yellow-300/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Sandesh Icon */}
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🥮</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'curdle-fresh-chenna' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥛 Fresh Cow Chenna</span>}
            {step === 'knead-marble-slab' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🟡 Marble Slab Kesar Knead</span>}
            {step === 'mould-shonkh-terracotta' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🐚 Terracotta Shonkh Mould</span>}
            {step === 'gold-vark-garnish' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Pista & Pure 24K Gold Vark</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Kesar Sandesh!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'curdle-fresh-chenna' && (
          <Button
            onClick={handleCurdleFreshChenna}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Curdle Cow Milk into Soft Fresh Chenna Curd
          </Button>
        )}

        {step === 'knead-marble-slab' && (
          <Button
            onClick={handleKneadMarbleSlab}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🟡 Step 2: Hand-Knead on Marble with Saffron Milk & Cardamom
          </Button>
        )}

        {step === 'mould-shonkh-terracotta' && (
          <Button
            onClick={handleMouldShonkhTerracotta}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🐚 Step 3: Press into Carved Terracotta Shonkh Moulds
          </Button>
        )}

        {step === 'gold-vark-garnish' && (
          <Button
            onClick={handleGoldVarkGarnish}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-400 via-amber-500 to-amber-600 text-black shadow-lg"
          >
            👑 Step 4: Garnish Slivered Pistachios & 24K Gold Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewSandeshBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Kesar Sandesh Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
