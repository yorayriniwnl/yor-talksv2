import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMotichoor() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(7200);
  const [step, setStep] = useState<'batter' | 'jhara' | 'chashni' | 'shape' | 'served'>('batter');

  const handleMixBatter = () => {
    if (step !== 'batter') return;
    sounds.playPop();
    setStep('jhara');
    toast.info('🟡 Ultra-fine saffron besan batter mixed to flowing consistency!');
  };

  const handleDropBundi = () => {
    if (step !== 'jhara') return;
    sounds.playChime();
    setStep('chashni');
    toast.info('🔥 Sieved through perforated jhara into hot ghee — tiny golden pearls (bundi) fried crispy!');
  };

  const handleSoakChashni = () => {
    if (step !== 'chashni') return;
    sounds.playPop();
    setStep('shape');
    toast.info('🍯 Dunked in hot saffron-cardamom chashni + crunchy melon seeds (magaz) infused!');
  };

  const handleCompressLadoo = () => {
    if (step !== 'shape') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 500;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('✨ ROYAL SAFFRON MOTICHOOR LADOO ROLLED & BOXED (+500 Pts)');
  };

  const handleNewLadoo = () => {
    sounds.playPop();
    setStep('batter');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Motichoor Ladoo Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Perforated Jhara Bundi Fry, Saffron Chashni & Magaz Seeds</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Halwai Master Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Pearl Roundness</span>
          <span className="font-display font-black text-xl text-amber-400">🟡 99.8% Tiny Bundi</span>
        </div>
      </div>

      {/* Ladoo Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-36 h-36 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'batter' ? "border-amber-200/40 bg-amber-100/10" :
          step === 'jhara' ? "border-amber-400 bg-amber-400/20 scale-105" :
          step === 'chashni' ? "border-orange-400 bg-gradient-to-tr from-amber-500 to-orange-400 scale-110 shadow-orange-400/50" :
          step === 'shape' ? "border-amber-400 bg-gradient-to-tr from-amber-400 via-orange-400 to-yellow-500 scale-115 shadow-amber-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          <div className="text-center">
            {step === 'batter' && <span className="font-mono text-xs text-amber-200">🟡 Saffron Batter</span>}
            {step === 'jhara' && <span className="font-display font-bold text-amber-300">🔥 Jhara Bundi Fry</span>}
            {step === 'chashni' && <span className="font-display font-bold text-black">🍯 Chashni Soak</span>}
            {step === 'shape' && <span className="font-display font-bold text-black">✨ Roll Ladoo</span>}
            {step === 'served' && <span className="font-display font-bold text-emerald-400">✨ Royal Ladoo!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'batter' && (
          <Button
            onClick={handleMixBatter}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🟡 Step 1: Whisk Fine Saffron Besan Batter to Flowing Consistency
          </Button>
        )}

        {step === 'jhara' && (
          <Button
            onClick={handleDropBundi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-400 text-black shadow-lg"
          >
            🔥 Step 2: Sieve Through Perforated Jhara into Hot Desi Ghee
          </Button>
        )}

        {step === 'chashni' && (
          <Button
            onClick={handleSoakChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-orange-500 text-white shadow-lg"
          >
            🍯 Step 3: Dunk in Warm Saffron Chashni & Mix Magaz Seeds
          </Button>
        )}

        {step === 'shape' && (
          <Button
            onClick={handleCompressLadoo}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 to-emerald-500 text-black shadow-lg"
          >
            ✨ Step 4: Compress into Golden Spheres & Box for Shagun
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewLadoo}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Roll Next Saffron Motichoor Ladoo (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
