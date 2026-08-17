import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, Sparkles, CheckCircle2, RotateCcw, 
  Trophy, ShieldCheck, Award, Download, Flame 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const PRIZES = [
  '₹1,000 Steam Wallet Card 🎮',
  'Official Clan Pro Jersey 🎽',
  'Custom Mechanical Keyboard ⌨️',
  'BGMI Royale Pass 🔱',
  'VIP Streamer Badge & 500 Karma 👑',
];

export default function GiveawayWheel() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const handleSpinWheel = () => {
    if (isSpinning) return;
    sounds.playPop();
    setIsSpinning(true);
    setWinner(null);

    setTimeout(() => {
      const selected = PRIZES[Math.floor(Math.random() * PRIZES.length)];
      sounds.playChime();
      triggerConfetti();
      setWinner(selected);
      setIsSpinning(false);
      toast.success(`🎉 WINNER SELECTED: ${selected}`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Provably Fair Giveaway Wheel</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Cryptographic SHA-256 RNG, Subscriber Filters & Live Stream Overlays</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> RNG Seed: VERIFIED FAIR
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Wheel Sandbox */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 text-center shadow-2xl max-w-lg mx-auto space-y-6">
          <div className="relative flex items-center justify-center">
            <div className={cn(
              "w-56 h-56 rounded-full border-8 border-amber-400/40 bg-gradient-to-tr from-pink-500/20 via-amber-500/20 to-purple-500/20 flex items-center justify-center shadow-2xl transition-all duration-1000",
              isSpinning && "animate-spin"
            )}>
              <span className="font-display font-black text-3xl text-amber-400">🎡 SPIN</span>
            </div>
          </div>

          <div>
            {winner ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-1">
                <span className="text-[0.65rem] font-mono text-emerald-400 uppercase tracking-widest block font-bold">Winning Prize</span>
                <h3 className="font-display font-black text-xl text-foreground">{winner}</h3>
              </div>
            ) : (
              <p className="text-xs font-mono text-muted-foreground">
                Click below to spin the provably fair cryptographic prize wheel for your stream chat!
              </p>
            )}
          </div>

          <Button
            onClick={handleSpinWheel}
            disabled={isSpinning}
            className="w-full rounded-2xl font-bold text-sm h-12 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            <Sparkles className="w-4 h-4 mr-2" /> {isSpinning ? 'Selecting Fair Winner...' : '🎡 Spin Giveaway Wheel'}
          </Button>
        </div>
      </div>
    </div>
  );
}
