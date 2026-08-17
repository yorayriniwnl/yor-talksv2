import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKhurchan() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(60000);
  const [step, setStep] = useState<'simmer-tawa-milk' | 'scrape-khurchan-layers' | 'layer-cardamom-pista' | 'roll-tender-khurchan' | 'served'>('simmer-tawa-milk');

  const handleSimmerTawaMilk = () => {
    if (step !== 'simmer-tawa-milk') return;
    sounds.playPop();
    setStep('scrape-khurchan-layers');
    toast.info('🥛 Simmered full-cream buffalo milk in shallow iron karahi over slow charcoal flame!');
  };

  const handleScrapeKhurchanLayers = () => {
    if (step !== 'scrape-khurchan-layers') return;
    sounds.playPop();
    setStep('layer-cardamom-pista');
    toast.info('🥄 Scraped paper-thin caramelized malai cream crusts (khurchan) to the cool rim of the tawa!');
  };

  const handleLayerCardamomPista = () => {
    if (step !== 'layer-cardamom-pista') return;
    sounds.playPop();
    setStep('roll-tender-khurchan');
    toast.info('🌱 Layered aromatic green cardamom powder, organic sugar syrup & slivered pistachios!');
  };

  const handleRollTenderKhurchan = () => {
    if (step !== 'roll-tender-khurchan') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1500;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI MATHURA KHURCHAN SERVED FRESH! (+1500 Pts)');
  };

  const handleNewKhurchanBatch = () => {
    sounds.playPop();
    setStep('simmer-tawa-milk');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-300 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Khurchan Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Simmered Karahi Malai, Scraped Khurchan Crust, Green Cardamom & Tender Roll</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Caramelization</span>
          <span className="font-display font-black text-xl text-amber-500">✨ 100% Golden</span>
        </div>
      </div>

      {/* Khurchan Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer-tawa-milk' ? "border-amber-100 bg-amber-100/10" :
          step === 'scrape-khurchan-layers' ? "border-amber-500 bg-amber-500/20 scale-105 shadow-amber-500/40" :
          step === 'layer-cardamom-pista' ? "border-green-400 bg-gradient-to-tr from-amber-400 via-green-400 to-amber-600 scale-110 shadow-green-400/50" :
          step === 'roll-tender-khurchan' ? "border-amber-200 bg-gradient-to-r from-amber-400 via-yellow-200 to-orange-400 scale-115 shadow-amber-200/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Khurchan Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🫓</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer-tawa-milk' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-24">🥛 Slow Karahi Simmer</span>}
            {step === 'scrape-khurchan-layers' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🥄 Scraped Malai Crusts</span>}
            {step === 'layer-cardamom-pista' && <span className="font-display font-bold text-xs text-green-300 block -mt-24">🌱 Cardamom & Pista Dust</span>}
            {step === 'roll-tender-khurchan' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Tender Khurchan Roll</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Mathura Khurchan!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer-tawa-milk' && (
          <Button
            onClick={handleSimmerTawaMilk}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer Buffalo Milk in Shallow Iron Karahi
          </Button>
        )}

        {step === 'scrape-khurchan-layers' && (
          <Button
            onClick={handleScrapeKhurchanLayers}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🥄 Step 2: Scrape Malai Crusts (Khurchan) to Karahi Rim
          </Button>
        )}

        {step === 'layer-cardamom-pista' && (
          <Button
            onClick={handleLayerCardamomPista}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-green-600 text-white shadow-lg"
          >
            🌱 Step 3: Layer Cardamom, Saffron Syrup & Crushed Pistachios
          </Button>
        )}

        {step === 'roll-tender-khurchan' && (
          <Button
            onClick={handleRollTenderKhurchan}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 text-black shadow-lg"
          >
            👑 Step 4: Roll Tender Sweet Khurchan & Garnish with Rose Petals
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewKhurchanBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Khurchan Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
