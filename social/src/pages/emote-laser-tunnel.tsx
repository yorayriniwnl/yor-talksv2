import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Orbit, Grid3X3, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteLaserTunnelStudio() {
  const [tunnelSpeed, setTunnelSpeed] = useState(88);

  const handleCopyOBSLaserTunnel = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-laser-tunnel?fps=60&warp=true&tunnel=infinite`);
    toast.success('📋 OBS Studio Transparent 60FPS 3D Laser Warp Tunnel URL copied!');
  };

  const handleAccelerateTunnel = (speedBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setTunnelSpeed(s => s + speedBoost);
    toast.success(`⚡ 3D HYPERSPACE LASER TUNNEL ACCELERATED TO ${tunnelSpeed + speedBoost} KM/S ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Laser Tunnel Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Infinite Perspective Wireframe Warp Tunnel & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSLaserTunnel}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Tunnel URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Tunnel HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D INFINITE PERSPECTIVE LASER WARP TUNNEL EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300">
              ⚡ {tunnelSpeed} km/s Warp Velocity
            </h2>
            <p className="font-mono text-xs text-muted-foreground">High-Velocity Infinite Wireframe Hyperspace Waves on Superchats & Subathons</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAccelerateTunnel(25)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Accelerate +25 km/s
            </Button>
            <Button onClick={() => handleAccelerateTunnel(100)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-white shadow-md">
              ⚡ Hyperspace Boost (+100 km/s)
            </Button>
            <Button onClick={() => setTunnelSpeed(40)} variant="outline" className="rounded-2xl font-mono text-xs">
              Cruising Speed
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
