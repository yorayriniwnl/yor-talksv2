import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKesarChumChum() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(39000);
  const [step, setStep] = useState<'knead-kesar-chena' | 'boil-amber-syrup' | 'stuff-malai-mawa' | 'coconut-garnish' | 'served'>('knead-kesar-chena');

  const handleKneadKesarChena = () => {
    if (step !== 'knead-kesar-chena') return;
    sounds.playPop();
    setStep('boil-amber-syrup');
    toast.info('🥛 Kneaded fresh cow milk chena with Kashmiri saffron threads into cylindrical ovals!');
  };

  const handleBoilAmberSyrup = () => {
    if (step !== 'boil-amber-syrup') return;
    sounds.playPop();
    setStep('stuff-malai-mawa');
    toast.info('🍯 Boiled chena cylinders in aromatic saffron cardamom syrup until spongy and golden!');
  };

  const handleStuffMalaiMawa = () => {
    if (step !== 'stuff-malai-mawa') return;
    sounds.playPop();
    setStep('coconut-garnish');
    toast.info('✨ Slit golden chum chums and stuffed with sweet malai mawa & pistachio paste!');
  };

  const handleCoconutPistaGarnish = () => {
    if (step !== 'coconut-garnish') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1240;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SAFFRON MALAI CHUM CHUM GARNISHED & SERVED! (+1240 Pts)');
  };

  const handleNewChumChumBatch = () => {
    sounds.playPop();
    setStep('knead-kesar-chena');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Kesar Malai Chum Chum Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Saffron Chena Ovals, Mawa Stuffing, Cardamom Syrup & Coconut</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kesar Mawa Quality</span>
          <span className="font-display font-black text-xl text-yellow-400">✨ 100% Royal Sponge</span>
        </div>
      </div>

      {/* Chum Chum Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'knead-kesar-chena' ? "border-yellow-200 bg-yellow-100/10" :
          step === 'boil-amber-syrup' ? "border-amber-400 bg-amber-400/20 scale-105 shadow-amber-400/40" :
          step === 'stuff-malai-mawa' ? "border-yellow-300 bg-gradient-to-tr from-yellow-300 via-amber-400 to-yellow-500 scale-110 shadow-yellow-300/50" :
          step === 'coconut-garnish' ? "border-slate-100 bg-gradient-to-r from-yellow-200 via-white to-amber-300 scale-115 shadow-yellow-200/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Chum Chum Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-yellow-300 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🪷</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'knead-kesar-chena' && <span className="font-mono text-[0.65rem] text-yellow-200 block -mt-24">🥛 Saffron Chena Ovals</span>}
            {step === 'boil-amber-syrup' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">🍯 Boiled Amber Syrup</span>}
            {step === 'stuff-malai-mawa' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">✨ Malai Mawa Core</span>}
            {step === 'coconut-garnish' && <span className="font-display font-bold text-xs text-slate-100 block -mt-24">🥥 Desiccated Coconut Dust</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Kesar Malai Chum Chum!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'knead-kesar-chena' && (
          <Button
            onClick={handleKneadKesarChena}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Knead Soft Chena with Kashmiri Saffron Strands
          </Button>
        )}

        {step === 'boil-amber-syrup' && (
          <Button
            onClick={handleBoilAmberSyrup}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🍯 Step 2: Boil Cylinders in Hot Saffron Cardamom Chashni
          </Button>
        )}

        {step === 'stuff-malai-mawa' && (
          <Button
            onClick={handleStuffMalaiMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-400 text-black shadow-lg"
          >
            ✨ Step 3: Slit Sponges & Stuff with Sweet Malai Mawa Khoya
          </Button>
        )}

        {step === 'coconut-garnish' && (
          <Button
            onClick={handleCoconutPistaGarnish}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 text-black shadow-lg"
          >
            🥥 Step 4: Roll in Coconut Dust & Garnish with Pistachios
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewChumChumBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Kesar Malai Chum Chum Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
