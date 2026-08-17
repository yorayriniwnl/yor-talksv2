import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Waves, Zap, Trophy, Plus, Crown, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteFountainStudio() {
  const [fountainsFired, setFountainsFired] = useState(48);

  const handleCopyOBSFountain = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-fountain?fps=60&geysers=5&theme=aurora-glow`);
    toast.success('📋 OBS Studio Transparent 60FPS Emote Fountain Fireworks Studio URL copied!');
  };

  const handleSprayGeyser = (height: number) => {
    sounds.playChime();
    triggerConfetti();
    setFountainsFired(f => f + height);
    toast.success(`🎆 ${height}x TIER-5 VOLCANIC EMOTE GEYSERS LAUNCHED ON BROADCAST STAGE!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Fountain Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Soaring Chat Geysers, Gravity Falloff Physics & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSFountain}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Fountain URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Fountain HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> 60FPS VOLCANIC CHAT EMOTE GEYSER EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-cyan-400">🌊 {fountainsFired} Geysers</h2>
            <p className="font-mono text-xs text-muted-foreground">Physics Arc Trajectories Triggered on Channel Raids & Hype Trains</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleSprayGeyser(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Launch 1x Fountain
            </Button>
            <Button onClick={() => handleSprayGeyser(6)} className="rounded-2xl font-bold text-xs bg-cyan-600 text-white shadow-md">
              🌊 6x Mega Fountain Arc
            </Button>
            <Button onClick={() => setFountainsFired(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Count
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
