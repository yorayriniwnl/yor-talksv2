import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, Flame, Sparkles, CheckCircle2, 
  Share2, RotateCcw, Heart, Award, Droplets, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function ChaiSimulator() {
  const [teaLeaf, setTeaLeaf] = useState<'assam' | 'darjeeling'>('assam');
  const [ginger, setGinger] = useState(true);
  const [cardamom, setCardamom] = useState(true);
  const [clove, setClove] = useState(false);
  const [cinnamon, setCinnamon] = useState(false);
  const [boilProgress, setBoilProgress] = useState(0);
  const [isBrewing, setIsBrewing] = useState(false);
  const [isBrewed, setIsBrewed] = useState(false);

  const startBrew = () => {
    sounds.playPop();
    setIsBrewing(true);
    setIsBrewed(false);
    setBoilProgress(0);

    const interval = setInterval(() => {
      setBoilProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBrewing(false);
          setIsBrewed(true);
          sounds.playChime();
          triggerConfetti();
          toast.success('☕ Kadak Desi Masala Chai Brewed to Perfection in Terracotta Kullad! +150 Karma Pts.');
          return 100;
        }
        return prev + 20;
      });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Chai Stall & Kullad Brew Simulator</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Assam CTC Leaves, Fresh Adrak & Elaichi Aroma Simulation</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tapri Quality: 100% Kadak
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Brew Configurator Column */}
          <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-5 shadow-xl font-sans">
            <div className="showcase-section-title">
              <Flame className="w-4 h-4 text-orange-500" />
              <h3>Customize Chai Blend</h3>
            </div>

            {/* Tea Leaf Selection */}
            <div>
              <span className="text-[0.65rem] font-mono uppercase text-muted-foreground block mb-2">Base Tea Leaves:</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    sounds.playPop();
                    setTeaLeaf('assam');
                  }}
                  variant={teaLeaf === 'assam' ? 'default' : 'outline'}
                  className={cn("rounded-2xl text-xs font-bold font-mono h-10", teaLeaf === 'assam' && "bg-amber-600 text-white")}
                >
                  Assam CTC Strong 🌿
                </Button>
                <Button
                  onClick={() => {
                    sounds.playPop();
                    setTeaLeaf('darjeeling');
                  }}
                  variant={teaLeaf === 'darjeeling' ? 'default' : 'outline'}
                  className={cn("rounded-2xl text-xs font-bold font-mono h-10", teaLeaf === 'darjeeling' && "bg-amber-600 text-white")}
                >
                  Darjeeling Gold 🍂
                </Button>
              </div>
            </div>

            {/* Spices */}
            <div>
              <span className="text-[0.65rem] font-mono uppercase text-muted-foreground block mb-2">Masala Infusions:</span>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                {[
                  { label: 'Fresh Ginger (Adrak) 🫚', active: ginger, toggle: () => setGinger(!ginger) },
                  { label: 'Green Cardamom (Elaichi) 🟢', active: cardamom, toggle: () => setCardamom(!cardamom) },
                  { label: 'Clove (Laung) 🌰', active: clove, toggle: () => setClove(!clove) },
                  { label: 'Cinnamon (Dalchini) 🪵', active: cinnamon, toggle: () => setCinnamon(!cinnamon) },
                ].map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      sounds.playPop();
                      s.toggle();
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-left font-bold transition-all",
                      s.active ? "bg-primary/20 border-primary text-primary" : "surface-1 hover:bg-muted/40 text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              disabled={isBrewing}
              onClick={startBrew}
              className="w-full rounded-2xl font-bold text-xs h-12 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black shadow-lg glow-neon-primary"
            >
              {isBrewing ? `Boiling Chai (${boilProgress}%)...` : '🔥 Brew Kadak Kullad Chai'}
            </Button>
          </div>

          {/* Brewing Pot & Kullad Visualizer Column */}
          <div className="surface-1 p-6 rounded-3xl border border-border/40 flex flex-col items-center justify-center text-center shadow-xl space-y-6">
            <div className="w-32 h-32 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-5xl border-2 border-amber-500/40 shadow-inner relative">
              ☕
              {isBrewing && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-1 animate-bounce">
                  <span className="text-xs">♨️</span>
                  <span className="text-xs">♨️</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-black text-xl text-foreground">
                {isBrewed ? 'Kadak Masala Chai Ready!' : isBrewing ? 'Simmering Spices...' : 'Tapri Chai Pot Idle'}
              </h3>
              <p className="text-xs font-mono text-muted-foreground">
                {isBrewed ? 'Poured into earthy terracotta Kullad' : 'Click Brew to simmer and extract aromatic oils'}
              </p>
            </div>

            {isBrewed && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-border/40 font-mono text-xs w-full max-w-xs text-left space-y-1.5">
                <span className="text-emerald-400 font-bold block">✨ Brew Telemetry:</span>
                <span className="text-muted-foreground block">&middot; Temp: 98.4°C Full Boil</span>
                <span className="text-muted-foreground block">&middot; Aroma Index: 9.8/10 (Pure Elaichi)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
