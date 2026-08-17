import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Star, Orbit, Compass 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteConstellationChartStudio() {
  const [starMagnitude, setStarMagnitude] = useState(88);

  const handleCopyOBSStarchart = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-constellation-chart?fps=60&stars=512&vector=true`);
    toast.success('📋 OBS Studio Transparent 60FPS 3D Constellation Starchart URL copied!');
  };

  const handleIgniteStars = (magnitudeBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setStarMagnitude(m => m + magnitudeBoost);
    toast.success(`✨ 3D CELESTIAL STARCHART MAGNITUDE IGNITED TO ${starMagnitude + magnitudeBoost} LUMENS ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-400 via-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Constellation Starchart</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Astrometry Delaunay Vector Star Mesh Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSStarchart}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Starchart URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Starchart HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D DELAUNAY CELESTIAL ASTROMETRY STAR EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              ✨ {starMagnitude} Lumens Stellar Magnitude
            </h2>
            <p className="font-mono text-xs text-muted-foreground">Laser Vector Lines Connecting Glowing Star Clusters & Holographic Emotes on Chat Cheers</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleIgniteStars(15)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Ignite +15 Lumens
            </Button>
            <Button onClick={() => handleIgniteStars(60)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-md">
              ✨ Super-Asterism Galaxy (+60 Lumens)
            </Button>
            <Button onClick={() => setStarMagnitude(45)} variant="outline" className="rounded-2xl font-mono text-xs">
              Stable Chart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
