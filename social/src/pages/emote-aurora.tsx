import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Waves, Sparkles, Copy, 
  Moon, Zap, Trophy, Plus, Crown, Activity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteAuroraStudio() {
  const [auroraWaves, setAuroraWaves] = useState(24);

  const handleCopyOBSAurora = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-aurora?fps=60&curtain=emerald-cyan&theme=polar-glow`);
    toast.success('📋 OBS Studio Transparent 60FPS Emote Aurora Wave Studio URL copied!');
  };

  const handleTriggerAurora = (waveCount: number) => {
    sounds.playChime();
    triggerConfetti();
    setAuroraWaves(w => w + waveCount);
    toast.success(`🌌 ${waveCount}x MULTI-CHROMATIC AURORA BOREALIS SPECTRAL CURTAINS SHIMMERED ON SCREEN!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Aurora Wave Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Multi-Chromatic Polar Light Curtains, Celestial Glow Waves & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSAurora}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Aurora URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Aurora HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS POLAR AURORA LIGHT CURTAIN EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-emerald-400">🌌 {auroraWaves} Aurora Waves</h2>
            <p className="font-mono text-xs text-muted-foreground">Undulating Spectral Lights Activated on High Chat Velocity & Community Goals</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleTriggerAurora(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Trigger 1x Aurora
            </Button>
            <Button onClick={() => handleTriggerAurora(5)} className="rounded-2xl font-bold text-xs bg-emerald-500 text-black shadow-md">
              🌌 5x Celestial Polar Storm
            </Button>
            <Button onClick={() => setAuroraWaves(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Waves
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
