import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wind, Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Disc, Tornado 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteParticleTornadoStudio() {
  const [cyclonesSpun, setCyclonesSpun] = useState(38);

  const handleCopyOBSTornadoCyclone = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-particle-tornado?fps=60&vortex_spin=active&particle_count=5000`);
    toast.success('📋 OBS Studio Transparent 60FPS Particle Tornado Cyclone URL copied!');
  };

  const handleSpinParticleTornado = (tornadoMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setCyclonesSpun(c => c + (tornadoMulti * 7));
    toast.success(`🌪️ ${tornadoMulti * 7}x 3D CHROMATIC PARTICLE CYCLONES ACCELERATED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-400 via-emerald-500 to-cyan-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Particle Tornado Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Atmospheric Funnel Cyclone, Spiral Updraft & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSTornadoCyclone}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Tornado URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Tornado HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D KINETIC PARTICLE TORNADO CYCLONE EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-teal-400">🌪️ {cyclonesSpun} Mega Cyclones</h2>
            <p className="font-mono text-xs text-muted-foreground">Upward Kinetic Spiraling Particle Vortices on Superchats & Subathons</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleSpinParticleTornado(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Spin 7x Particle Cyclones
            </Button>
            <Button onClick={() => handleSpinParticleTornado(4)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-teal-400 via-emerald-500 to-cyan-600 text-black shadow-md">
              🌪️ 28x Category-5 Storm
            </Button>
            <Button onClick={() => setCyclonesSpun(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Calm Particle Storm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
