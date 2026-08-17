import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Orbit, Radio, Disc3, Infinity, Atom, Layers, Waves, Disc 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteIkedaMapStudio() {
  const [resonatorParam, setResonatorParam] = useState(0.9);

  const handleCopyOBSIkeda = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-ikeda-map?fps=60&u=0.9&phi=0.4&c1=0.4&c2=0.9&c3=6.0&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS Ikeda Map Resonator URL copied!');
  };

  const handleSurgeLaserResonance = (paramBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setResonatorParam(p => parseFloat((p + paramBoost).toFixed(2)));
    toast.success(`🌀 IKEDA LASER RESONATOR CAVITY SURGED TO u = ${(resonatorParam + paramBoost).toFixed(2)} ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Disc className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Ikeda Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS Ikeda Map Non-Linear Optical Laser Resonator Phase Cavity Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSIkeda}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Ikeda URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Ikeda HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Orbit className="w-3.5 h-3.5" /> 60FPS NON-LINEAR OPTICAL LASER RESONATOR PHASE CAVITY
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-300 to-purple-400">
              🌀 u = {resonatorParam} Cavity
            </h2>
            <p className="font-mono text-xs text-muted-foreground">xₙ₊₁ = 1 + u (xₙ cos τ - yₙ sin τ) Optical Phase Spiral & Live Emote Ingestion</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleSurgeLaserResonance(0.05)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Resonance +0.05 u
            </Button>
            <Button onClick={() => handleSurgeLaserResonance(0.20)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-md">
              🌀 Non-Linear Cavity Surge (+0.20 u)
            </Button>
            <Button onClick={() => setResonatorParam(0.9)} variant="outline" className="rounded-2xl font-mono text-xs">
              Stable Resonator
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
