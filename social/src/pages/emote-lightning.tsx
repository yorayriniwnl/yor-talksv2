import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Sparkles, Copy, 
  Flame, Trophy, Plus, Crown, Activity, CloudLightning, Shield 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteLightningStudio() {
  const [boltsDischarged, setBoltsDischarged] = useState(28);

  const handleCopyOBSLightning = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-lightning?fps=60&voltage=gigavolt&theme=neon-thunder`);
    toast.success('📋 OBS Studio Transparent 60FPS Emote Lightning Storm Studio URL copied!');
  };

  const handleDischargeLightning = (boltMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setBoltsDischarged(b => b + boltMulti);
    toast.success(`⚡ ${boltMulti}x 100,000-VOLT ELECTRIC LIGHTNING BOLTS STRUCK ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-300 via-amber-400 to-indigo-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <CloudLightning className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Lightning Storm Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS Forked Electric Arcs, Thunder Flash Screen Blasts & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSLightning}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Lightning URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Lightning Storm HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS FORKED ELECTRIC LIGHTNING EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-yellow-300">⚡ {boltsDischarged} Lightning Strikes</h2>
            <p className="font-mono text-xs text-muted-foreground">Forked Plasma Lightning Discharged on Fast Chat Raids, Superchats & Gift Subs</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleDischargeLightning(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Discharge 1x Lightning Bolt
            </Button>
            <Button onClick={() => handleDischargeLightning(5)} className="rounded-2xl font-bold text-xs bg-yellow-400 text-black shadow-md">
              ⚡ 5x Gigavolt Thunder Storm
            </Button>
            <Button onClick={() => setBoltsDischarged(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Lightning
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
