import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, TrendingUp, Sparkles, Swords, Clock, 
  CheckCircle2, Flame, ShieldCheck, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface MatchPrediction {
  id: string;
  tournament: string;
  game: string;
  teamA: { name: string; odds: number; poolShare: number; logo: string };
  teamB: { name: string; odds: number; poolShare: number; logo: string };
  totalPoolKarma: number;
  timeStatus: string;
}

const PREDICTION_MATCHES: MatchPrediction[] = [
  {
    id: 'pm-1',
    tournament: 'BGMI India Invitational (Grand Finals)',
    game: 'BGMI',
    teamA: { name: 'GodLike Esports', odds: 1.85, poolShare: 58, logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
    teamB: { name: 'Team Soul', odds: 2.10, poolShare: 42, logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
    totalPoolKarma: 84200,
    timeStatus: 'Locks in 42 Mins'
  },
  {
    id: 'pm-2',
    tournament: 'Valorant South Asia Masters (Semi-Finals)',
    game: 'Valorant',
    teamA: { name: 'Reckoning Esports', odds: 1.60, poolShare: 64, logo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop' },
    teamB: { name: 'Global Esports', odds: 2.40, poolShare: 36, logo: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=200&auto=format&fit=crop' },
    totalPoolKarma: 52000,
    timeStatus: 'Locks in 2 Hours'
  }
];

export default function PredictionsArena() {
  const [stakeAmount, setStakeAmount] = useState(250);
  const [lockedPicks, setLockedPicks] = useState<{ [matchId: string]: string }>({});

  const handleLockPick = (matchId: string, teamName: string, odds: number) => {
    void matchId;
    void teamName;
    void odds;
    toast.info('Predictions are not connected to a server ledger yet. No Karma was staked.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-red-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Pick&apos;em & Predictions Arena</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Prediction preview — Karma staking is not available yet</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Sparkles className="w-3.5 h-3.5 fill-amber-400" /> Karma Stakes Only (Non-Monetary)
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Stake Selector */}
        <div className="surface-1 p-5 rounded-3xl border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <h4 className="font-display font-bold text-sm text-foreground">Select Prediction Stake (Karma)</h4>
            <p className="text-xs text-muted-foreground font-mono">Current Wager: {stakeAmount} Karma Points</p>
          </div>

          <div className="flex gap-2">
            {[100, 250, 500, 1000].map((amt) => (
              <Button
                key={amt}
                size="sm"
                variant={stakeAmount === amt ? 'default' : 'outline'}
                onClick={() => setStakeAmount(amt)}
                className={cn("rounded-xl font-mono text-xs font-bold", stakeAmount === amt && "bg-primary text-primary-foreground")}
              >
                {amt} XP
              </Button>
            ))}
          </div>
        </div>

        {/* Live Match Cards Grid */}
        <div className="space-y-6">
          {PREDICTION_MATCHES.map((m) => {
            const userPick = lockedPicks[m.id];

            return (
              <div
                key={m.id}
                className="surface-1 rounded-3xl p-6 sm:p-7 border border-border/40 shadow-xl space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[0.68rem] font-mono font-bold">
                      {m.game}
                    </span>
                    <span className="font-display font-bold text-sm text-foreground">{m.tournament}</span>
                  </div>

                  <div className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {m.timeStatus} &middot; Pool: {m.totalPoolKarma.toLocaleString()} Karma
                  </div>
                </div>

                {/* Team A vs Team B Split Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Team A */}
                  <button
                    onClick={() => handleLockPick(m.id, m.teamA.name, m.teamA.odds)}
                    disabled
                    className={cn(
                      "p-5 rounded-2xl border text-left transition-all flex items-center justify-between group",
                      userPick === m.teamA.name
                        ? "border-emerald-500 bg-emerald-500/20 shadow-lg glow-neon-primary"
                        : "border-border/40 hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border border-primary">
                        <AvatarImage src={m.teamA.logo} />
                        <AvatarFallback>A</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-display font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          {m.teamA.name}
                        </h4>
                        <span className="text-xs font-mono text-muted-foreground">{m.teamA.poolShare}% of Pool</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[0.62rem] font-mono text-muted-foreground uppercase block">Multiplier</span>
                      <strong className="font-display font-black text-xl text-emerald-400">{m.teamA.odds}x</strong>
                    </div>
                  </button>

                  {/* Team B */}
                  <button
                    onClick={() => handleLockPick(m.id, m.teamB.name, m.teamB.odds)}
                    disabled
                    className={cn(
                      "p-5 rounded-2xl border text-left transition-all flex items-center justify-between group",
                      userPick === m.teamB.name
                        ? "border-emerald-500 bg-emerald-500/20 shadow-lg glow-neon-primary"
                        : "border-border/40 hover:border-primary/50 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border border-rose-500">
                        <AvatarImage src={m.teamB.logo} />
                        <AvatarFallback>B</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-display font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          {m.teamB.name}
                        </h4>
                        <span className="text-xs font-mono text-muted-foreground">{m.teamB.poolShare}% of Pool</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[0.62rem] font-mono text-muted-foreground uppercase block">Multiplier</span>
                      <strong className="font-display font-black text-xl text-amber-400">{m.teamB.odds}x</strong>
                    </div>
                  </button>
                </div>

                {userPick && (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Pick Confirmed on {userPick}! Results will settle automatically after live stream match conclude.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
