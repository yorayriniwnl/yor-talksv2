import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Globe, Orbit, Radio 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteHypersphereVortexStudio() {
  const [hopfFiberVelocity, setHopfFiberVelocity] = useState(5.4);

  const handleCopyOBSHypersphere = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-hypersphere-vortex?fps=60&hopf=5.4&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS 4D Hypersphere Vortex URL copied!');
  };

  const handleAccelerateHypersphere = (fiberBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setHopfFiberVelocity(v => parseFloat((v + fiberBoost).toFixed(1)));
    toast.success(`🌐 4D HYPERSPHERE HOPF FIBER VELOCITY ACCELERATED TO ${(hopfFiberVelocity + fiberBoost).toFixed(1)}c ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Hypersphere Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 4D Hyperspherical Hopf Fibration Particle Vortex Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSHypersphere}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Hypersphere URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Hypersphere HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 4D HOPF FIBRATION HYPERSPHERICAL VORTEX EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
              🌐 {hopfFiberVelocity}c Hopf Velocity
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Riemannian 4-Sphere Coordinate Projections & Glowing Emotes on Chat Cheers</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAccelerateHypersphere(0.6)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Accelerate +0.6c
            </Button>
            <Button onClick={() => handleAccelerateHypersphere(2.4)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-400 via-teal-500 to-indigo-600 text-white shadow-md">
              🌐 4D Hopf Vortex Surge (+2.4c)
            </Button>
            <Button onClick={() => setHopfFiberVelocity(3.0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Stable Sphere
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
