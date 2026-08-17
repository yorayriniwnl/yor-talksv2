import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Flame, Gavel, IndianRupee, Users, 
  Sparkles, CheckCircle2, RotateCcw, Star 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface AuctionPlayer {
  id: string;
  name: string;
  role: string;
  basePrice: number;
  currentBid: number;
  highestBidder: string;
  avatar: string;
  status: 'live' | 'sold' | 'upcoming';
}

const INITIAL_PLAYERS: AuctionPlayer[] = [
  {
    id: 'cr-1',
    name: 'Virat Kohli (The King)',
    role: 'Top-Order Batter / Anchor',
    basePrice: 20000000, // 2 Cr
    currentBid: 185000000, // 18.5 Cr
    highestBidder: 'Bengaluru Cyber Challengers',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    status: 'live'
  },
  {
    id: 'cr-2',
    name: 'Jasprit Bumrah (Boom Boom)',
    role: 'Right-Arm Fast / Death Specialist',
    basePrice: 20000000,
    currentBid: 210000000,
    highestBidder: 'Mumbai Cyber Indians',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    status: 'upcoming'
  },
  {
    id: 'cr-3',
    name: 'Rohit Sharma (Hitman)',
    role: 'Opening Batter / Captain',
    basePrice: 20000000,
    currentBid: 160000000,
    highestBidder: 'To Be Decided',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
    status: 'upcoming'
  }
];

export default function CricketAuctionArena() {
  const [players, setPlayers] = useState<AuctionPlayer[]>(INITIAL_PLAYERS);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [userPurse, setUserPurse] = useState(1000000000); // 100 Cr
  const [countdown, setCountdown] = useState(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activePlayer = players[activePlayerIndex];

  // 15s Hammer countdown
  useEffect(() => {
    if (activePlayer && activePlayer.status === 'live' && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            handleSold(activePlayer);
            return 15;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activePlayer, countdown]);

  const handleSold = (player: AuctionPlayer) => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`🔨 SOLD! ${player.name} goes to ${player.highestBidder} for ₹${(player.currentBid / 10000000).toFixed(2)} Cr!`);
    setPlayers(prev => prev.map((p, idx) => idx === activePlayerIndex ? { ...p, status: 'sold' } : p));
  };

  const handlePlaceBid = (increment: number) => {
    sounds.playPop();
    const newBid = activePlayer.currentBid + increment;
    if (newBid > userPurse) {
      toast.error('❌ Insufficient Franchise Purse Balance!');
      return;
    }

    setCountdown(15); // Reset hammer timer
    setPlayers(prev => prev.map((p, idx) => idx === activePlayerIndex ? {
      ...p,
      currentBid: newBid,
      highestBidder: 'Your Franchise (Yor Squad)'
    } : p));
    toast.success(`⚡ Raised Bid to ₹${(newBid / 10000000).toFixed(2)} Cr!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Premier Cricket Mega Auction</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live Paddle Bidding Arena & Franchise Roster Builder</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <IndianRupee className="w-3.5 h-3.5 text-emerald-400" /> Purse: ₹{(userPurse / 10000000).toFixed(2)} Cr
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Auction Podium Column */}
          <div className="lg:col-span-7">
            <div className="surface-1 rounded-3xl p-8 border border-border/40 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-red-600/20 text-red-500 border border-red-500/30 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> LIVE ON PODIUM
                </span>
                <div className="text-right font-mono text-xs">
                  <span className="text-muted-foreground block text-[0.6rem] uppercase">Hammer Timer</span>
                  <strong className="font-display font-black text-xl text-amber-400">{countdown}s</strong>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <Avatar className="w-20 h-20 border-4 border-amber-500 shadow-xl">
                  <AvatarImage src={activePlayer.avatar} />
                  <AvatarFallback>{activePlayer.name[0]}</AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="font-display font-black text-2xl text-foreground">{activePlayer.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{activePlayer.role}</p>
                </div>
              </div>

              {/* Current Bid Display */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-border/40 font-mono flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground text-[0.65rem] uppercase block">Current Highest Bid</span>
                  <strong className="font-display font-black text-2xl text-primary">
                    ₹{(activePlayer.currentBid / 10000000).toFixed(2)} Cr
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[0.65rem] uppercase block">Leading Paddle</span>
                  <span className="text-xs font-bold text-foreground">{activePlayer.highestBidder}</span>
                </div>
              </div>

              {/* Bidding Controls */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-mono text-muted-foreground block">Raise Franchise Paddle:</span>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handlePlaceBid(5000000)} // +50L
                    className="rounded-2xl font-bold font-mono text-xs h-12 bg-muted/60 hover:bg-muted text-foreground border border-border/40"
                  >
                    + ₹50 Lakhs
                  </Button>
                  <Button
                    onClick={() => handlePlaceBid(10000000)} // +1 Cr
                    className="rounded-2xl font-bold font-mono text-xs h-12 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                  >
                    + ₹1.00 Crore
                  </Button>
                  <Button
                    onClick={() => handlePlaceBid(20000000)} // +2 Cr
                    className="rounded-2xl font-bold font-mono text-xs h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black shadow-lg"
                  >
                    + ₹2.00 Crore
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Marquee Pool Column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="showcase-section-title">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3>Marquee Player Pool</h3>
            </div>

            <div className="space-y-3">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between transition-all",
                    idx === activePlayerIndex ? "border-amber-400 bg-amber-500/10 shadow" : "border-border/40 surface-1"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarImage src={p.avatar} />
                      <AvatarFallback>{p.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-display font-bold text-sm text-foreground">{p.name}</h4>
                      <span className="text-xs font-mono text-muted-foreground">Base: ₹{(p.basePrice / 10000000).toFixed(2)} Cr</span>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    {p.status === 'sold' ? (
                      <span className="text-emerald-400 font-bold">SOLD ✓</span>
                    ) : idx === activePlayerIndex ? (
                      <span className="text-amber-400 font-bold">ON PODIUM</span>
                    ) : (
                      <span className="text-muted-foreground">UPCOMING</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
