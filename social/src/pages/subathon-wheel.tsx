import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCcw, Sparkles, Copy, 
  Tv, Trophy, Flame, Play, Disc, Crown, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const CHALLENGES = [
  '💪 20 Pushups on Live Stream',
  '🎤 Sing Bollywood Song in Hinglish',
  '🙈 1 Round 1v1 Pistol with Blindfold',
  '🌶️ Eat Spicy Green Mirchi on Camera',
  '🎁 Gift 10 Subs to Chat Members',
  '💃 Desi Bhangra Dance Break for 1 Minute',
];

export default function SubathonWheelHUD() {
  const [selectedChallenge, setSelectedChallenge] = useState<string>(CHALLENGES[0]);
  const [isSpinning, setIsSpinning] = useState(false);

  const handleSpinWheel = () => {
    if (isSpinning) return;
    sounds.playPop();
    setIsSpinning(true);
    toast.info('🎰 Subathon Wheel spinning live on stream!');

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * CHALLENGES.length);
      setSelectedChallenge(CHALLENGES[randomIndex]);
      setIsSpinning(false);
      sounds.playChime();
      triggerConfetti();
      toast.success(`🎉 Subathon Dare Landed: ${CHALLENGES[randomIndex]}!`);
    }, 1200);
  };

  const handleCopyWheelSource = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/subathon-wheel?theme=neon_orange&speed=60fps`);
    toast.success('📋 OBS Studio Transparent Subathon Wheel HUD URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Disc className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Subathon Wheel & Dare Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live Interactive Sub Wheel, Custom Punishments & 60FPS OBS Browser Source</p>
          </div>
        </div>

        <Button
          onClick={handleCopyWheelSource}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Wheel URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Wheel Display Card */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="space-y-2">
            <span className="text-xs font-mono text-muted-foreground uppercase text-[0.65rem]">Active Subathon Challenge</span>
            <h3 className="font-display font-black text-2xl text-amber-400 min-h-[3rem] flex items-center justify-center">
              {isSpinning ? '🎰 Spinning Wheel...' : selectedChallenge}
            </h3>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSpinWheel}
              disabled={isSpinning}
              className="rounded-2xl h-12 px-8 font-bold text-sm bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg glow-neon-primary"
            >
              <RotateCcw className={cn("w-4 h-4 mr-2", isSpinning && "animate-spin")} />
              {isSpinning ? 'Spinning Live Wheel...' : 'Spin Subathon Wheel'}
            </Button>
          </div>
        </div>

        {/* Wheel Segments List */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Crown className="w-4 h-4 text-amber-400" />
            <h3>Configured Subathon Dares & Milestone Rewards</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHALLENGES.map((dare, i) => (
              <div
                key={i}
                className="surface-1 p-4 rounded-2xl border border-border/40 font-mono text-xs text-foreground flex items-center justify-between"
              >
                <span>{dare}</span>
                <span className="text-muted-foreground text-[0.65rem]">Tier {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
