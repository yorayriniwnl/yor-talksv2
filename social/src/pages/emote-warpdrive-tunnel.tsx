import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Rocket, Orbit, Radio 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteWarpDriveTunnelStudio() {
  const [warpFactor, setWarpFactor] = useState(8.8);

  const handleCopyOBSWarpDrive = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-warpdrive-tunnel?fps=60&warp=9.9&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS 3D Warp Drive Tunnel URL copied!');
  };

  const handleEngageWarp = (warpBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setWarpFactor(w => parseFloat((w + warpBoost).toFixed(1)));
    toast.success(`🚀 3D HYPERSPACE WARP FACTOR ENGAGED TO WARP ${(warpFactor + warpBoost).toFixed(1)} ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Warp Drive Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Relativistic Hyper-Streak Warp Tunnel Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSWarpDrive}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Warp URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Warp Drive HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D RELATIVISTIC STARFIELD HYPER-STREAK WARP EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-300 to-indigo-400">
              🚀 Warp Factor {warpFactor}c
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Relativistic Starfield Velocity Streaks & Glowing Chat Emote Ingestion on Cheers</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleEngageWarp(0.5)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Engage +0.5c
            </Button>
            <Button onClick={() => handleEngageWarp(2.0)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-md">
              🚀 Maximum Hyperspace (+2.0c)
            </Button>
            <Button onClick={() => setWarpFactor(5.0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Sub-Light Warp
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
