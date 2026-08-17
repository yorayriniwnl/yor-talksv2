import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Swords, Crown, Copy, Sparkles, 
  CheckCircle2, Flame, Award, Shield, Monitor 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface TeamScore {
  name: string;
  tag: string;
  score: number;
  kills: number;
  logo: string;
}

export default function ScoreboardStudio() {
  const [teamA, setTeamA] = useState<TeamScore>({
    name: 'Team GodLike',
    tag: 'GODL',
    score: 13,
    kills: 48,
    logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
  });

  const [teamB, setTeamB] = useState<TeamScore>({
    name: 'Team Soul',
    tag: 'SOUL',
    score: 11,
    kills: 42,
    logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'
  });

  const [tournamentName, setTournamentName] = useState('BGIS Grand Finals 2026 🏆');
  const [mapName, setMapName] = useState('Map 3 - Ascent (Bo3 Decider)');
  const [mvpPlayer, setMvpPlayer] = useState('Jonathan Gaming (28 Kills)');

  const handleCopyOBS = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor.bharat/overlay/live-scoreboard?id=${Date.now()}`);
    toast.success('📋 OBS 1080p Transparent Browser Source URL copied to clipboard!');
  };

  const adjustScore = (team: 'A' | 'B', delta: number) => {
    sounds.playPop();
    if (team === 'A') {
      setTeamA(prev => ({ ...prev, score: Math.max(0, prev.score + delta) }));
    } else {
      setTeamB(prev => ({ ...prev, score: Math.max(0, prev.score + delta) }));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Match Scoreboard & HUD Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live Broadcast Scoreboard Generator with OBS Transparent Source</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBS}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Browser Link
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Live HUD Preview Container */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-primary flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" /> 1080P BROADCAST OVERLAY PREVIEW
            </span>
            <span className="text-[0.65rem] font-mono text-muted-foreground bg-muted/40 px-2.5 py-0.5 rounded-full">
              AUTO-REFRESH: 60 FPS
            </span>
          </div>

          {/* Actual Scoreboard HUD Widget */}
          <div className="p-6 rounded-3xl bg-zinc-950/90 border-2 border-zinc-800 shadow-2xl backdrop-blur-xl max-w-2xl mx-auto">
            <div className="text-center font-mono text-xs mb-3">
              <span className="font-bold text-foreground block">{tournamentName}</span>
              <span className="text-[0.68rem] text-muted-foreground">{mapName}</span>
            </div>

            <div className="flex items-center justify-between gap-6">
              {/* Team A */}
              <div className="flex items-center gap-4 flex-1">
                <Avatar className="w-14 h-14 border-2 border-primary">
                  <AvatarImage src={teamA.logo} />
                  <AvatarFallback>{teamA.tag}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-display font-black text-lg text-foreground">{teamA.name}</h3>
                  <span className="text-xs font-mono text-muted-foreground">{teamA.kills} Total Kills</span>
                </div>
              </div>

              {/* Center Match Score */}
              <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-700 px-6 py-2 rounded-2xl shadow-inner font-display font-black text-3xl">
                <span className="text-primary">{teamA.score}</span>
                <span className="text-zinc-600 text-xl font-normal">:</span>
                <span className="text-rose-500">{teamB.score}</span>
              </div>

              {/* Team B */}
              <div className="flex items-center gap-4 flex-1 justify-end text-right">
                <div>
                  <h3 className="font-display font-black text-lg text-foreground">{teamB.name}</h3>
                  <span className="text-xs font-mono text-muted-foreground">{teamB.kills} Total Kills</span>
                </div>
                <Avatar className="w-14 h-14 border-2 border-rose-500">
                  <AvatarImage src={teamB.logo} />
                  <AvatarFallback>{teamB.tag}</AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Match MVP Bar */}
            <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[0.68rem] font-mono">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Crown className="w-3 h-3" /> MATCH MVP: {mvpPlayer}
              </span>
              <span className="text-emerald-400 font-bold">MATCH POINT</span>
            </div>
          </div>
        </div>

        {/* Scoreboard Editor Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Team A Controls */}
          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-4 shadow-sm font-sans">
            <h4 className="font-display font-bold text-sm text-primary">Team A Score & Kills</h4>
            <div className="flex items-center gap-3">
              <Button onClick={() => adjustScore('A', -1)} variant="outline" className="rounded-xl h-9 px-3">-1 Round</Button>
              <strong className="text-xl font-display font-black">{teamA.score}</strong>
              <Button onClick={() => adjustScore('A', 1)} className="rounded-xl h-9 px-3 bg-primary text-primary-foreground">+1 Round</Button>
            </div>
          </div>

          {/* Team B Controls */}
          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-4 shadow-sm font-sans">
            <h4 className="font-display font-bold text-sm text-rose-500">Team B Score & Kills</h4>
            <div className="flex items-center gap-3">
              <Button onClick={() => adjustScore('B', -1)} variant="outline" className="rounded-xl h-9 px-3">-1 Round</Button>
              <strong className="text-xl font-display font-black">{teamB.score}</strong>
              <Button onClick={() => adjustScore('B', 1)} className="rounded-xl h-9 px-3 bg-rose-500 text-white">+1 Round</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
