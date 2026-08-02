import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Clock, Play, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

export interface GameItem {
  id: string;
  title: string;
  bannerUrl: string;
  hoursPlayed: number;
  recentHours: number;
  achievementsUnlocked: number;
  totalAchievements: number;
  lastPlayed: string;
  badge: string;
}

const STEAM_GAMES: GameItem[] = [
  {
    id: 'game-1',
    title: 'Cyberpunk 2077: Phantom Liberty',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    hoursPlayed: 342,
    recentHours: 24.5,
    achievementsUnlocked: 44,
    totalAchievements: 45,
    lastPlayed: 'Yesterday',
    badge: 'Legendary Mercenary'
  },
  {
    id: 'game-2',
    title: 'Elden Ring: Shadow of the Erdtree',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop',
    hoursPlayed: 512,
    recentHours: 18.2,
    achievementsUnlocked: 42,
    totalAchievements: 42,
    lastPlayed: '3 days ago',
    badge: 'Elden Lord'
  },
  {
    id: 'game-3',
    title: 'Counter-Strike 2',
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200&auto=format&fit=crop',
    hoursPlayed: 1240,
    recentHours: 32.0,
    achievementsUnlocked: 1,
    totalAchievements: 1,
    lastPlayed: 'Today',
    badge: 'Global Elite'
  }
];

export function SteamGameShowcase() {
  const [selectedGame, setSelectedGame] = useState<GameItem>(STEAM_GAMES[0]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center glow-neon-primary">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              Steam Gaming Showcase
              <span className="text-[0.62rem] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                Level 88
              </span>
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Recent Activity & Achievement Progress</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-muted-foreground hidden sm:block">
          <span className="text-foreground font-bold">74.7 hrs</span> last 2 weeks
        </div>
      </div>

      {/* Featured Active Game Banner */}
      <div className="relative h-48 rounded-2xl overflow-hidden mb-6 border border-border/40 group">
        <img src={selectedGame.bannerUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-[0.65rem] font-mono font-bold text-primary mb-1.5">
              <Sparkles className="w-3 h-3" /> {selectedGame.badge}
            </div>
            <h4 className="font-display font-extrabold text-lg text-white leading-tight">{selectedGame.title}</h4>
            <div className="flex items-center gap-4 text-xs font-mono text-white/80 mt-1">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary" /> {selectedGame.hoursPlayed} hrs on record</span>
              <span>&middot;</span>
              <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-400" /> {selectedGame.achievementsUnlocked}/{selectedGame.totalAchievements} achievements</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => sounds.playChime()}
            className="rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary px-4 h-9 hidden sm:flex"
          >
            <Play className="w-3.5 h-3.5 mr-1 fill-black" /> Launch Game
          </Button>
        </div>
      </div>

      {/* Game Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEAM_GAMES.map((game) => {
          const isSelected = selectedGame.id === game.id;
          const percentage = Math.round((game.achievementsUnlocked / game.totalAchievements) * 100);

          return (
            <button
              key={game.id}
              onClick={() => {
                sounds.playPop();
                setSelectedGame(game);
              }}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between",
                isSelected
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border/40 surface-1 hover:border-border"
              )}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border/40">
                  <img src={game.bannerUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-xs truncate leading-tight">{game.title}</h5>
                  <p className="text-[0.65rem] text-muted-foreground font-mono">{game.hoursPlayed} hrs</p>
                </div>
              </div>

              {/* Achievement Bar */}
              <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden mt-1">
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
