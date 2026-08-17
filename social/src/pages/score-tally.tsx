import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Sparkles, Copy, 
  Tv, Swords, Shield, Plus, Minus, CheckCircle2, Crown, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function ScoreTallyStudio() {
  const [team1Name, setTeam1Name] = useState('SOUL ESPORTS');
  const [team2Name, setTeam2Name] = useState('GODLIKE');
  const [team1Score, setTeam1Score] = useState(1);
  const [team2Score, setTeam2Score] = useState(1);
  const [matchFormat, setMatchFormat] = useState<'BO3' | 'BO5'>('BO3');

  const handleCopyScoreboardSource = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/score-tally?format=${matchFormat}&t1=${encodeURIComponent(team1Name)}&t2=${encodeURIComponent(team2Name)}`);
    toast.success('📋 OBS Studio Transparent 60FPS Match Score Tally Overlay URL copied!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tournament Series Score Tally HUD</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Bo3 / Bo5 Match Series Scoreboard, Map Points Counter & OBS Browser Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyScoreboardSource}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Tally URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Live Scoreboard Display */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary font-mono text-xs font-bold">
            <Crown className="w-3.5 h-3.5" /> GRAND FINALS • {matchFormat} DECIDER SERIES
          </div>

          <div className="grid grid-cols-3 items-center gap-4">
            <div className="space-y-2">
              <h3 className="font-display font-black text-2xl text-foreground">{team1Name}</h3>
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setTeam1Score(s => Math.max(0, s - 1))} className="rounded-xl h-8 w-8 p-0">
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <span className="font-display font-black text-4xl text-primary">{team1Score}</span>
                <Button size="sm" variant="outline" onClick={() => setTeam1Score(s => s + 1)} className="rounded-xl h-8 w-8 p-0">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="text-center font-mono text-muted-foreground font-bold text-xl">
              VS
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-black text-2xl text-foreground">{team2Name}</h3>
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setTeam2Score(s => Math.max(0, s - 1))} className="rounded-xl h-8 w-8 p-0">
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <span className="font-display font-black text-4xl text-orange-400">{team2Score}</span>
                <Button size="sm" variant="outline" onClick={() => setTeam2Score(s => s + 1)} className="rounded-xl h-8 w-8 p-0">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
