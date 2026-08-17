import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Grid3X3, Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteMatrixGridStudio() {
  const [gridNodes, setGridNodes] = useState(64);

  const handleCopyOBSMatrixGrid = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-matrix-grid?fps=60&wireframe=active&neon_color=cyan-magenta`);
    toast.success('📋 OBS Studio Transparent 60FPS Cyberpunk Matrix Grid URL copied!');
  };

  const handlePulseMatrixGrid = (gridMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setGridNodes(g => g + (gridMulti * 16));
    toast.success(`🌐 ${gridMulti * 16}x 3D NEON CYBERNETIC MATRIX NODES PULSED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Matrix Grid Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Perspective Synthwave Wireframe, Hologram Waves & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSMatrixGrid}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Matrix Grid URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Grid HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D CYBERNETIC PERSPECTIVE WIREFRAME GRID EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-cyan-400">🌐 {gridNodes} Grid Nodes</h2>
            <p className="font-mono text-xs text-muted-foreground">Undulating Synthwave Neon Floor Grid with Floating Holographic Emotes</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handlePulseMatrixGrid(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Pulse 16x Grid Nodes
            </Button>
            <Button onClick={() => handlePulseMatrixGrid(4)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 text-white shadow-md">
              🌐 64x Synthwave Super Grid
            </Button>
            <Button onClick={() => setGridNodes(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Wireframe Grid
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
