import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Orbit, Disc, Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteQuantumPortalStudio() {
  const [portalsOpened, setPortalsOpened] = useState(42);

  const handleCopyOBSQuantumPortal = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-quantum-portal?fps=60&vortex_flux=active&color=cyan-magenta`);
    toast.success('📋 OBS Studio Transparent 60FPS Quantum Portal Vortex URL copied!');
  };

  const handleOpenQuantumPortal = (portalMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setPortalsOpened(p => p + (portalMulti * 6));
    toast.success(`🌀 ${portalMulti * 6}x 3D QUANTUM DIMENSIONAL PORTALS OPENED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-500 to-fuchsia-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Orbit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Quantum Portal Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Dimensional Wormhole Vortex, Particle Stream & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSQuantumPortal}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Portal URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Portal HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D QUANTUM WORMHOLE VORTEX EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-cyan-400">🌀 {portalsOpened} Active Portals</h2>
            <p className="font-mono text-xs text-muted-foreground">Dimensional Particle Streams Triggered on Subscriptions & Raid Trains</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleOpenQuantumPortal(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Open 6x Quantum Portals
            </Button>
            <Button onClick={() => handleOpenQuantumPortal(4)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-400 via-teal-500 to-fuchsia-600 text-black shadow-md">
              🌀 24x Multiverse Gateway
            </Button>
            <Button onClick={() => setPortalsOpened(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Collapse Portals
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
