import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, Star, Download, Sparkles, Trophy, Play, Check, 
  ExternalLink, Eye, ShieldCheck, Heart, MessageCircle, Flame 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

interface IndieGame {
  id: string;
  title: string;
  genre: string;
  studio: string;
  location: string;
  rating: number;
  reviewsCount: number;
  coverUrl: string;
  priceINR: number;
  tags: string[];
  description: string;
  verifiedDev: boolean;
}

const INDIE_GAMES: IndieGame[] = [
  {
    id: 'game-1',
    title: 'Project Maya: Vedic Cyberpunk 2099',
    genre: 'Action RPG / Cyberpunk',
    studio: 'Bengaluru Spatial Studios',
    location: 'Bengaluru, Karnataka',
    rating: 4.9,
    reviewsCount: 1420,
    coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
    priceINR: 1499,
    tags: ['Ray Tracing', 'Single Player', 'Unreal Engine 5.4', 'Story Rich'],
    description: 'An open-world neo-cyberpunk adventure set in futuristic 2099 Bengaluru combining ancient Vedic lore with high-octane katana combat and cyberware hacking.',
    verifiedDev: true
  },
  {
    id: 'game-2',
    title: 'Mumbai Noir: The Monsoon Detective',
    genre: 'Detective Noir / Narrative',
    studio: 'Bandra Pixel Guild',
    location: 'Mumbai, Maharashtra',
    rating: 4.8,
    reviewsCount: 890,
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
    priceINR: 799,
    tags: ['Atmospheric', 'Jazz Soundtrack', 'Multiple Endings', 'Indie Gem'],
    description: 'Step into the rain-drenched streets of 1980s Mumbai as a private detective solving high-stakes corporate espionage in the heart of South Bombay.',
    verifiedDev: true
  },
  {
    id: 'game-3',
    title: 'Gali Cricket: Street Legends 2026',
    genre: 'Arcade Sports / Multiplayer',
    studio: 'Delhi Overclock Games',
    location: 'New Delhi',
    rating: 4.7,
    reviewsCount: 3200,
    coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=1200&auto=format&fit=crop',
    priceINR: 499,
    tags: ['Multiplayer', 'Fast-Paced', 'Ranked Matchmaking', 'Soundtrack 10/10'],
    description: 'High adrenaline underground street cricket with trick shots, rooftop pitches in Chandni Chowk, and hyper-stylized superpower abilities.',
    verifiedDev: true
  }
];

export default function Bazaar() {
  const [games, setGames] = useState(INDIE_GAMES);
  const [selectedGame, setSelectedGame] = useState(INDIE_GAMES[0]);
  const [wishlisted, setWishlisted] = useState<Record<string, boolean>>({});

  const handleWishlist = (id: string) => {
    sounds.playPop();
    setWishlisted(prev => ({ ...prev, [id]: !prev[id] }));
    if (!wishlisted[id]) {
      toast.info('Wishlist preview updated locally. Release notifications are not connected yet.');
    } else {
      toast.info('Removed from wishlist');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Indie Game Hub</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Showcase preview · digital purchases are not connected yet</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Creator Studios
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Featured Spotlight Game */}
        <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 h-72 lg:h-auto relative overflow-hidden bg-black">
            <img src={selectedGame.coverUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent lg:hidden" />
          </div>

          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> {selectedGame.location}
                </span>
                <div className="flex items-center gap-1 text-xs font-mono text-amber-400 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {selectedGame.rating} ({selectedGame.reviewsCount})
                </div>
              </div>

              <h2 className="font-display font-extrabold text-2xl text-foreground leading-tight mb-2">
                {selectedGame.title}
              </h2>
              <p className="text-xs text-muted-foreground font-mono mb-4">Developed by {selectedGame.studio}</p>

              <p className="text-sm font-serif text-muted-foreground leading-relaxed mb-6">
                {selectedGame.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-6">
                {selectedGame.tags.map(t => (
                  <span key={t} className="text-[0.65rem] font-mono px-2.5 py-1 rounded-full bg-muted border border-border/40 text-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/30">
              <div>
                <span className="text-[0.62rem] font-mono uppercase text-muted-foreground block">Purchase Price</span>
                <span className="font-display font-black text-2xl text-emerald-400">₹{selectedGame.priceINR.toLocaleString()}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleWishlist(selectedGame.id)}
                  className={cn("rounded-2xl font-bold text-xs h-11 px-4", wishlisted[selectedGame.id] && "border-rose-500 text-rose-500 bg-rose-500/10")}
                >
                  <Heart className={cn("w-4 h-4 mr-1.5", wishlisted[selectedGame.id] && "fill-rose-500")} />
                  {wishlisted[selectedGame.id] ? 'Wishlisted' : 'Wishlist'}
                </Button>

                <Button
                  disabled
                  className="rounded-2xl font-bold text-xs h-11 px-6 bg-muted text-muted-foreground"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Purchases unavailable
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* All indie games grid */}
        <div className="space-y-4">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3>Trending Indie Games & Early Access Studios</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((g) => (
              <div
                key={g.id}
                onClick={() => {
                  sounds.playPop();
                  setSelectedGame(g);
                }}
                className={cn(
                  "surface-1 rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col justify-between p-5 cursor-pointer group shadow-sm",
                  selectedGame.id === g.id ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-border/40 hover:border-border"
                )}
              >
                <div>
                  <div className="h-44 rounded-2xl overflow-hidden mb-4 relative bg-black">
                    <img src={g.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <span className="absolute top-3 right-3 text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30">
                      ₹{g.priceINR.toLocaleString()}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base text-foreground leading-tight mb-1">{g.title}</h4>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{g.studio} · {g.location}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/30 text-xs font-mono">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {g.rating}
                  </span>
                  <span className="text-primary font-bold">{g.genre}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
