import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Swords, Users, Calendar, Shield, Flame, CheckCircle2, 
  Play, Sparkles, ArrowRight, DollarSign, Award, Target, Crown, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { useLocation, useRoute } from 'wouter';

interface MatchTeam {
  id: string;
  name: string;
  tag: string;
  logo: string;
  score: number;
  isWinner?: boolean;
}

interface BracketMatch {
  id: string;
  round: 'Quarterfinals' | 'Semifinals' | 'Grand Finals';
  teamA: MatchTeam;
  teamB: MatchTeam;
  time: string;
  status: 'live' | 'upcoming' | 'completed';
}

interface Tournament {
  id: string;
  title: string;
  game: string;
  coverUrl: string;
  prizePoolINR: number;
  teamsCount: number;
  startDate: string;
  tier: 'Major' | 'Championship' | 'Community Cup';
  status: 'live' | 'registering' | 'concluded';
  organizer: string;
  description: string;
}

const TOURNAMENTS: Tournament[] = [
  {
    id: 'tourney-1',
    title: 'BGMI India Invitational 2026 (Season 4)',
    game: 'BGMI (Battlegrounds Mobile India)',
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    prizePoolINR: 2500000,
    teamsCount: 16,
    startDate: 'Live Now — Grand Finals',
    tier: 'Major',
    status: 'live',
    organizer: 'YOR Esports Bharat & Krafton',
    description: 'The premier national championship featuring India’s top 16 squads competing for ₹25 Lakhs and the coveted Conqueror Trophy.'
  },
  {
    id: 'tourney-2',
    title: 'Valorant South Asia Masters (Challengers)',
    game: 'Valorant South Asia',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop',
    prizePoolINR: 1000000,
    teamsCount: 8,
    startDate: 'Starts Aug 22, 2026',
    tier: 'Championship',
    status: 'registering',
    organizer: 'Mumbai Gaming Guild',
    description: 'Top radiant squads from Mumbai, Delhi, Bengaluru, and Hyderabad battle in a double-elimination tactical bracket.'
  },
  {
    id: 'tourney-3',
    title: 'CS2 India Premier League (Season 2)',
    game: 'Counter-Strike 2',
    coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200&auto=format&fit=crop',
    prizePoolINR: 750000,
    teamsCount: 8,
    startDate: 'Starts Aug 28, 2026',
    tier: 'Championship',
    status: 'registering',
    organizer: 'Yor CS League',
    description: '128-tick tournament servers with custom anti-cheat, full caster broadcast, and weapon skin drops for viewers.'
  },
  {
    id: 'tourney-4',
    title: 'FGC Asian Showdown: SF6 & Tekken 8',
    game: 'Street Fighter 6 / Tekken 8',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop',
    prizePoolINR: 500000,
    teamsCount: 32,
    startDate: 'Starts Sep 5, 2026',
    tier: 'Community Cup',
    status: 'registering',
    organizer: 'Arcade Guild Tokyo & Bharat',
    description: 'Double elimination fighting game bracket streamed live in 4K 60FPS on low-latency WebRTC.'
  },
  {
    id: 'tourney-5',
    title: 'Rocket League 3v3 Supersonic Championship',
    game: 'Rocket League',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    prizePoolINR: 350000,
    teamsCount: 16,
    startDate: 'Starts Sep 12, 2026',
    tier: 'Community Cup',
    status: 'registering',
    organizer: 'Supersonic Arena',
    description: 'High-flying aerial physics tournament with live caster telemetry overlay and instant replay clips.'
  },
  {
    id: 'tourney-6',
    title: 'WebGPU Speed Shading & 64k Code Duel',
    game: 'Creative Code & WebGL',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    prizePoolINR: 200000,
    teamsCount: 64,
    startDate: 'Starts Sep 20, 2026',
    tier: 'Community Cup',
    status: 'registering',
    organizer: 'ShaderToy Bharat Community',
    description: 'Live 25-minute speed shading battle writing real-time ray marchers and GLSL vertex shaders directly in browser.'
  }
];

