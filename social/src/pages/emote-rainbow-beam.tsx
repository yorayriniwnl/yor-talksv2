import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Palette, Gem 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteRainbowBeamStudio() {
  const [rainbowBeams, setRainbowBeams] = useState(56);

  const handleCopyOBSRainbowBeam = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-rainbow-beam?fps=60&prismatic=active&spectrum=7-color-bloom`);
    toast.success('📋 OBS Studio Transparent 60FPS Prismatic Rainbow Beam URL copied!');
  };

  const handleFireRainbowBeams = (beamMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setRainbowBeams(b => b + (beamMulti * 7));
    toast.success(`🌈 ${beamMulti * 7}x 3D PRISMATIC 7-COLOR RAINBOW LASERS RADIATED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-yellow-400 via-emerald-400 via-cyan-400 to-purple-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Rainbow Beam Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Optical Dispersion Laser Mesh, Chromatic Spectrum & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSRainbowBeam}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Rainbow URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Rainbow HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D OPTICAL DISPERSION PRISMATIC RAINBOW LASER EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500">
              🌈 {rainbowBeams} Prismatic Beams
            </h2>
            <p className="font-mono text-xs text-muted-foreground">High-Intensity Refracted 7-Color Rainbow Lasers on Superchats & Subathons</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleFireRainbowBeams(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Fire 7x Rainbow Lasers
            </Button>
            <Button onClick={() => handleFireRainbowBeams(4)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-rose-500 via-yellow-400 to-purple-600 text-black shadow-md">
              🌈 28x Prismatic Supernova
            </Button>
            <Button onClick={() => setRainbowBeams(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Deactivate Lasers
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
