import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberRabdiFalooda() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(21000);
  const [step, setStep] = useState<'malai' | 'sev' | 'rose' | 'rabdi' | 'served'>('malai');

  const handleScrapeKadaiMalai = () => {
    if (step !== 'malai') return;
    sounds.playPop();
    setStep('sev');
    toast.info('🥛 Simmered rich buffalo milk and scraped thick golden malai lachhas!');
  };

  const handlePressSevNoodles = () => {
    if (step !== 'sev') return;
    sounds.playPop();
    setStep('rose');
    toast.info('🍜 Pressed silky falooda sev through brass jali moulds into ice water!');
  };

  const handleLayerRoseSabja = () => {
    if (step !== 'rose') return;
    sounds.playPop();
    setStep('rabdi');
    toast.info('🌹 Layered chilled rose syrup and swollen cooling sabja basil seeds!');
  };

  const handleCrownLachhaRabdi = () => {
    if (step !== 'rabdi') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 950;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL KESAR PISTA RABDI FALOODA ASSEMBLED & SERVED! (+950 Pts)');
  };

  const handleNewFaloodaBatch = () => {
    sounds.playPop();
    setStep('malai');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shahi Rabdi Falooda Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Malai Scrape, Sev Press, Rose Sabja & Shahi Lachha Rabdi</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Lachha Thickness</span>
          <span className="font-display font-black text-xl text-rose-300">✨ 100% Creamy Rabdi</span>
        </div>
      </div>

      {/* Falooda Glass Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-36 h-48 rounded-2xl border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'malai' ? "border-amber-100 bg-amber-50/10" :
          step === 'sev' ? "border-yellow-200 bg-yellow-100/20 scale-105 shadow-yellow-200/40" :
          step === 'rose' ? "border-rose-500 bg-gradient-to-t from-rose-600 via-pink-500 to-amber-100 scale-110 shadow-rose-500/50" :
          step === 'rabdi' ? "border-amber-400 bg-gradient-to-t from-rose-600 via-amber-300 to-yellow-400 scale-115 shadow-amber-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Falooda Icon */}
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-rose-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🍨</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'malai' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🥛 Kadai Malai Scrape</span>}
            {step === 'sev' && <span className="font-display font-bold text-xs text-yellow-200 block -mt-24">🍜 Falooda Sev Press</span>}
            {step === 'rose' && <span className="font-display font-bold text-xs text-rose-200 block -mt-24">🌹 Rose Sabja Layer</span>}
            {step === 'rabdi' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">👑 Lachha Rabdi Crown</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Rabdi Falooda!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'malai' && (
          <Button
            onClick={handleScrapeKadaiMalai}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer Buffalo Milk & Scrape Golden Malai Lachhas
          </Button>
        )}

        {step === 'sev' && (
          <Button
            onClick={handlePressSevNoodles}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-300 text-black shadow-lg"
          >
            🍜 Step 2: Press Silky Falooda Sev Noodles through Brass Moulds
          </Button>
        )}

        {step === 'rose' && (
          <Button
            onClick={handleLayerRoseSabja}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-rose-600 text-white shadow-lg"
          >
            🌹 Step 3: Layer Fragrant Rose Syrup & Cooling Sabja Seeds
          </Button>
        )}

        {step === 'rabdi' && (
          <Button
            onClick={handleCrownLachhaRabdi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-rose-500 via-amber-400 to-yellow-500 text-black shadow-lg"
          >
            👑 Step 4: Top with Dense Lachhadar Rabdi, Pista & Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewFaloodaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Assemble Next Royal Rabdi Falooda Glass (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
