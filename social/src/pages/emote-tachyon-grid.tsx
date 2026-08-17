import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Grid, Orbit, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteTachyonGridStudio() {
  const [tachyonFlux, setTachyonFlux] = useState(99);

  const handleCopyOBSTachyonGrid = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-tachyon-grid?fps=60&particles=1024&flux=true`);
    toast.success('📋 OBS Studio Transparent 60FPS 3D Tachyon Grid URL copied!');
  };

  const handleSurgeTachyons = (fluxBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setTachyonFlux(f => f + fluxBoost);
    toast.success(`⚡ 3D SUPERLUMINAL TACHYON FLUX SURGED TO ${tachyonFlux + fluxBoost} TERA-FLUX ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Tachyon Grid Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Superluminal Tachyon Particle Warp Grid Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSTachyonGrid}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Tachyon URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Tachyon HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D SUPERLUMINAL TACHYON PARTICLE GRID EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400">
              ⚡ {tachyonFlux} Tera-Flux Density
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Faster-Than-Light Kinetic Particle Streaks & Chromatic Pulses on Chat Cheers</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleSurgeTachyons(25)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Surge +25 Flux
            </Button>
            <Button onClick={() => handleSurgeTachyons(100)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-black shadow-md">
              ⚡ Warp Singularity (+100 Flux)
            </Button>
            <Button onClick={() => setTachyonFlux(50)} variant="outline" className="rounded-2xl font-mono text-xs">
              Stable Grid
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
