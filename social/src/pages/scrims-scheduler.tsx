import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Users, Clock, CheckCircle2, 
  Sparkles, Send, ShieldAlert, ShieldCheck, Trophy 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ScrimSlot {
  slot: number;
  team: string;
  igl: string;
  checkedIn: boolean;
}

const INITIAL_SLOTS: ScrimSlot[] = [
  { slot: 1, team: 'GodLike Esports', igl: 'JONATHAN', checkedIn: true },
  { slot: 2, team: 'Team Soul / S8UL', igl: 'Manya', checkedIn: true },
  { slot: 3, team: 'Revenant Esports', igl: 'Sensei', checkedIn: false },
  { slot: 4, team: 'Global Esports', igl: 'Basset', checkedIn: false },
  { slot: 5, team: 'Blind eSports', igl: 'Spower', checkedIn: true },
  { slot: 6, team: 'Entity Gaming', igl: 'Saumraj', checkedIn: false },
];

export default function ScrimsScheduler() {
  const [slots, setSlots] = useState<ScrimSlot[]>(INITIAL_SLOTS);

  const handleCheckIn = (slotNumber: number, team: string) => {
    sounds.playChime();
    triggerConfetti();
    setSlots(prev => prev.map(s => s.slot === slotNumber ? { ...s, checkedIn: true } : s));
    toast.success(`✅ ${team} (Slot #${slotNumber}) confirmed check-in with complete 4-man roster!`);
  };

  const handlePingDiscord = () => {
    sounds.playPop();
    triggerConfetti();
    toast.success('📢 15-Minute Scrims Call dispatched to Tier-1 Discord Captains Channel!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tier-1 Scrims Slot Timetable & Check-In</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">20-Slot Distribution, Roster Verification & Penalty Ledgers</p>
          </div>
        </div>

        <Button
          onClick={handlePingDiscord}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Ping Discord Captains
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {slots.map((s) => (
            <div
              key={s.slot}
              className={cn(
                "surface-1 p-5 rounded-3xl border flex items-center justify-between shadow-lg space-x-3 transition-all",
                s.checkedIn ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-zinc-900 border border-border/40 font-mono font-bold text-sm text-primary flex items-center justify-center">
                  #{s.slot}
                </span>
                <div className="space-y-0.5">
                  <h4 className="font-display font-bold text-sm text-foreground">{s.team}</h4>
                  <p className="text-[0.68rem] font-mono text-muted-foreground">IGL: {s.igl}</p>
                </div>
              </div>

              <div>
                {s.checkedIn ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleCheckIn(s.slot, s.team)}
                    className="rounded-xl font-bold text-xs h-9 px-3 bg-primary text-primary-foreground glow-neon-primary"
                  >
                    Check In Roster
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
