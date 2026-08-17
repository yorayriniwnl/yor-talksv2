import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Infinity, Orbit, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteMobiusLoopStudio() {
  const [torsionRate, setTorsionRate] = useState(3.6);

  const handleCopyOBSMobius = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-mobius-loop?fps=60&torsion=3.6&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS 3D Möbius Loop Ribbon URL copied!');
  };

  const handleAccelerateMobius = (torsionBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setTorsionRate(t => parseFloat((t + torsionBoost).toFixed(1)));
    toast.success(`♾️ 3D MÖBIUS STRIP TORSION VELOCITY ACCELERATED TO ${(torsionRate + torsionBoost).toFixed(1)}π RAD/S ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Infinity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Möbius Loop Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Non-Orientable Topological Möbius Strip Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSMobius}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Möbius URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Möbius HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D TOPOLOGICAL MÖBIUS DUAL-SURFACE RIBBON EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">
              ♾️ {torsionRate}π Rad/s Torsion
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Seamless Top-to-Bottom Surface Traversal & Glowing Emote Ingestion on Cheers</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAccelerateMobius(0.4)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Accelerate +0.4π
            </Button>
            <Button onClick={() => handleAccelerateMobius(1.6)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white shadow-md">
              ♾️ Quantum Loop Twist (+1.6π)
            </Button>
            <Button onClick={() => setTorsionRate(2.0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Stable Topology
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
