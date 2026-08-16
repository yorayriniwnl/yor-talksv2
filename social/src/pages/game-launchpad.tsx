import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Gamepad2, Key, Sparkles, CheckCircle2, 
  IndianRupee, Flame, ShieldCheck, Download, Star 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface IndieGame {
  id: string;
  title: string;
  studio: string;
  genre: string;
  rating: number;
  backers: number;
  fundingRaised: number;
  goal: number;
  banner: string;
}

const INDIE_GAMES: IndieGame[] = [
  {
    id: 'g1',
    title: 'Kurukshetra: Cyber Ascension 🔱',
    studio: 'Studio Antariksh (Bengaluru)',
    genre: 'Mythological Cyberpunk Action RPG',
    rating: 4.9,
    backers: 3420,
    fundingRaised: 1850000,
    goal: 2000000,
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 'g2',
    title: 'Mumbai Cyberpunk 2040 🏙️',
    studio: 'Desi Pixels (Mumbai)',
    genre: 'Open-World Neon Detective Thriller',
    rating: 4.8,
    backers: 2890,
    fundingRaised: 1420000,
    goal: 1500000,
    banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop'
  }
];

export default function GameLaunchpad() {
  const [claimedKeys, setClaimedKeys] = useState<{ [gameId: string]: string }>({});

  const handleClaimSteamKey = (gameId: string, title: string) => {
    sounds.playChime();
    triggerConfetti();
    const fakeKey = `YOR-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setClaimedKeys(prev => ({ ...prev, [gameId]: fakeKey }));
    toast.success(`🎉 Alpha Steam Key generated for ${title}!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Indie Game Developer Launchpad</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Back India&apos;s Next AAA Titles & Claim Steam Beta Keys</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Gamepad2 className="w-3.5 h-3.5 text-primary" /> ₹32.7L Raised for Indian Devs
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {INDIE_GAMES.map((game) => {
            const key = claimedKeys[game.id];
            const pct = Math.round((game.fundingRaised / game.goal) * 100);

            return (
              <div
                key={game.id}
                className="surface-1 rounded-3xl overflow-hidden border border-border/40 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 relative overflow-hidden">
                    <img src={game.banner} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-amber-400 text-xs font-mono font-bold flex items-center gap-1 border border-amber-400/30">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> {game.rating}
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <span className="text-xs font-mono text-primary font-bold">{game.genre}</span>
                      <h3 className="font-display font-bold text-lg text-foreground mt-0.5">{game.title}</h3>
                      <span className="text-xs font-mono text-muted-foreground">{game.studio}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-emerald-400 font-bold">₹{game.fundingRaised.toLocaleString()} Raised</span>
                        <span className="text-muted-foreground">{pct}% of ₹{game.goal.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-muted/60 overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 space-y-3">
                  {key ? (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center font-mono text-xs space-y-1">
                      <span className="text-muted-foreground text-[0.62rem] uppercase block">Steam Beta Key</span>
                      <strong className="text-emerald-400 font-bold text-sm tracking-wider">{key}</strong>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleClaimSteamKey(game.id, game.title)}
                      className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                    >
                      <Key className="w-3.5 h-3.5 mr-1.5" /> Back Game & Claim Alpha Steam Key (₹299)
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
