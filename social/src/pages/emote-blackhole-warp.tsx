import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Orbit, Disc, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteBlackHoleWarpStudio() {
  const [singularityMass, setSingularityMass] = useState(48);

  const handleCopyOBSBlackHoleWarp = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-blackhole-warp?fps=60&gravitational_lens=active&singularity=48M`);
    toast.success('📋 OBS Studio Transparent 60FPS Black Hole Singularity URL copied!');
  };

  const handleEmitCosmicWarp = (massMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setSingularityMass(m => m + (massMulti * 8));
    toast.success(`🌌 ${massMulti * 8}M SOLAR MASSES DRAWN INTO 3D COSMIC ACCRETION DISK!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-700 to-purple-900 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Orbit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Black Hole Warp Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Event Horizon Singularity, Gravitational Lensing & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSBlackHoleWarp}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Singularity URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Black Hole HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D GRAVITATIONAL ACCRETION DISK EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-violet-400">🌌 {singularityMass}M Solar Mass</h2>
            <p className="font-mono text-xs text-muted-foreground">Relativistic Plasma Jets & Gravitational Lensing Vortex on Superchats</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleEmitCosmicWarp(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Ignite 8M Solar Mass Warp
            </Button>
            <Button onClick={() => handleEmitCosmicWarp(4)} className="rounded-2xl font-bold text-xs bg-violet-600 text-white shadow-md">
              🌌 32M Supermassive Ejection
            </Button>
            <Button onClick={() => setSingularityMass(10)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Event Horizon
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
