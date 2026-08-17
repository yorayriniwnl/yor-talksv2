import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberMalpua() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(13200);
  const [step, setStep] = useState<'batter' | 'fry' | 'chashni' | 'rabdi' | 'served'>('batter');

  const handleWhiskMawaBatter = () => {
    if (step !== 'batter') return;
    sounds.playPop();
    setStep('fry');
    toast.info('🥞 Rich mawa, milk, and aromatic fennel (saunf) whisked into silky pancake batter!');
  };

  const handleCrispyEdgeGheeFry = () => {
    if (step !== 'fry') return;
    sounds.playPop();
    setStep('chashni');
    toast.info('🔥 Shallow-fried in desi ghee until lacy edges turn golden-crisp with soft center!');
  };

  const handleDunkWarmChashni = () => {
    if (step !== 'chashni') return;
    sounds.playChime();
    setStep('rabdi');
    toast.info('🍯 Dunked in warm cardamom saffron chashni until juicy and syrup-infused!');
  };

  const handleTopShahiRabdi = () => {
    if (step !== 'rabdi') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 750;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 SHAHI MALPUA TOPPED WITH THICK CHILLED RABDI & SILVER VARK (+750 Pts)');
  };

  const handleNewMalpua = () => {
    sounds.playPop();
    setStep('batter');
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Malpua Rabdi Shahi Halwai Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Mawa Saunf Batter, Lace-Edged Ghee Fry, Chashni & Thick Rabdi</p>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Crispy Lace Texture</span>
          <span className="font-display font-black text-xl text-amber-500">✨ 100% Shahi Rabdi Dip</span>
        </div>
      </div>

      {/* Malpua Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-44 h-44 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'batter' ? "border-amber-100 bg-amber-50/10" :
          step === 'fry' ? "border-amber-500 bg-gradient-to-tr from-amber-600 to-yellow-600 scale-105 shadow-amber-600/50" :
          step === 'chashni' ? "border-amber-400 bg-gradient-to-tr from-amber-400 via-yellow-400 to-orange-400 scale-110 shadow-yellow-400/60" :
          step === 'rabdi' ? "border-yellow-200 bg-yellow-100/30 scale-115 shadow-yellow-200/50" :
          "border-emerald-500 bg-emerald-500/20 scale-110"
        )}>
          {/* Lace Edged Pancake Center */}
          <div className="w-28 h-28 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center bg-black/20">
            <span className="text-2xl">🥞</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'batter' && <span className="font-mono text-[0.65rem] text-amber-100 block -mt-20">🥞 Mawa Batter</span>}
            {step === 'fry' && <span className="font-display font-bold text-xs text-amber-200 block -mt-20">🔥 Lace Ghee Fry</span>}
            {step === 'chashni' && <span className="font-display font-bold text-xs text-black block -mt-20">🍯 Chashni Dip</span>}
            {step === 'rabdi' && <span className="font-display font-bold text-xs text-yellow-100 block -mt-20">🥛 Shahi Rabdi</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-emerald-400 block -mt-20">👑 Royal Malpua!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'batter' && (
          <Button
            onClick={handleWhiskMawaBatter}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥞 Step 1: Whisk Mawa, Saunf & Milk Pancake Batter
          </Button>
        )}

        {step === 'fry' && (
          <Button
            onClick={handleCrispyEdgeGheeFry}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🔥 Step 2: Shallow-Fry Lace Edges in Hot Desi Ghee
          </Button>
        )}

        {step === 'chashni' && (
          <Button
            onClick={handleDunkWarmChashni}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-500 text-black shadow-lg"
          >
            🍯 Step 3: Dunk in Warm Cardamom Saffron Syrup
          </Button>
        )}

        {step === 'rabdi' && (
          <Button
            onClick={handleTopShahiRabdi}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-black shadow-lg"
          >
            🥛 Step 4: Top with Thick Chilled Rabdi & Silver Vark
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewMalpua}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Fry Next Shahi Malpua Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
