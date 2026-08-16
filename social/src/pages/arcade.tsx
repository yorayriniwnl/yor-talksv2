import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Trophy, Sparkles, Terminal, Flame, Star, Award, Shield, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CyberCricketGame } from '@/components/games/CyberCricketGame';
import { NeonHackerGame } from '@/components/games/NeonHackerGame';
import { CyberStarfighter } from '@/components/games/CyberStarfighter';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

export default function Arcade() {
  const [activeGame, setActiveGame] = useState<'cricket' | 'hacker' | 'starfighter'>('cricket');

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-primary text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Cyber Arcade & Mini-Games</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Play Instant Web Games, Climb Leaderboards & Win Karma</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Trophy className="w-3.5 h-3.5 fill-amber-400" /> Daily Karma Pool: 10,000 Pts
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Game Switcher Tabs */}
        <div className="flex gap-2 p-1.5 rounded-2xl surface-1 border border-border/40 w-fit mx-auto flex-wrap justify-center">
          <Button
            size="sm"
            variant={activeGame === 'cricket' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('cricket');
            }}
            className={cn("rounded-xl font-bold text-xs px-5 h-10", activeGame === 'cricket' && "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md")}
          >
            🏏 Cyber Cricket
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'hacker' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('hacker');
            }}
            className={cn("rounded-xl font-bold text-xs px-5 h-10", activeGame === 'hacker' && "bg-emerald-600 text-black shadow-md")}
          >
            💻 Matrix Decryption
          </Button>

          <Button
            size="sm"
            variant={activeGame === 'starfighter' ? 'default' : 'ghost'}
            onClick={() => {
              sounds.playPop();
              setActiveGame('starfighter');
            }}
            className={cn("rounded-xl font-bold text-xs px-5 h-10", activeGame === 'starfighter' && "bg-cyan-600 text-white shadow-md")}
          >
            🚀 ISRO Starfighter
          </Button>
        </div>

        {/* Active Mini-Game View */}
        <div>
          {activeGame === 'cricket' && <CyberCricketGame />}
          {activeGame === 'hacker' && <NeonHackerGame />}
          {activeGame === 'starfighter' && <CyberStarfighter />}
        </div>

        {/* Global Mini-Game Hall of Fame Leaderboard */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-sm max-w-xl mx-auto">
          <div className="showcase-section-title mb-4">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3>National Arcade Leaderboard (Season 1)</h3>
          </div>

          <div className="space-y-3">
            {[
              { rank: 1, name: 'Ayush Roy', score: '184 Runs', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', reward: '👑 Grandmaster' },
              { rank: 2, name: 'Rohan Verma', score: '162 Runs', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', reward: '🥈 Diamond' },
              { rank: 3, name: 'Anya Sharma', score: '148 Runs', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop', reward: '🥉 Platinum' },
            ].map((lead) => (
              <div key={lead.rank} className="p-3.5 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn("w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs font-mono", lead.rank === 1 ? "bg-amber-400 text-black" : "bg-muted text-muted-foreground")}>
                    {lead.rank}
                  </span>
                  <Avatar className="w-8 h-8 border border-border/40">
                    <AvatarImage src={lead.avatar} />
                    <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-xs text-foreground">{lead.name}</span>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="font-bold text-amber-400">{lead.score}</span>
                  <span className="text-[0.62rem] text-muted-foreground ml-2">{lead.reward}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
