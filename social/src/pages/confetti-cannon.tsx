import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, PartyPopper, Zap, Trophy, Plus, Crown, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function ConfettiCannonStudio() {
  const [blastsFired, setBlastsFired] = useState(42);

  const handleCopyOBSConfetti = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/confetti-cannon?fps=60&particles=500&theme=bharat-tricolor`);
    toast.success('📋 OBS Studio Transparent 60FPS Confetti Cannon URL copied!');
  };

  const handleBlastCannon = (amount: number) => {
    sounds.playChime();
    triggerConfetti();
    setBlastsFired(b => b + amount);
    toast.success(`🎉 ${amount}x TRICOLOR & GOLD CONFETTI CANNONS FIRED ON LIVE STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <PartyPopper className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Confetti Cannon Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Tricolor Saffron-White-Green Blasts, Golden Foil Shimmer & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSConfetti}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Cannon URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Cannon HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 font-mono text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> 60FPS TRICOLOR BHARAT CELEBRATION BLAST
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-pink-400">🎉 {blastsFired} Blasts</h2>
            <p className="font-mono text-xs text-muted-foreground">Physics Particle Bursts Triggered on Superchats & Sub Gift Waves</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleBlastCannon(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Fire 1x Cannon
            </Button>
            <Button onClick={() => handleBlastCannon(5)} className="rounded-2xl font-bold text-xs bg-pink-600 text-white shadow-md">
              🎉 5x Triple-Blast Salvo
            </Button>
            <Button onClick={() => setBlastsFired(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Blasts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
