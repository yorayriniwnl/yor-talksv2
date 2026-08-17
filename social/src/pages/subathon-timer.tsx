import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Plus, Flame, Sparkles, CheckCircle2, 
  Send, Tv, Gift, IndianRupee, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function SubathonTimer() {
  const [hours, setHours] = useState(38);
  const [minutes, setMinutes] = useState(14);
  const [seconds, setSeconds] = useState(20);
  const [totalSubs, setTotalSubs] = useState(342);

  const handleAddSub = () => {
    sounds.playChime();
    triggerConfetti();
    setMinutes(m => {
      if (m + 2 >= 60) {
        setHours(h => h + 1);
        return (m + 2) - 60;
      }
      return m + 2;
    });
    setTotalSubs(s => s + 1);
    toast.success('🎉 NEW TIER-1 SUB! +2:00 Minutes added to Marathon Subathon Timer!');
  };

  const handleDispatchHUD = () => {
    sounds.playPop();
    toast.info('📺 Subathon Countdown Widget dispatched to OBS Studio Overlay Browser Source!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Marathon Subathon Timer</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Dynamic Time Boosts (+2m per Sub), Goal Milestones & OBS Browser HUD</p>
          </div>
        </div>

        <Button
          onClick={handleDispatchHUD}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Broadcast to OBS HUD
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Timer Card */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 text-center shadow-2xl space-y-6">
          <span className="px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-400 font-mono font-bold text-xs inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" /> MARATHON LIVE STREAM ACTIVE
          </span>

          <div className="font-display font-black text-6xl md:text-8xl tracking-tight text-foreground glow-text">
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={handleAddSub}
              className="rounded-2xl font-bold text-sm h-12 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white glow-neon-primary shadow-lg"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Simulate +1 Sub / Superchat (+2 Mins)
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40 font-mono text-xs">
            <div>
              <span className="text-muted-foreground uppercase text-[0.6rem] block">Total Marathon Subs</span>
              <strong className="font-display font-black text-2xl text-amber-400">{totalSubs} Subs</strong>
            </div>
            <div>
              <span className="text-muted-foreground uppercase text-[0.6rem] block">Next Hype Goal (500 Subs)</span>
              <strong className="font-display font-black text-2xl text-primary">🥁 Live Dhol Celebration</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
