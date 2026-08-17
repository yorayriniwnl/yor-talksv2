import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Orbit, Radio, Disc3, Infinity, Atom, Layers, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteCliffordAttractorStudio() {
  const [cliffordAlpha, setCliffordAlpha] = useState(-1.4);

  const handleCopyOBSClifford = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-clifford-attractor?fps=60&a=-1.4&b=1.6&c=1.0&d=0.7&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS Clifford Fractal Attractor URL copied!');
  };

  const handleShiftCliffordPhase = (alphaShift: number) => {
    sounds.playChime();
    triggerConfetti();
    setCliffordAlpha(a => parseFloat((a + alphaShift).toFixed(2)));
    toast.success(`🌀 CLIFFORD FRACTAL ATTRACTOR PHASE SHIFTED TO α = ${(cliffordAlpha + alphaShift).toFixed(2)} ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Orbit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Clifford Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 4-Parameter Clifford Sinusoidal Fractal Attractor Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSClifford}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Clifford URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Clifford HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 font-mono text-xs font-bold">
            <Waves className="w-3.5 h-3.5" /> 60FPS 4-PARAMETER SINUSOIDAL CLIFFORD FRACTAL ATTRACTOR
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-rose-300 to-amber-400">
              🌀 α = {cliffordAlpha} Phase
            </h2>
            <p className="font-mono text-xs text-muted-foreground">xₙ₊₁ = sin(a yₙ) + c cos(a xₙ) Non-Linear Chaotic Ribbon Lattice & Live Emotes</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleShiftCliffordPhase(0.1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Phase Shift +0.1 α
            </Button>
            <Button onClick={() => handleShiftCliffordPhase(0.4)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-500 text-white shadow-md">
              🌀 Infinite Ribbon Surge (+0.4 α)
            </Button>
            <Button onClick={() => setCliffordAlpha(-1.4)} variant="outline" className="rounded-2xl font-mono text-xs">
              Clifford Ground State
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
