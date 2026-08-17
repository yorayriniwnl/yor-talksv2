import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberLachedarRabdi() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(74000);
  const [step, setStep] = useState<'simmer-buffalo-milk' | 'fan-malai-lacchas' | 'reduce-kesar-rabdi' | 'garnish-kulhad-chilled' | 'served'>('simmer-buffalo-milk');

  const handleSimmerBuffaloMilk = () => {
    if (step !== 'simmer-buffalo-milk') return;
    sounds.playPop();
    setStep('fan-malai-lacchas');
    toast.info('🥛 Simmered rich creamy full-fat buffalo milk on slow flame in wide iron karahi!');
  };

  const handleFanMalaiLacchas = () => {
    if (step !== 'fan-malai-lacchas') return;
    sounds.playPop();
    setStep('reduce-kesar-rabdi');
    toast.info('🌬️ Fanned the milk surface to form thick clotted malai lacchas and collected along pan rim!');
  };

  const handleReduceKesarRabdi = () => {
    if (step !== 'reduce-kesar-rabdi') return;
    sounds.playPop();
    setStep('garnish-kulhad-chilled');
    toast.info('🌸 Reduced sweet milk with Kashmiri Mongra saffron threads & crushed green cardamom!');
  };

  const handleGarnishKulhadChilled = () => {
    if (step !== 'garnish-kulhad-chilled') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1660;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI LACHEDAR RABDI SERVED IN CHILLED KULHAD! (+1660 Pts)');
  };

  const handleNewRabdiBatch = () => {
    sounds.playPop();
    setStep('simmer-buffalo-milk');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-amber-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Lachedar Rabdi Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Buffalo Milk Simmer, Malai Laccha Fanning, Kesar Reduction & Kulhad Garnish</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Mathura Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Malai Laccha Thickness</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Creamy</span>
        </div>
      </div>

      {/* Rabdi Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-3xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer-buffalo-milk' ? "border-amber-200 bg-amber-200/10" :
          step === 'fan-malai-lacchas' ? "border-yellow-400 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'reduce-kesar-rabdi' ? "border-amber-500 bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 scale-110 shadow-amber-500/50" :
          step === 'garnish-kulhad-chilled' ? "border-amber-300 bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-500 scale-115 shadow-amber-300/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Kulhad Icon */}
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🏺</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer-buffalo-milk' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥛 Buffalo Milk Simmer</span>}
            {step === 'fan-malai-lacchas' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🌬️ Clotted Malai Lacchas</span>}
            {step === 'reduce-kesar-rabdi' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🌸 Saffron Cardamom Rabdi</span>}
            {step === 'garnish-kulhad-chilled' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Chilled Terracotta Kulhad</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Lachedar Rabdi!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer-buffalo-milk' && (
          <Button
            onClick={handleSimmerBuffaloMilk}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer Full-Fat Buffalo Milk in Wide Iron Karahi
          </Button>
        )}

        {step === 'fan-malai-lacchas' && (
          <Button
            onClick={handleFanMalaiLacchas}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌬️ Step 2: Fan Surface to Form & Collect Thick Malai Lacchas
          </Button>
        )}

        {step === 'reduce-kesar-rabdi' && (
          <Button
            onClick={handleReduceKesarRabdi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🌸 Step 3: Reduce Sweetened Milk with Saffron & Cardamom
          </Button>
        )}

        {step === 'garnish-kulhad-chilled' && (
          <Button
            onClick={handleGarnishKulhadChilled}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-700 text-black shadow-lg"
          >
            👑 Step 4: Fold Lacchas & Serve in Chilled Earthen Kulhad
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewRabdiBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Simmer Next Lachedar Rabdi Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
