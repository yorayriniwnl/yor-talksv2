import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, TrendingUp, Shield, Star, Sparkles, 
  Flame, Swords, CheckCircle2, ArrowUpRight, Award 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ClanRank {
  rank: number;
  name: string;
  tag: string;
  elo: number;
  change: string;
  winRate: number;
  streak: string;
  logo: string;
  tier: 'tier1' | 'tier2' | 'tier3';
}

const CLAN_RANKINGS: ClanRank[] = [
  {
    rank: 1,
    name: 'Team GodLike Esports',
    tag: 'GODL',
    elo: 2480,
    change: '+45 Elo',
    winRate: 84,
    streak: '🔥 8 Win Streak',
    logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    tier: 'tier1'
  },
  {
    rank: 2,
    name: 'Team Soul Gaming',
    tag: 'SOUL',
    elo: 2420,
    change: '+30 Elo',
    winRate: 81,
    streak: '🔥 5 Win Streak',
    logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    tier: 'tier1'
  },
  {
    rank: 3,
    name: 'Reckoning Esports',
    tag: 'RCK',
    elo: 2310,
    change: '+15 Elo',
    winRate: 76,
    streak: '🔥 3 Win Streak',
    logo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
    tier: 'tier1'
  },
  {
    rank: 4,
    name: 'Global Esports Valorant',
    tag: 'GE',
    elo: 2280,
    change: '+10 Elo',
    winRate: 74,
    streak: '🔥 2 Win Streak',
    logo: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=200&auto=format&fit=crop',
    tier: 'tier1'
  },
  {
    rank: 5,
    name: 'Carnival Gaming',
    tag: 'CG',
    elo: 2190,
    change: '-5 Elo',
    winRate: 68,
    streak: '1 Loss',
    logo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
    tier: 'tier2'
  }
];

export default function PowerRankings() {
  const [selectedTier, setSelectedTier] = useState<'all' | 'tier1' | 'tier2'>('all');

  const filtered = CLAN_RANKINGS.filter(c => selectedTier === 'all' || c.tier === selectedTier);

  const handleVoteMVP = (clanName: string) => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`🎉 Fan MVP Vote cast for ${clanName}! +50 Fan Karma awarded.`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">National Clan Elo & Power Rankings</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Official Indian Esports League Matrix & Tier Divisions</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Award className="w-3.5 h-3.5 fill-amber-400" /> Season 1 National Matrix
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Tier Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', name: 'All Divisions' },
            { id: 'tier1', name: '👑 Tier-1 God Tier' },
            { id: 'tier2', name: '⚡ Tier-2 Challengers' },
          ].map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={selectedTier === tab.id ? 'default' : 'outline'}
              onClick={() => {
                sounds.playPop();
                setSelectedTier(tab.id as any);
              }}
              className={cn("rounded-2xl text-xs font-bold", selectedTier === tab.id && "bg-primary text-primary-foreground")}
            >
              {tab.name}
            </Button>
          ))}
        </div>

        {/* Clan Power Rankings Table Card */}
        <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-2xl">
          <div className="divide-y divide-border/30">
            {filtered.map((c) => (
              <div
                key={c.name}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center font-display font-black text-sm shadow",
                    c.rank === 1 && "bg-amber-400 text-black",
                    c.rank === 2 && "bg-slate-300 text-black",
                    c.rank === 3 && "bg-amber-700 text-white",
                    c.rank > 3 && "bg-muted text-muted-foreground"
                  )}>
                    #{c.rank}
                  </div>

                  <Avatar className="w-12 h-12 border border-border">
                    <AvatarImage src={c.logo} />
                    <AvatarFallback>{c.tag}</AvatarFallback>
                  </Avatar>

                  <div>
                    <h4 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                      {c.name}
                      <span className="text-[0.65rem] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold">
                        [{c.tag}]
                      </span>
                    </h4>
                    <div className="text-xs font-mono text-muted-foreground flex items-center gap-3 mt-0.5">
                      <span>Win Rate: {c.winRate}%</span>
                      <span className="text-amber-400 font-bold">{c.streak}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 font-mono text-xs">
                  <div className="text-right">
                    <span className="text-muted-foreground uppercase text-[0.62rem] block">National Elo</span>
                    <div className="font-display font-black text-lg text-primary">{c.elo}</div>
                    <span className="text-[0.65rem] text-emerald-400 font-bold">{c.change}</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVoteMVP(c.name)}
                    className="rounded-xl font-bold text-xs h-9"
                  >
                    <Star className="w-3.5 h-3.5 mr-1 text-amber-400 fill-amber-400" /> Vote MVP
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
