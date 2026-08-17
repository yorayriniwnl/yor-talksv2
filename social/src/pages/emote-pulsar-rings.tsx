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

export default function EmotePulsarRingsStudio() {
  const [rings, setRings] = useState(84);

  const handleCopyOBSPulsarRings = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-pulsar-rings?fps=60&shockwave=true&plasma=active`);
    toast.success('📋 OBS Studio Transparent 60FPS Pulsar Shockwave Rings URL copied!');
  };

  const handleEmitPulsarRings = (ringCount: number) => {
    sounds.playChime();
    triggerConfetti();
    setRings(r => r + ringCount);
    toast.success(`💫 ${ringCount}x 3D CONCENTRIC NEON PULSAR SHOCKWAVES DETONATED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-500 to-emerald-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Orbit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Pulsar Rings Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Radial Shockwave Rings, Neon Plasma Resonance & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSPulsarRings}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Pulsar URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Pulsar HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D RADIAL PULSAR NEON PLASMA SHOCKWAVE EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              💫 {rings} Pulsar Rings
            </h2>
            <p className="font-mono text-xs text-muted-foreground">High-Velocity Concentric Acoustic Neon Waves on Superchats & Subathons</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleEmitPulsarRings(12)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Emit 12x Shockwave Rings
            </Button>
            <Button onClick={() => handleEmitPulsarRings(48)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-black shadow-md">
              💫 48x Plasma Shockwave Surge
            </Button>
            <Button onClick={() => setRings(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Mute Pulsar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
