import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Sparkles, Copy, 
  Zap, Trophy, Plus, Crown, Activity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteDragonStudio() {
  const [dragonsFlown, setDragonsFlown] = useState(18);

  const handleCopyOBSDragon = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-dragon?fps=60&dragon=gold&theme=shahi-fire`);
    toast.success('📋 OBS Studio Transparent 60FPS Emote Dragon Fireworks Studio URL copied!');
  };

  const handleSummonDragon = (flightCount: number) => {
    sounds.playChime();
    triggerConfetti();
    setDragonsFlown(d => d + flightCount);
    toast.success(`🐉 ${flightCount}x ROYAL GOLDEN EMOTE FIRE DRAGONS ROARED ON BROADCAST STAGE!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Dragon Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Serpentine Fire Dragon Particles, Golden Flame Breath & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSDragon}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Dragon URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Dragon HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS SERPENTINE FIRE DRAGON EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-amber-400">🐉 {dragonsFlown} Dragons</h2>
            <p className="font-mono text-xs text-muted-foreground">3D Serpentine Flight Paths Triggered on 500+ Bit Cheers & Sub Gifting</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleSummonDragon(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Summon 1x Dragon
            </Button>
            <Button onClick={() => handleSummonDragon(4)} className="rounded-2xl font-bold text-xs bg-amber-500 text-black shadow-md">
              🐉 4x Mythic Dragon Flight
            </Button>
            <Button onClick={() => setDragonsFlown(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Dragons
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