const BRACKET_MATCHES: BracketMatch[] = [
  {
    id: 'm1',
    round: 'Quarterfinals',
    teamA: { id: 't1', name: 'GodLike Esports', tag: 'GODL', logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', score: 2, isWinner: true },
    teamB: { id: 't2', name: 'Team SouL', tag: 'SOUL', logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', score: 1 },
    time: 'Completed',
    status: 'completed'
  },
  {
    id: 'm2',
    round: 'Quarterfinals',
    teamA: { id: 't3', name: 'Global Esports', tag: 'GE', logo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop', score: 2, isWinner: true },
    teamB: { id: 't4', name: 'Entity Gaming', tag: 'ENT', logo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop', score: 0 },
    time: 'Completed',
    status: 'completed'
  },
  {
    id: 'm3',
    round: 'Semifinals',
    teamA: { id: 't1', name: 'GodLike Esports', tag: 'GODL', logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', score: 1 },
    teamB: { id: 't3', name: 'Global Esports', tag: 'GE', logo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop', score: 1 },
    time: 'LIVE NOW (Map 3 Decider)',
    status: 'live'
  },
  {
    id: 'm4',
    round: 'Grand Finals',
    teamA: { id: 't_pending1', name: 'Winner of SF1', tag: 'TBD', logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop', score: 0 },
    teamB: { id: 't_pending2', name: 'Team Velocity (SF2)', tag: 'VEL', logo: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop', score: 0 },
    time: 'Tomorrow, 7:00 PM IST',
    status: 'upcoming'
  }
];

export default function Tournaments() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>('/tournaments/:id');
  const activeTourneyId = params?.id;

  const [tournaments, setTournaments] = useState(TOURNAMENTS);
  const [activeTab, setActiveTab] = useState<'bracket' | 'teams' | 'predictions'>('bracket');
  const [pickemPredictions, setPickemPredictions] = useState<Record<string, string>>({});
  const [selectedTournament, setSelectedTournament] = useState(
    activeTourneyId ? TOURNAMENTS.find(t => t.id === activeTourneyId) || TOURNAMENTS[0] : TOURNAMENTS[0]
  );

  const handlePredictWinner = (matchId: string, teamName: string) => {
    sounds.playPop();
    setPickemPredictions(prev => ({ ...prev, [matchId]: teamName }));
    triggerConfetti();
    toast.success(`Prediction locked for ${teamName}! +100 Karma Points on match win.`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Esports Arena</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">National Tournaments, Live Brackets & Squad Leagues</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Crown className="w-3.5 h-3.5 fill-amber-400" /> ₹42,50,000 Total Prize Pool
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Featured Tournament Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-border/40 surface-1 shadow-lg">
          <div className="h-64 sm:h-80 relative overflow-hidden bg-black">
            <img src={selectedTournament.coverUrl} alt="" className="w-full h-full object-cover opacity-80 transition-transform duration-700 hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-black/30" />
            
            {/* Live Indicator */}
            {selectedTournament.status === 'live' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-mono font-bold shadow-lg border border-white/20">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" /> LIVE BROADCAST
              </div>
            )}

            <div className="absolute bottom-6 left-4 sm:left-6 right-4 sm:right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-xs font-mono font-bold text-primary mb-2">
                  <Shield className="w-3.5 h-3.5" /> {selectedTournament.game}
                </span>
                <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight leading-tight">
                  {selectedTournament.title}
                </h2>
                <div className="flex items-center gap-4 text-xs font-mono text-zinc-300 mt-2">
                  <span className="text-amber-400 font-bold text-sm">₹{selectedTournament.prizePoolINR.toLocaleString()} INR Prize Pool</span>
                  <span>·</span>
                  <span>{selectedTournament.teamsCount} Elite Squads</span>
                  <span>·</span>
                  <span>{selectedTournament.organizer}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setLocation(`/live/${selectedTournament.id}`)}
                  className="rounded-2xl font-bold text-xs px-6 h-11 bg-rose-600 hover:bg-rose-700 text-white glow-neon-primary shadow-lg"
                >
                  <Play className="w-4 h-4 mr-1.5 fill-white" /> Watch Live Match
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Selector Carousel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                sounds.playPop();
                setSelectedTournament(t);
              }}
              className={cn(
                "p-4 rounded-3xl border text-left cursor-pointer transition-all duration-200 flex items-center justify-between",
                selectedTournament.id === t.id
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border/40 surface-1 hover:border-border"
              )}
            >
              <div className="min-w-0">
                <span className="text-[0.62rem] font-mono uppercase text-primary font-bold">{t.game}</span>
                <h4 className="font-display font-bold text-sm text-foreground truncate">{t.title}</h4>
                <p className="text-xs font-mono text-amber-400 font-bold mt-0.5">₹{t.prizePoolINR.toLocaleString()}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>

        {/* Tournament Arena Tabs */}
        <div className="flex gap-2 p-1.5 rounded-2xl surface-1 border border-border/40 w-fit">
          <Button
            size="sm"
            variant={activeTab === 'bracket' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('bracket')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'bracket' && "bg-primary text-primary-foreground shadow-md")}
          >
            <Swords className="w-3.5 h-3.5 mr-1.5" /> Live Tournament Bracket
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'predictions' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('predictions')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'predictions' && "bg-amber-600 text-white shadow-md")}
          >
            <Target className="w-3.5 h-3.5 mr-1.5" /> Fan Pick'em Predictions (Win Karma)
          </Button>
        </div>

        {activeTab === 'bracket' ? (
          /* Live Tournament Bracket Visualization */
          <div className="space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm">
              <div className="showcase-section-title mb-6">
                <Swords className="w-4 h-4 text-primary" />
                <h3>Championship Bracket (Bo3 Single Elimination)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {BRACKET_MATCHES.map((match) => (
                  <div key={match.id} className="p-4 rounded-2xl bg-muted/30 border border-border/40 flex flex-col justify-between group hover:border-primary/40 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-3 text-xs font-mono">
                        <span className="font-bold text-primary">{match.round}</span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[0.65rem] font-bold", match.status === 'live' ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse" : "text-muted-foreground")}>
                          {match.time}
                        </span>
                      </div>

                      {/* Team A */}
                      <div className={cn("flex items-center justify-between p-2.5 rounded-xl mb-2 transition-all", match.teamA.isWinner ? "bg-primary/20 border border-primary/40 font-bold" : "bg-black/30")}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-7 h-7 border border-border/40">
                            <AvatarImage src={match.teamA.logo} />
                            <AvatarFallback>{match.teamA.tag}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-foreground truncate">{match.teamA.name}</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-foreground">{match.teamA.score}</span>
                      </div>

                      {/* Team B */}
                      <div className={cn("flex items-center justify-between p-2.5 rounded-xl transition-all", match.teamB.isWinner ? "bg-primary/20 border border-primary/40 font-bold" : "bg-black/30")}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-7 h-7 border border-border/40">
                            <AvatarImage src={match.teamB.logo} />
                            <AvatarFallback>{match.teamB.tag}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-foreground truncate">{match.teamB.name}</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-foreground">{match.teamB.score}</span>
                      </div>
                    </div>

                    {match.status === 'live' && (
                      <Button
                        size="sm"
                        onClick={() => setLocation(`/live/${selectedTournament.id}`)}
                        className="mt-4 w-full rounded-xl font-bold text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        <Play className="w-3 h-3 mr-1 fill-white" /> Watch Match Live
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Fan Pick'em Predictions */
          <div className="space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm">
              <div className="showcase-section-title mb-2">
                <Target className="w-4 h-4 text-amber-400" />
                <h3>Match Predictions & Fan Pick'em Game</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-6">Pick the winner for upcoming matches. Correct predictions earn +100 Karma & YOR Points!</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {BRACKET_MATCHES.filter(m => m.status !== 'completed').map((match) => {
                  const currentPick = pickemPredictions[match.id];

                  return (
                    <div key={match.id} className="p-5 rounded-3xl bg-muted/20 border border-border/40 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4 text-xs font-mono">
                        <span className="font-bold text-foreground">{match.round}</span>
                        <span className="text-amber-400 font-bold">+100 Karma Reward</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <Button
                          variant="outline"
                          onClick={() => handlePredictWinner(match.id, match.teamA.name)}
                          className={cn(
                            "h-16 rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-all",
                            currentPick === match.teamA.name ? "border-amber-400 bg-amber-500/20 text-amber-300 font-bold" : "border-border/60"
                          )}
                        >
                          <span className="text-xs truncate">{match.teamA.name}</span>
                          <span className="text-[0.62rem] font-mono text-muted-foreground">Pick Winner</span>
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handlePredictWinner(match.id, match.teamB.name)}
                          className={cn(
                            "h-16 rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-all",
                            currentPick === match.teamB.name ? "border-amber-400 bg-amber-500/20 text-amber-300 font-bold" : "border-border/60"
                          )}
                        >
                          <span className="text-xs truncate">{match.teamB.name}</span>
                          <span className="text-[0.62rem] font-mono text-muted-foreground">Pick Winner</span>
                        </Button>
                      </div>

                      {currentPick && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pick Locked: {currentPick}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
