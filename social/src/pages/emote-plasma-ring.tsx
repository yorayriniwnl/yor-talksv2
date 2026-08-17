import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Orbit, Radio, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmotePlasmaRingStudio() {
  const [plasmaFluxRate, setPlasmaFluxRate] = useState(8.2);

  const handleCopyOBSPlasmaRing = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-plasma-ring?fps=60&flux=8.2&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS Hyper-Toroidal Plasma Ring URL copied!');
  };

  const handleAcceleratePlasmaRing = (fluxBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setPlasmaFluxRate(f => parseFloat((f + fluxBoost).toFixed(1)));
    toast.success(`⚡ HYPER-TOROIDAL PLASMA MAGNETIC FLUX ACCELERATED TO ${(plasmaFluxRate + fluxBoost).toFixed(1)} TESLA ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Plasma Ring Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Hyper-Toroidal Magnetic Flux Plasma Shockwave Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSPlasmaRing}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Plasma Ring URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Plasma Ring HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D HYPER-TOROIDAL PLASMA MAGNETIC SHOCKWAVE EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
              ⚡ {plasmaFluxRate} Tesla Flux Density
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Toroidal Magnetic Arcs & Glowing Chat Emote Ingestion on Cheers</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAcceleratePlasmaRing(1.2)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Accelerate +1.2 T
            </Button>
            <Button onClick={() => handleAcceleratePlasmaRing(4.5)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white shadow-md">
              ⚡ Hyper-Plasma Surge (+4.5 T)
            </Button>
            <Button onClick={() => setPlasmaFluxRate(5.0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Stable Plasma Ring
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
