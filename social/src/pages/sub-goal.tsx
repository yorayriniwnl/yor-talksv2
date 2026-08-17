import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Copy, Sparkles, CheckCircle2, 
  Send, Tv, Gift, Sliders, Palette 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function SubGoalStudio() {
  const [currentSubs, setCurrentSubs] = useState(384);
  const [goalSubs, setGoalSubs] = useState(500);
  const [goalTitle, setGoalTitle] = useState('🔥 24-Hour Non-Stop BGMI Tournament Marathon + Dhol');

  const percentage = Math.min(100, Math.round((currentSubs / goalSubs) * 100));

  const handleCopyBrowserSource = () => {
    sounds.playChime();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/sub-goal?id=custom_streamer_hud`);
    toast.success('📋 OBS Studio 60FPS Transparent Sub-Goal URL copied to clipboard!');
  };

  const handleSimulateSub = () => {
    sounds.playPop();
    triggerConfetti();
    setCurrentSubs(s => Math.min(goalSubs, s + 1));
    toast.success('🎉 Goal Bar updated! +1 Sub added.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Sub-Goal Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Animated Progress Gauges, Custom Milestone Titles & OBS Browser Source</p>
          </div>
        </div>

        <Button
          onClick={handleCopyBrowserSource}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Browser URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Goal Preview Box */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 text-center shadow-2xl space-y-6">
          <span className="text-xs font-mono text-muted-foreground uppercase font-bold tracking-widest block">Live Stream Overlay Preview</span>

          <h3 className="font-display font-black text-xl text-foreground">{goalTitle}</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-sm font-bold">
              <span className="text-emerald-400">{currentSubs} Subs</span>
              <span className="text-muted-foreground">{goalSubs} Subs Goal ({percentage}%)</span>
            </div>

            <div className="w-full bg-muted/40 h-6 rounded-full overflow-hidden p-1 border border-border/40">
              <div
                style={{ width: `${percentage}%` }}
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500 shadow-md"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSimulateSub}
              className="rounded-2xl font-bold text-xs h-10 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
            >
              🎉 Test Trigger Sub Alert
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
