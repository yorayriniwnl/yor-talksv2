import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Star, Orbit 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteStarlightShowerStudio() {
  const [meteors, setMeteors] = useState(128);

  const handleCopyOBSStarlightShower = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-starlight-shower?fps=60&cosmic=true&density=celestial`);
    toast.success('📋 OBS Studio Transparent 60FPS Starlight Meteor Shower URL copied!');
  };

  const handleRainStarlight = (meteorCount: number) => {
    sounds.playChime();
    triggerConfetti();
    setMeteors(m => m + meteorCount);
    toast.success(`🌠 ${meteorCount}x 3D COSMIC STARLIGHT METEORS RAINED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-300 to-indigo-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Starlight Shower Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Celestial Particle Physics, Golden Stardust Glow & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSStarlightShower}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Starlight URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Meteor HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D COSMIC CELESTIAL METEOR SHOWER EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200">
              🌠 {meteors} Cosmic Meteors
            </h2>
            <p className="font-mono text-xs text-muted-foreground">High-Velocity Sparkling Stardust Trails on Superchats & Subathon Celebrations</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleRainStarlight(50)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Rain 50x Starlight Stars
            </Button>
            <Button onClick={() => handleRainStarlight(200)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-yellow-400 via-amber-500 to-indigo-500 text-black shadow-md">
              🌠 200x Cosmic Meteor Storm
            </Button>
            <Button onClick={() => setMeteors(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Clear Galaxy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
