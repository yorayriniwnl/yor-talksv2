import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMoongHalwaRoyal() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(94500);
  const [step, setStep] = useState<'grind-coarse-dal' | 'slow-ghee-roast' | 'infuse-kesar-milk' | 'garnish-badam-gold' | 'served'>('grind-coarse-dal');

  const handleGrindCoarseDal = () => {
    if (step !== 'grind-coarse-dal') return;
    sounds.playPop();
    setStep('slow-ghee-roast');
    toast.info('🌾 Soaked split yellow moong dal and ground into perfect coarse dardara paste!');
  };

  const handleSlowGheeRoast = () => {
    if (step !== 'slow-ghee-roast') return;
    sounds.playPop();
    setStep('infuse-kesar-milk');
    toast.info('🔥 Slow-roasted continuously in bubbling pure desi cow ghee until amber-golden aromatic sheen!');
  };

  const handleInfuseKesarMilk = () => {
    if (step !== 'infuse-kesar-milk') return;
    sounds.playPop();
    setStep('garnish-badam-gold');
    toast.info('🌸 Poured steaming saffron-cardamom whole milk & single-string khandsari chashni!');
  };

  const handleGarnishBadamGold = () => {
    if (step !== 'garnish-badam-gold') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 2150;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI MOONG DAL HALWA SERVED FRESH! (+2150 Pts)');
  };

  const handleNewHalwaBatch = () => {
    sounds.playPop();
    setStep('grind-coarse-dal');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
              Mewari Shahi Moong Dal Halwa Royal
            </h2>
            <p className="text-xs text-muted-foreground">
              Heritage Rajasthani Royal Halwai Confectioner Simulation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
              Score
            </span>
            <span className="text-lg font-black text-primary">{score}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
              High
            </span>
            <span className="text-lg font-black text-amber-500">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative aspect-video rounded-2xl bg-gradient-to-b from-stone-950/80 to-amber-950/30 border border-amber-500/20 p-6 flex flex-col items-center justify-center text-center overflow-hidden mb-6">
        <AnimatePresence mode="wait">
          {step === 'grind-coarse-dal' && (
            <motion.div
              key="grind-coarse-dal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3 animate-pulse">
                <Utensils className="w-10 h-10 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-amber-300 mb-1">Step 1: Grind Coarse Dardara Dal</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Soak golden yellow split moong dal for 6 hours and stone-grind to coarse granular texture for authentic mouthfeel.
              </p>
              <Button
                onClick={handleGrindCoarseDal}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-stone-950 font-bold shadow-lg shadow-amber-500/25 gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> Stone Grind Dal Paste
              </Button>
            </motion.div>
          )}

          {step === 'slow-ghee-roast' && (
            <motion.div
              key="slow-ghee-roast"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mb-3">
                <Flame className="w-10 h-10 text-orange-400 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-orange-300 mb-1">Step 2: Slow Desi Ghee Bhunai</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Slowly roast the coarse moong paste in simmering pure A2 cow ghee on heavy-bottom brass kadhai until deep nutty aroma & golden sheen.
              </p>
              <Button
                onClick={handleSlowGheeRoast}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-stone-950 font-bold shadow-lg shadow-orange-500/25 gap-2"
              >
                <Flame className="w-4 h-4 fill-current" /> Slow Roast in Desi Ghee
              </Button>
            </motion.div>
          )}

          {step === 'infuse-kesar-milk' && (
            <motion.div
              key="infuse-kesar-milk"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mb-3">
                <Sparkles className="w-10 h-10 text-yellow-400 animate-spin" />
              </div>
              <h3 className="text-lg font-bold text-yellow-300 mb-1">Step 3: Infuse Royal Saffron Milk & Chashni</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Gradually pour hot full-cream milk steeped with Kashmiri saffron threads, cardamom powder & warm single-string khandsari syrup.
              </p>
              <Button
                onClick={handleInfuseKesarMilk}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-stone-950 font-bold shadow-lg shadow-yellow-500/25 gap-2"
              >
                <Sparkles className="w-4 h-4" /> Infuse Saffron & Chashni
              </Button>
            </motion.div>
          )}

          {step === 'garnish-badam-gold' && (
            <motion.div
              key="garnish-badam-gold"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
                <Crown className="w-10 h-10 text-emerald-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-emerald-300 mb-1">Step 4: Shahi Badam Pista & 24K Gold Vark</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Garnish with slivered Mamra almonds, Iranian green pistachios, fragrant dried rose petals, and delicate 24K edible gold leaf.
              </p>
              <Button
                onClick={handleGarnishBadamGold}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-stone-950 font-bold shadow-lg shadow-emerald-500/25 gap-2"
              >
                <Star className="w-4 h-4 fill-current" /> Crown with 24K Gold Vark
              </Button>
            </motion.div>
          )}

          {step === 'served' && (
            <motion.div
              key="served"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center mb-3 text-stone-950 shadow-xl shadow-amber-500/30">
                <Trophy className="w-10 h-10 fill-current" />
              </div>
              <h3 className="text-xl font-black text-amber-300 mb-1">Mewari Shahi Moong Dal Halwa Ready!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Decadent, rich, slow-cooked royal halwa served warm in a traditional silver handi (+2150 Points).
              </p>
              <Button
                onClick={handleNewHalwaBatch}
                variant="outline"
                className="border-amber-500/40 hover:bg-amber-500/10 text-amber-300 gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Prepare Next Royal Batch
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Culinary Step Progress Badges */}
      <div className="grid grid-cols-4 gap-2">
        <div
          className={cn(
            'p-2.5 rounded-xl border text-center transition-all',
            step === 'grind-coarse-dal'
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-sm'
              : 'bg-stone-900/40 border-stone-800 text-muted-foreground'
          )}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block">1. Dal Grind</span>
          <span className="text-xs font-semibold">Coarse Paste</span>
        </div>
        <div
          className={cn(
            'p-2.5 rounded-xl border text-center transition-all',
            step === 'slow-ghee-roast'
              ? 'bg-orange-500/10 border-orange-500/50 text-orange-400 shadow-sm'
              : ['infuse-kesar-milk', 'garnish-badam-gold', 'served'].includes(step)
              ? 'bg-stone-900/40 border-stone-800 text-muted-foreground'
              : 'bg-stone-900/20 border-transparent text-stone-600'
          )}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block">2. Ghee Bhunai</span>
          <span className="text-xs font-semibold">Amber Sheen</span>
        </div>
        <div
          className={cn(
            'p-2.5 rounded-xl border text-center transition-all',
            step === 'infuse-kesar-milk'
              ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400 shadow-sm'
              : ['garnish-badam-gold', 'served'].includes(step)
              ? 'bg-stone-900/40 border-stone-800 text-muted-foreground'
              : 'bg-stone-900/20 border-transparent text-stone-600'
          )}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block">3. Kesar Infusion</span>
          <span className="text-xs font-semibold">Single String</span>
        </div>
        <div
          className={cn(
            'p-2.5 rounded-xl border text-center transition-all',
            step === 'garnish-badam-gold' || step === 'served'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-sm'
              : 'bg-stone-900/20 border-transparent text-stone-600'
          )}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block">4. Royal Crown</span>
          <span className="text-xs font-semibold">24K Gold Vark</span>
        </div>
      </div>
    </div>
  );
}
export default CyberMoongHalwaRoyal;
