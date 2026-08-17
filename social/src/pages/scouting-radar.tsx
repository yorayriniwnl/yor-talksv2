import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Search, Shield, Zap, Sparkles, 
  CheckCircle2, Flame, UserPlus, Filter, Award 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ScoutCandidate {
  id: string;
  name: string;
  gamerTag: string;
  game: string;
  role: string;
  kdRatio: number;
  headshotPct: number;
  clutchRating: number;
  status: 'available' | 'trial_sent';
  avatar: string;
}

const SCOUT_PLAYERS: ScoutCandidate[] = [
  {
    id: 'p1',
    name: 'Vikram Rajput',
    gamerTag: 'SHIVA_SNIPER #01',
    game: 'BGMI',
    role: 'Assaulter / DMR Specialist',
    kdRatio: 6.84,
    headshotPct: 44.2,
    clutchRating: 98,
    status: 'available',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'p2',
    name: 'Sameer Sen',
    gamerTag: 'VORTEX_JET #07',
    game: 'Valorant',
    role: 'Duelist / Jett Main',
    kdRatio: 1.62,
    headshotPct: 38.5,
    clutchRating: 94,
    status: 'available',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'p3',
    name: 'Aditya Kulkarni',
    gamerTag: 'CYBER_VIPER',
    game: 'Valorant',
    role: 'IGL / Controller',
    kdRatio: 1.34,
    headshotPct: 32.1,
    clutchRating: 96,
    status: 'available',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop'
  }
];

export default function ScoutingRadar() {
  const [candidates, setCandidates] = useState<ScoutCandidate[]>(SCOUT_PLAYERS);
  const [filterGame, setFilterGame] = useState<'all' | 'BGMI' | 'Valorant'>('all');

  const handleSendTrial = (id: string, tag: string) => {
    sounds.playChime();
    triggerConfetti();
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: 'trial_sent' } : c));
    toast.success(`🎯 Clan Trial & Scrim Contract invite dispatched to ${tag}!`);
  };

  const filtered = candidates.filter(c => filterGame === 'all' || c.game === filterGame);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Scouting & Talent Radar</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Discover Rising Indian Pro Players & Send Clan Scrim Invites</p>
          </div>
        </div>

        <div className="flex gap-2">
          {['all', 'BGMI', 'Valorant'].map((g) => (
            <Button
              key={g}
              size="sm"
              variant={filterGame === g ? 'default' : 'outline'}
              onClick={() => {
                sounds.playPop();
                setFilterGame(g as any);
              }}
              className={cn("rounded-2xl text-xs font-bold font-mono", filterGame === g && "bg-primary text-primary-foreground")}
            >
              {g === 'all' ? 'All Games' : g}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="space-y-4">
          {filtered.map((player) => (
            <div
              key={player.id}
              className="surface-1 rounded-3xl p-6 border border-border/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary">
                  <AvatarImage src={player.avatar} />
                  <AvatarFallback>{player.name[0]}</AvatarFallback>
                </Avatar>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[0.65rem] font-mono font-bold">
                      {player.game}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{player.role}</span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-foreground mt-0.5">{player.gamerTag}</h3>
                  <span className="text-xs text-muted-foreground">{player.name}</span>
                </div>
              </div>

              {/* Combat Telemetry */}
              <div className="grid grid-cols-3 gap-4 text-center font-mono text-xs">
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/30">
                  <span className="text-muted-foreground text-[0.6rem] uppercase block">K/D Ratio</span>
                  <strong className="font-display font-black text-lg text-primary">{player.kdRatio}</strong>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/30">
                  <span className="text-muted-foreground text-[0.6rem] uppercase block">Headshot %</span>
                  <strong className="font-display font-black text-lg text-amber-400">{player.headshotPct}%</strong>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border/30">
                  <span className="text-muted-foreground text-[0.6rem] uppercase block">Clutch Rating</span>
                  <strong className="font-display font-black text-lg text-emerald-400">{player.clutchRating}</strong>
                </div>
              </div>

              {/* Action Button */}
              <div className="sm:shrink-0">
                {player.status === 'trial_sent' ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Trial Invite Sent
                  </span>
                ) : (
                  <Button
                    onClick={() => handleSendTrial(player.id, player.gamerTag)}
                    className="w-full sm:w-auto rounded-2xl font-bold text-xs h-11 px-5 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Dispatch Clan Trial
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
