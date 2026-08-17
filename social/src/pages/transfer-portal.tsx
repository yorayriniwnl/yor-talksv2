import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, IndianRupee, Sparkles, CheckCircle2, 
  Send, ShieldCheck, Flame, Star, Award, Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface TransferListing {
  id: string;
  player: string;
  game: string;
  currentTeam: string;
  role: string;
  buyoutPrice: number;
  avatar: string;
  status: 'available' | 'bid_submitted';
}

const LISTINGS: TransferListing[] = [
  {
    id: 'tr-1',
    player: 'ScoutOP Cyber ⚡',
    game: 'BGMI',
    currentTeam: 'Free Agent',
    role: 'Assaulter / Scout',
    buyoutPrice: 4500000,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    status: 'available'
  },
  {
    id: 'tr-2',
    player: 'Jonathan King 👑',
    game: 'BGMI',
    currentTeam: 'Team GodLike',
    role: 'Primary Fragger',
    buyoutPrice: 6500000,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    status: 'available'
  },
  {
    id: 'tr-3',
    player: 'SkRossi Prime 🎯',
    game: 'Valorant',
    currentTeam: 'Reckoning Esports',
    role: 'Jett / Duelist',
    buyoutPrice: 3500000,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
    status: 'available'
  }
];

export default function TransferPortal() {
  const [listings, setListings] = useState<TransferListing[]>(LISTINGS);

  const handleSubmitBid = (id: string, playerName: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'bid_submitted' } : l));
    toast.success(`🎉 Official Transfer Offer of ₹${(price / 100000).toFixed(1)}L submitted for ${playerName}!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Esports Player Transfer & Trade Window</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Official Roster Buyouts, Free Agency & Escrow Transfers</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> BGIS Trade Window: OPEN
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="space-y-4">
          {listings.map((l) => (
            <div
              key={l.id}
              className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 border-2 border-primary">
                  <AvatarImage src={l.avatar} />
                  <AvatarFallback>{l.player[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[0.62rem] font-mono font-bold">
                      {l.game}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{l.currentTeam}</span>
                  </div>
                  <h3 className="font-display font-black text-lg text-foreground mt-0.5">{l.player}</h3>
                  <span className="text-xs font-mono text-muted-foreground">{l.role}</span>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 font-mono text-xs">
                <div className="text-right">
                  <span className="text-[0.65rem] text-muted-foreground uppercase block">Buyout Clause</span>
                  <strong className="font-display font-black text-xl text-emerald-400">
                    ₹{(l.buyoutPrice / 100000).toFixed(1)} Lakhs INR
                  </strong>
                </div>

                {l.status === 'bid_submitted' ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Offer In Review
                  </span>
                ) : (
                  <Button
                    onClick={() => handleSubmitBid(l.id, l.player, l.buyoutPrice)}
                    className="rounded-2xl font-bold text-xs h-11 px-5 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Buyout Offer
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
