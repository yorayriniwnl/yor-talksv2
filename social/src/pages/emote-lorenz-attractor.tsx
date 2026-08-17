import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Orbit, Radio, Disc3, Infinity, Wind 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteLorenzAttractorStudio() {
  const [rayleighConvection, setRayleighConvection] = useState(28.0);

  const handleCopyOBSLorenz = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-lorenz-attractor?fps=60&sigma=10&rho=28&beta=2.66&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS 3D Lorenz Attractor URL copied!');
  };

  const handleAccelerateLorenz = (rhoBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setRayleighConvection(r => parseFloat((r + rhoBoost).toFixed(1)));
    toast.success(`🦋 3D LORENZ STRANGE ATTRACTOR RAYLEIGH CONVECTION ACCELERATED TO ${(rayleighConvection + rhoBoost).toFixed(1)} ρ ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Lorenz Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Lorenz Strange Attractor Chaotic Butterfly Nebula Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSLorenz}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Lorenz URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Lorenz HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D LORENZ STRANGE ATTRACTOR BUTTERFLY ORBIT EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400">
              🦋 ρ = {rayleighConvection} Rayleigh
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Dual-Lobe Non-Linear Butterfly Chaotic Paths & Glowing Chat Emote Ingestion on Cheers</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAccelerateLorenz(4.0)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Accelerate +4.0 ρ
            </Button>
            <Button onClick={() => handleAccelerateLorenz(16.0)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-600 text-white shadow-md">
              🦋 Chaotic Butterfly Surge (+16.0 ρ)
            </Button>
            <Button onClick={() => setRayleighConvection(28.0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Stable Attractor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
