import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Star 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteSparklersStudio() {
  const [sparksIgnited, setSparksIgnited] = useState(140);

  const handleCopyOBSSparklers = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-sparklers?fps=60&spark=diwali-gold&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS Golden Sparkler Shower URL copied!');
  };

  const handleIgniteSparkler = (sparkMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setSparksIgnited(s => s + (sparkMulti * 50));
    toast.success(`✨ ${sparkMulti * 50}x GOLDEN PHOOLJHADI CRACKLING SPARKS IGNITED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Sparklers Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS Golden Phooljhadi Cascade, Crackle Bloom & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSSparklers}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Sparklers URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Sparkler Shower HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS GOLDEN PHOOLJHADI PARTICLE EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-yellow-400">✨ {sparksIgnited} Gold Sparks</h2>
            <p className="font-mono text-xs text-muted-foreground">Crackling Golden Sparkler Fountain Cascade Triggered on Chat Cheers & VIP Tips</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleIgniteSparkler(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Ignite 50x Phooljhadi Sparks
            </Button>
            <Button onClick={() => handleIgniteSparkler(4)} className="rounded-2xl font-bold text-xs bg-yellow-400 text-black shadow-md">
              ✨ 200x Diwali Gold Shower
            </Button>
            <Button onClick={() => setSparksIgnited(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Sparks
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
