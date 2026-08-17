import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gem, Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Palette 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmotePrismLaserStudio() {
  const [lasersDispersed, setLasersDispersed] = useState(24);

  const handleCopyOBSPrismLaser = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-prism-laser?fps=60&dispersion=rgb-rainbow&bloom=true`);
    toast.success('📋 OBS Studio Transparent 60FPS Prism Laser Crystal URL copied!');
  };

  const handleDispersePrismLaser = (beamMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setLasersDispersed(b => b + (beamMulti * 6));
    toast.success(`💎 ${beamMulti * 6}x 3D REFRACTIVE RAINBOW PRISM LASER BEAMS PROJECTED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-500 via-pink-500 to-amber-400 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gem className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Prism Laser Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Optical Dispersion, Chromatic Aberration & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSPrismLaser}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Prism Laser URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Prism Laser HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D OPTICAL DISPERSION PRISM EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-violet-400">💎 {lasersDispersed} Prism Lasers</h2>
            <p className="font-mono text-xs text-muted-foreground">3D Refractive Crystal Spectrum Dispersion Triggered on Superchats & Sub Trains</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleDispersePrismLaser(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Disperse 6x Prism Lasers
            </Button>
            <Button onClick={() => handleDispersePrismLaser(4)} className="rounded-2xl font-bold text-xs bg-violet-500 text-white shadow-md">
              💎 24x Rainbow Spectrum
            </Button>
            <Button onClick={() => setLasersDispersed(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Lasers
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
