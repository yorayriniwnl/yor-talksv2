import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Dna, Orbit, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteLaserHelixStudio() {
  const [helixFrequency, setHelixFrequency] = useState(48);

  const handleCopyOBSLaserHelix = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-laser-helix?fps=60&strands=2&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS 3D Laser Helix DNA URL copied!');
  };

  const handleAccelerateHelix = (freqBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setHelixFrequency(f => f + freqBoost);
    toast.success(`🧬 3D PRISMATIC LASER HELIX ACCELERATED TO ${helixFrequency + freqBoost} HZ ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Dna className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Laser Helix Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Trigonometric Double-Helix Laser DNA Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSLaserHelix}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Helix URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Helix HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D DOUBLE-HELIX TRIGONOMETRIC DNA EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-pink-400">
              🧬 {helixFrequency} Hz Helix Oscillation
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Twin Intertwined Neon Strands & Holographic Emote Rungs on Chat Cheers</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleAccelerateHelix(16)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Accelerate +16 Hz
            </Button>
            <Button onClick={() => handleAccelerateHelix(64)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white shadow-md">
              🧬 Hyperspace DNA Warp (+64 Hz)
            </Button>
            <Button onClick={() => setHelixFrequency(32)} variant="outline" className="rounded-2xl font-mono text-xs">
              Stable Helix
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
