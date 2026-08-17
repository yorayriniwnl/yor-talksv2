import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Swords, Crown, Sparkles, CheckCircle2, 
  Send, Shield, Flame, TrendingUp, Medal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ClanStanding {
  rank: number;
  clan: string;
  tag: string;
  wwcd: number;
  kills: number;
  pts: number;
  trend: 'up' | 'down' | 'same';
}

const STANDINGS: ClanStanding[] = [
  { rank: 1, clan: 'GodLike Esports', tag: 'GODL', wwcd: 3, kills: 48, pts: 93, trend: 'up' },
  { rank: 2, clan: 'Team Soul', tag: 'SOUL', wwcd: 2, kills: 42, pts: 82, trend: 'up' },
  { rank: 3, clan: 'Global Esports', tag: 'GE', wwcd: 1, kills: 38, pts: 68, trend: 'same' },
  { rank: 4, clan: 'Team XSpark', tag: 'TX', wwcd: 1, kills: 34, pts: 64, trend: 'down' },
  { rank: 5, clan: 'Revenant Esports', tag: 'RNT', wwcd: 1, kills: 30, pts: 55, trend: 'same' },
];

export default function ScrimsLeaderboard() {
  const [standings, setStandings] = useState<ClanStanding[]>(STANDINGS);

  const handleShareScorecard = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📊 Official Tier-1 Scrims Daily Scorecard dispatched to Discord & Captain WhatsApp Groups!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tier-1 Scrims Daily Leaderboard</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">WWCD Multipliers, Kill Point Telemetry & Discord Captain Scorecard</p>
          </div>
        </div>

        <Button
          onClick={handleShareScorecard}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Share Daily Scorecard
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-2xl space-y-4 font-sans">
          <div className="grid grid-cols-12 text-xs font-mono font-bold text-muted-foreground px-4 py-2 border-b border-border/40">
            <span className="col-span-1">#</span>
            <span className="col-span-5">Clan Roster</span>
            <span className="col-span-2 text-center">WWCD</span>
            <span className="col-span-2 text-center">Kills</span>
            <span className="col-span-2 text-right">Total Pts</span>
          </div>

          <div className="space-y-2">
            {standings.map((s) => (
              <div
                key={s.clan}
                className={cn(
                  "grid grid-cols-12 items-center p-4 rounded-2xl border transition-all text-xs font-mono",
                  s.rank === 1 ? "bg-amber-500/10 border-amber-500/40" : "surface-2 border-border/40"
                )}
              >
                <span className="col-span-1 font-display font-black text-base text-primary">#{s.rank}</span>
                <div className="col-span-5 flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-foreground">{s.clan}</span>
                  <span className="px-2 py-0.5 rounded-md bg-muted text-[0.65rem] text-muted-foreground font-bold">{s.tag}</span>
                </div>
                <span className="col-span-2 text-center font-bold text-amber-400">🍗 {s.wwcd}</span>
                <span className="col-span-2 text-center font-bold text-rose-400">🎯 {s.kills}</span>
                <span className="col-span-2 text-right font-display font-black text-base text-emerald-400">{s.pts} Pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
