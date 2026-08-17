import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteSupernovaStudio() {
  const [supernovasDetonated, setSupernovasDetonated] = useState(12);

  const handleCopyOBSSupernova = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-supernova?fps=60&blast=stellar-gold&theme=cosmic-core`);
    toast.success('📋 OBS Studio Transparent 60FPS Emote Supernova Blast Studio URL copied!');
  };

  const handleDetonateSupernova = (blastCount: number) => {
    sounds.playChime();
    triggerConfetti();
    setSupernovasDetonated(s => s + blastCount);
    toast.success(`💥 ${blastCount}x COSMIC STELLAR SUPERNOVA EMOTE SHOCKWAVES DETONATED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Supernova Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Omni-Directional Cosmic Supernova Detonation, Starlight Expansion & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSSupernova}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Supernova URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Supernova HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS COSMIC SUPERNOVA SHOCKWAVE EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-amber-400">💥 {supernovasDetonated} Supernovas</h2>
            <p className="font-mono text-xs text-muted-foreground">Omni-Directional Stellar Explosions Triggered on 1000+ Bits, Tier-3 Subs & Hype Trains</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleDetonateSupernova(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Detonate 1x Supernova
            </Button>
            <Button onClick={() => handleDetonateSupernova(3)} className="rounded-2xl font-bold text-xs bg-amber-500 text-black shadow-md">
              💥 3x Hypernova Galaxy Burst
            </Button>
            <Button onClick={() => setSupernovasDetonated(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Supernovas
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
