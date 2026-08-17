import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Waves, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteAuroraWaveStudio() {
  const [auroraRibbons, setAuroraRibbons] = useState(48);

  const handleCopyOBSAuroraWave = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-aurora-wave?fps=60&spectral_flux=active&glow=emerald-violet`);
    toast.success('📋 OBS Studio Transparent 60FPS Aurora Borealis Wave URL copied!');
  };

  const handleWaveAuroraRibbons = (waveMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setAuroraRibbons(r => r + (waveMulti * 8));
    toast.success(`🌌 ${waveMulti * 8}x 3D SPECTRAL AURORA BOREALIS RIBBONS RADIATED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-purple-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Aurora Wave Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Ionospheric Spectral Curtains, Geomagnetic Waves & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSAuroraWave}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Aurora URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Aurora HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D AURORA BOREALIS SPECTRAL WAVE EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-emerald-400">🌌 {auroraRibbons} Spectral Curtains</h2>
            <p className="font-mono text-xs text-muted-foreground">Emerald & Violet Cosmic Geomagnetic Ribbon Waves on Sub Trains</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleWaveAuroraRibbons(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Radiate 8x Aurora Ribbons
            </Button>
            <Button onClick={() => handleWaveAuroraRibbons(4)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-emerald-400 via-teal-500 to-purple-600 text-black shadow-md">
              🌌 32x Polar Geomagnetic Storm
            </Button>
            <Button onClick={() => setAuroraRibbons(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Aurora Sky
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
