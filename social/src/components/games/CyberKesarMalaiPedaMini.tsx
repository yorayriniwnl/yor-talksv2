import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, CheckCircle2, Utensils, Star, Flame, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function CyberKesarMalaiPedaMini() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(78000);
  const [step, setStep] = useState<'simmer-danedar-mawa' | 'infuse-bloomed-kesar' | 'roll-golden-spheres' | 'emboss-floral-wooden-seal' | 'served'>('simmer-danedar-mawa');

  const handleSimmerDanedarMawa = () => {
    if (step !== 'simmer-danedar-mawa') return;
    sounds.playPop();
    setStep('infuse-bloomed-kesar');
    toast.info('🥛 Simmered pure cow milk into rich danedar mawa in copper lagan!');
  };

  const handleInfuseBloomedKesar = () => {
    if (step !== 'infuse-bloomed-kesar') return;
    sounds.playPop();
    setStep('roll-golden-spheres');
    toast.info('🌸 Infused milk-bloomed Kashmiri Mongra saffron threads & green cardamom!');
  };

  const handleRollGoldenSpheres = () => {
    if (step !== 'roll-golden-spheres') return;
    sounds.playPop();
    setStep('emboss-floral-wooden-seal');
    toast.info('🟡 Hand-rolled warm golden saffron mawa into smooth spherical pedas!');
  };

  const handleEmbossFloralWoodenSeal = () => {
    if (step !== 'emboss-floral-wooden-seal') return;
    sounds.playChime();
    triggerConfetti();
    setStep('served');
    setScore((s) => {
      const nextScore = s + 1700;
      if (nextScore > highScore) setHighScore(nextScore);
      return nextScore;
    });
    toast.success('👑 ROYAL SHAHI KESAR MALAI PEDA SERVED FRESH! (+1700 Pts)');
  };

  const handleNewPedaBatch = () => {
    sounds.playPop();
    setStep('simmer-danedar-mawa');
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
              Cyber Kesar Malai Peda Arcade
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Danedar Mawa Simmer, Bloomed Kesar Infusion, Sphere Rolling & Wooden Seal</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Braj Score</span>
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
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Kesar Bloom Density</span>
          <span className="font-display font-black text-xl text-amber-400">✨ 100% Mongra</span>
        </div>
      </div>

      {/* Peda Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 flex flex-col items-center justify-center p-6 text-center select-none">
        <div className={cn(
          "w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-2xl relative",
          step === 'simmer-danedar-mawa' ? "border-amber-200 bg-amber-200/10" :
          step === 'infuse-bloomed-kesar' ? "border-yellow-400 bg-yellow-400/20 scale-105 shadow-yellow-400/40" :
          step === 'roll-golden-spheres' ? "border-amber-500 bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-600 scale-110 shadow-amber-500/50" :
          step === 'emboss-floral-wooden-seal' ? "border-yellow-300 bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-500 scale-115 shadow-yellow-300/60" :
          "border-amber-400 bg-amber-400/20 scale-110"
        )}>
          {/* Peda Icon */}
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-400 flex items-center justify-center bg-black/40">
            <span className="text-3xl">🫓</span>
          </div>

          <div className="absolute text-center pointer-events-none">
            {step === 'simmer-danedar-mawa' && <span className="font-mono text-[0.65rem] text-amber-200 block -mt-24">🥛 Danedar Mawa Khoya</span>}
            {step === 'infuse-bloomed-kesar' && <span className="font-display font-bold text-xs text-yellow-300 block -mt-24">🌸 Bloomed Mongra Kesar</span>}
            {step === 'roll-golden-spheres' && <span className="font-display font-bold text-xs text-amber-300 block -mt-24">🟡 Hand-Rolled Golden Sphere</span>}
            {step === 'emboss-floral-wooden-seal' && <span className="font-display font-bold text-xs text-amber-100 block -mt-24">👑 Embossed Floral Wooden Seal</span>}
            {step === 'served' && <span className="font-display font-bold text-xs text-amber-400 block -mt-24">👑 Shahi Kesar Malai Peda!</span>}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 gap-2">
        {step === 'simmer-danedar-mawa' && (
          <Button
            onClick={handleSimmerDanedarMawa}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥛 Step 1: Simmer Cow Milk into Rich Danedar Mawa
          </Button>
        )}

        {step === 'infuse-bloomed-kesar' && (
          <Button
            onClick={handleInfuseBloomedKesar}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-yellow-500 text-black shadow-lg"
          >
            🌸 Step 2: Infuse Milk-Bloomed Kashmiri Mongra Saffron
          </Button>
        )}

        {step === 'roll-golden-spheres' && (
          <Button
            onClick={handleRollGoldenSpheres}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-amber-600 text-white shadow-lg"
          >
            🟡 Step 3: Hand-Roll Golden Saffron Mawa Spheres
          </Button>
        )}

        {step === 'emboss-floral-wooden-seal' && (
          <Button
            onClick={handleEmbossFloralWoodenSeal}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black shadow-lg"
          >
            👑 Step 4: Stamp Floral Wooden Seal & Pistachio Garnish
          </Button>
        )}

        {step === 'served' && (
          <Button
            onClick={handleNewPedaBatch}
            className="rounded-2xl h-12 text-xs font-bold font-mono bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🔄 Make Next Kesar Peda Batch (+Score)
          </Button>
        )}
      </div>
    </div>
  );
}
