import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Vote, BarChart2, Sparkles, CheckCircle2, 
  Send, Tv, Radio, MessageSquare, Flame 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PollOption {
  id: string;
  label: string;
  votes: number;
  percentage: number;
}

export default function LivePollsHUD() {
  const [totalVotes, setTotalVotes] = useState(14820);
  const [options, setOptions] = useState<PollOption[]>([
    { id: 'opt-1', label: '🔥 Jonathan 1v3 AWP Clutch Defuse', votes: 10670, percentage: 72 },
    { id: 'opt-2', label: '🛡️ Team Soul Retake & Spike Plant', votes: 4150, percentage: 28 },
  ]);

  const handleVote = (id: string) => {
    sounds.playPop();
    setOptions(prev => prev.map(o => {
      if (o.id === id) {
        const nextVotes = o.votes + 1;
        return { ...o, votes: nextVotes };
      }
      return o;
    }));
    setTotalVotes(v => v + 1);
    toast.success('🗳️ Vote registered on live stream poll!');
  };

  const handleDispatchHUD = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📺 Live Interactive Poll Widget dispatched to OBS Studio Overlay Browser Source!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Live Chat Polls & Super-Votes</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-Time Chat Predictions, Weighted Super-Votes & OBS Transparent Overlay</p>
          </div>
        </div>

        <Button
          onClick={handleDispatchHUD}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Broadcast to OBS Overlay
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Poll Card */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 font-mono font-bold text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> LIVE POLL (Match Point)
            </span>
            <span className="text-xs font-mono text-muted-foreground font-bold">{totalVotes.toLocaleString()} Total Votes</span>
          </div>

          <h3 className="font-display font-black text-2xl text-foreground">
            Who will clutch the 1v3 Grand Finals Decider Round? 🏆
          </h3>

          <div className="space-y-4">
            {options.map((o) => (
              <div
                key={o.id}
                onClick={() => handleVote(o.id)}
                className="surface-2 p-5 rounded-2xl border border-border/40 cursor-pointer hover:border-primary transition-all space-y-2 relative overflow-hidden"
              >
                <div className="flex items-center justify-between relative z-10">
                  <span className="font-display font-bold text-base text-foreground">{o.label}</span>
                  <span className="font-mono font-black text-lg text-amber-400">{o.percentage}%</span>
                </div>

                {/* Progress bar fill */}
                <div className="w-full bg-muted/40 h-3 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${o.percentage}%` }}
                    className="h-full bg-gradient-to-r from-primary to-amber-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
