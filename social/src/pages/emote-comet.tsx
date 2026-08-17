import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Moon, Zap, Trophy, Plus, Crown, Activity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteCometStudio() {
  const [cometsFired, setCometsFired] = useState(36);

  const handleCopyOBSComet = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-comet?fps=60&shower=aurora&theme=cosmic-spark`);
    toast.success('📋 OBS Studio Transparent 60FPS Emote Comet Shower Studio URL copied!');
  };

  const handleLaunchComets = (cometCount: number) => {
    sounds.playChime();
    triggerConfetti();
    setCometsFired(c => c + cometCount);
    toast.success(`🌠 ${cometCount}x HYPER-SPEED CHAT EMOTE METEOR TRAILS BLAZED ACROSS BROADCAST SKY!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Comet Shower Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Hyper-Speed Flaming Meteor Trails, Cosmic Star Dust & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSComet}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Comet URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Comet HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS COSMIC METEOR SHOWER EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-rose-400">🌠 {cometsFired} Meteors</h2>
            <p className="font-mono text-xs text-muted-foreground">Real-time Star Trails Activated on Chat Superchats, Raids & Follows</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleLaunchComets(2)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Launch 2x Comets
            </Button>
            <Button onClick={() => handleLaunchComets(8)} className="rounded-2xl font-bold text-xs bg-rose-600 text-white shadow-md">
              🌠 8x Aurora Meteor Barrage
            </Button>
            <Button onClick={() => setCometsFired(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Comets
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
