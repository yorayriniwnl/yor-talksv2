import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberSandesh() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(9400);
  const [step, setStep] = useState<'chenna' | 'gur' | 'pauk' | 'mould' | 'served'>('chenna');

  const handleCurdleSoftChenna = () => {
    if (step !== 'chenna') return;
    sounds.playPop();
    setStep('gur');
    toast.info('🥛 Pure cow milk curdled and hung in muslin cloth into soft, velvety chenna!');
  };

  const handleKneadNolenGur = () => {
    if (step !== 'gur') return;
    sounds.playPop();
    setStep('pauk');
    toast.info('🌴 Kneaded with winter Nolen Gur (date palm jaggery) & aromatic green cardamom!');
  };

  const handleCookGentlePauk = () => {
    if (step !== 'pauk') return;
    sounds.playChime();
    setStep('mould');
    toast.info('🔥 Cooked gently over low flame in brass karahi (Pauk) until smooth fudge texture!');
  };

  const handlePressTerracottaMould = () => {
    if (step !== 'mould') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 600;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('✨ KOLKATA NOLEN GUR SANDESH MOULDED & SERVED (+600 Pts)');
  };

  const handleNewSandesh = () => {
    sounds.playPop();
    setStep('chenna');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-200 via-amber-400 to-yellow-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Sandesh Bengali Chenna Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Winter Nolen Gur, Velvet Chenna & Terracotta Conch/Lotus Moulds</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kolkata Halwai Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Nolen Gur Aroma</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Pure Date Palm</span>
        </div>
      </div>

      {/* Sandesh Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'chenna' ? "border-slate-200 bg-slate-100/10" :
          step === 'gur' ? "border-amber-400 bg-amber-400/20 scale-105" :
          step === 'pauk' ? "border-amber-600 bg-gradient-to-tr from-amber-400 to-amber-600 scale-110 shadow-amber-500/50" :
          step === 'mould' ? "border-yellow-400 bg-gradient-to-tr from-amber-200 via-amber-400 to-yellow-500 scale-115 shadow-yellow-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Lotus / Conch Pattern */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center">
            <span className="text-2xl">🪷</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'chenna' && <span className="font-mono text-[0.65rem] text-slate-200 block -mt-20">🥛 Velvet Chenna</span>}
            {step === 'gur' && <span className="font-display font-bold text-xs text-amber-300 block -mt-20">🌴 Nolen Gur Mix</span>}
            {step === 'pauk' && <span className="font-display font-bold text-xs text-black block -mt-20">🔥 Gentle Karahi Pauk</span>}
            {step === 'mould' && <span className="font-display font-bold text-xs text-black block -mt-20">🪷 Terracotta Mould</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">✨ Shudh Sandesh!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'chenna' && (
          <Button
            onClick={handleCurdleSoftChenna}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Curdle Fresh Cow Milk into Soft Velvet Chenna
          </Button>
        )}

        {step === 'gur' && (
          <Button
            onClick={handleKneadNolenGur}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🌴 Step 2: Knead with Winter Nolen Gur & Green Cardamom
          </Button>
        )}

        {step === 'pauk' && (
          <Button
            onClick={handleCookGentlePauk}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🔥 Step 3: Gentle Low Flame Brass Karahi Pauk Cook
          </Button>
        )}

        {step === 'mould' && (
          <Button
            onClick={handlePressTerracottaMould}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black shadow-lg"
          >
            🪷 Step 4: Press in Terracotta Conch Mould & Top with Saffron
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewSandesh}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Mould Next Kolkata Nolen Gur Sandesh (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
