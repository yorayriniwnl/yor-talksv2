import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberSohanHalwa() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(27000);
  const [step, setStep] = useState<'germinate' | 'caramel' | 'ghee-roast' | 'disc-mold' | 'served'>('germinate');

  const handleGerminateSamnak = () => {
    if (step !== 'germinate') return;
    sounds.playPop();
    setStep('caramel');
    toast.info('🌾 Germinated whole wheat sprouted samnak flour with rich buffalo milk!');
  };

  const handleCaramelMilk = () => {
    if (step !== 'caramel') return;
    sounds.playPop();
    setStep('ghee-roast');
    toast.info('🔥 Simmered sprouted wheat and sugar into rich dark mahogany caramel!');
  };

  const handleGheeRoastCrunch = () => {
    if (step !== 'ghee-roast') return;
    sounds.playPop();
    setStep('disc-mold');
    toast.info('🧈 Roasted with overflowing desi ghee, saffron & green cardamom into glassy brittle texture!');
  };

  const handleMouldSohanDiscs = () => {
    if (step !== 'disc-mold') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1080;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI SOHAN HALWA DISCS SET & SERVED! (+1080 Pts)');
  };

  const handleNewSohanBatch = () => {
    sounds.playPop();
    setStep('germinate');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 via-amber-800 to-yellow-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Shahi Sohan Halwa Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Samnak Germination, Dark Caramel, Ghee Brittle Roast & Brass Disc Moulds</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Glassy Brittle Crunch</span>
          <span className="font-display font-black text-xl text-amber-300">✨ 100% Desi Ghee</span>
        </div>
      </div>

      {/* Sohan Halwa Disc Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'germinate' ? "border-amber-800 bg-amber-950/40" :
          step === 'caramel' ? "border-amber-700 bg-amber-900/50 scale-105 shadow-amber-700/40" :
          step === 'ghee-roast' ? "border-yellow-600 bg-gradient-to-tr from-amber-950 via-amber-800 to-yellow-600 scale-110 shadow-yellow-600/50" :
          step === 'disc-mold' ? "border-yellow-400 bg-gradient-to-r from-amber-700 via-yellow-500 to-amber-900 scale-115 shadow-yellow-400/60" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Disc Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-300 flex items-center justify-center bg-black/40">
            <span className="text-4xl">🌕</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'germinate' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🌾 Sprouted Samnak Wheat</span>}
            {step === 'caramel' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🔥 Dark Mahogany Caramel</span>}
            {step === 'ghee-roast' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🧈 Desi Ghee Brittle Roast</span>}
            {step === 'disc-mold' && <span className="font-display font-bold text-xs text-amber-200 block -mt-24">🪙 Almond & Pista Disc Mould</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-24">👑 Shahi Sohan Halwa!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'germinate' && (
          <Button
            onClick={handleGerminateSamnak}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🌾 Step 1: Germinate Sprouted Wheat Samnak Flour with Milk
          </Button>
        )}

        {step === 'caramel' && (
          <Button
            onClick={handleCaramelMilk}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-700 text-white shadow-lg"
          >
            🔥 Step 2: Simmer Wheat Milk into Dark Mahogany Caramel
          </Button>
        )}

        {step === 'ghee-roast' && (
          <Button
            onClick={handleGheeRoastCrunch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-900 text-yellow-200 shadow-lg"
          >
            🧈 Step 3: Roast with Desi Ghee & Saffron into Glassy Brittle Texture
          </Button>
        )}

        {step === 'disc-mold' && (
          <Button
            onClick={handleMouldSohanDiscs}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-white shadow-lg"
          >
            🪙 Step 4: Pour into Disc Moulds & Top with Slivered Almonds & Pistas
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewSohanBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Cook Next Shahi Sohan Halwa Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
