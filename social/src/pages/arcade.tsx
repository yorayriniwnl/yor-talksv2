import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Sparkles, Star, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

const FEATURED_GAMES = [
  { id: 'g1', name: 'Cyber Cricket', genre: 'Sports', icon: '🏏', players: '24K', status: 'coming-soon' },
  { id: 'g2', name: 'Neon Hacker', genre: 'Puzzle', icon: '💻', players: '18K', status: 'coming-soon' },
  { id: 'g3', name: 'Starfighter', genre: 'Shooter', icon: '🚀', players: '31K', status: 'coming-soon' },
  { id: 'g4', name: 'Cyber Chess', genre: 'Strategy', icon: '♟️', players: '12K', status: 'coming-soon' },
  { id: 'g5', name: 'Snake Neon', genre: 'Classic', icon: '🐍', players: '42K', status: 'coming-soon' },
  { id: 'g6', name: '2048 Cyber', genre: 'Puzzle', icon: '🔢', players: '38K', status: 'coming-soon' },
];

export default function Arcade() {
  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-red-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Cyber Arcade</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Mini-Games & Challenges</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Coming Soon Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl surface-1 border border-border/40 p-8 text-center"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Construction className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display font-extrabold text-2xl mb-3">Arcade is Being Rebuilt</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6 font-serif leading-relaxed">
              We're rebuilding the arcade from the ground up with real multiplayer games, 
              leaderboards, and rewards. Stay tuned for the next-gen gaming experience.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button asChild className="rounded-2xl font-bold text-xs glow-neon-primary">
                <Link href="/tournaments">
                  <Trophy className="w-4 h-4 mr-2" /> Browse Tournaments
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl font-bold text-xs">
                <Link href="/explore">
                  <Sparkles className="w-4 h-4 mr-2" /> Explore
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Preview Cards */}
        <div>
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Coming Soon
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {FEATURED_GAMES.map((game) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="surface-1 rounded-2xl border border-border/40 p-4 text-center hover:border-primary/30 transition-colors group"
              >
                <div className="text-4xl mb-3">{game.icon}</div>
                <h4 className="font-display font-bold text-sm mb-1 group-hover:text-primary transition-colors">{game.name}</h4>
                <p className="text-[0.68rem] text-muted-foreground font-mono">{game.genre} · {game.players} waiting</p>
                <span className="inline-block mt-2 text-[0.6rem] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
