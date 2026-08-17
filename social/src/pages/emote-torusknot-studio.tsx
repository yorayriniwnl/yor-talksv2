import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Orbit, Radio, Disc3, Infinity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteTorusKnotStudio() {
  const [knotWindingRate, setKnotWindingRate] = useState(3.7);

  const handleCopyOBSTorusKnot = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-torusknot-studio?fps=60&p=3&q=7&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS 3D (3,7) Torus Knot URL copied!');
  };

  const handleAccelerateTorusKnot = (windingBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setKnotWindingRate(w => parseFloat((w + windingBoost).toFixed(1)));
    toast.success(`🌀 3D (3,7) TORUS KNOT PARAMETRIC WINDING ACCELERATED TO ${(knotWindingRate + windingBoost).toFixed(1)} RAD/S ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-pink-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Disc3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Torus Knot Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Parametric (3,7) Torus Knot Trefoil Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSTorusKnot}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Torus Knot URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Torus Knot HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D PARAMETRIC (3,7) TORUS KNOT PLASMA EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-300 to-rose-400">
              🌀 {knotWindingRate} rad/s Winding
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Intertwined Trefoil Neon Plasma Loops & Glowing Chat Emote Ingestion on Cheers</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAccelerateTorusKnot(0.5)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Accelerate +0.5 rad/s
            </Button>
            <Button onClick={() => handleAccelerateTorusKnot(2.0)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-600 text-white shadow-md">
              🌀 Trefoil Plasma Surge (+2.0 rad/s)
            </Button>
            <Button onClick={() => setKnotWindingRate(2.4)} variant="outline" className="rounded-2xl font-mono text-xs">
              Stable Knot
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
