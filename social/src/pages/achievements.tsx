import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { 
  Sparkles, TrendingUp, Users, Flame, BookOpen, Trophy, 
  Star, Shield, Hammer, CheckCircle2, Award, Zap, ArrowRight, Layers 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const ICONS: Record<string, any> = { Sparkles, TrendingUp, Users, Flame, BookOpen };

interface TradingCardSet {
  id: string;
  game: string;
  badgeName: string;
  level: number;
  cardsCollected: number;
  totalCards: number;
  bannerUrl: string;
  crafted: boolean;
  rewardXp: number;
}

const INITIAL_CARD_SETS: TradingCardSet[] = [
  {
    id: 'set-1',
    game: 'Cyberpunk 2077: Phantom Liberty',
    badgeName: 'Night City Legend Foil Badge',
    level: 5,
    cardsCollected: 5,
    totalCards: 5,
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
    crafted: false,
    rewardXp: 500
  },
  {
    id: 'set-2',
    game: 'Counter-Strike 2',
    badgeName: 'Global Elite Tactician Badge',
    level: 3,
    cardsCollected: 5,
    totalCards: 5,
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop',
    crafted: false,
    rewardXp: 300
  },
  {
    id: 'set-3',
    game: 'Elden Ring: Shadow of the Erdtree',
    badgeName: 'Lord of the Erdtree Badge',
    level: 2,
    cardsCollected: 4,
    totalCards: 5,
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop',
    crafted: false,
    rewardXp: 200
  }
];

export default function Achievements() {
  const achievements = useAppStore((s) => s.achievements);
  const [cardSets, setCardSets] = useState<TradingCardSet[]>(INITIAL_CARD_SETS);
  const [activeTab, setActiveTab] = useState<'achievements' | 'crafting'>('achievements');
  
  const totalXp = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
  const level = Math.floor(Math.sqrt(totalXp / 50)) + 1;
  
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);
  const sortedAchievements = [...unlocked, ...locked];

  const handleCraftBadge = (setId: string) => {
    sounds.playChime();
    triggerConfetti();
    setCardSets(prev => prev.map(set => {
      if (set.id === setId) {
        return { ...set, crafted: true };
      }
      return set;
    }));
    toast.success(`🎉 Crafted Foil Badge! Gained +500 Steam XP, 1 Animated Avatar Frame, & 100 Steam Points!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center glow-neon-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Steam Achievements & Badges</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Trophies, Trading Cards & Badge Crafting</p>
          </div>
        </div>
        <div className="level-badge shadow-sm">
          <Shield className="w-3.5 h-3.5" /> Lv. {level} Voyager
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* XP Counter Banner */}
        <div className="p-8 rounded-3xl surface-1 border border-border/40 text-center relative overflow-hidden shadow-sm">
          <div className="absolute inset-0 aurora-bg opacity-30 pointer-events-none" />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="level-badge mb-3 glow-neon-primary text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400" /> Steam Level {level} Voyager
            </div>
            <span className="font-display font-extrabold text-6xl sm:text-7xl text-shimmer tracking-tight">
              {totalXp}
            </span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground mt-2 font-bold font-mono">
              Total Steam XP Accumulated
            </span>
          </motion.div>
        </div>

        {/* Tab Toggle: Badges vs Crafting */}
        <div className="flex gap-2 p-1.5 rounded-2xl surface-1 border border-border/40 w-fit">
          <Button
            size="sm"
            variant={activeTab === 'achievements' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('achievements')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'achievements' && "bg-primary text-primary-foreground shadow-md")}
          >
            <Trophy className="w-3.5 h-3.5 mr-1.5" /> All Achievements ({unlocked.length}/{achievements.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'crafting' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('crafting')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'crafting' && "bg-amber-600 text-white shadow-md")}
          >
            <Hammer className="w-3.5 h-3.5 mr-1.5" /> Steam Card Crafting Station ({cardSets.filter(s => !s.crafted && s.cardsCollected === s.totalCards).length} Ready)
          </Button>
        </div>

        {activeTab === 'crafting' ? (
          /* Steam Badge Crafting Station */
          <div className="space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Hammer className="w-5 h-5 text-amber-400" /> Steam Trading Card Sets
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">Collect all 5 trading cards per game to craft an animated Foil Badge & level up!</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cardSets.map((set) => {
                const isReady = set.cardsCollected === set.totalCards && !set.crafted;

                return (
                  <div key={set.id} className="surface-1 rounded-3xl overflow-hidden border border-border/40 hover:border-amber-500/40 transition-all duration-300 flex flex-col shadow-sm group">
                    <div className="h-40 relative bg-black/60 overflow-hidden">
                      <img src={set.bannerUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute top-3 right-3 text-[0.65rem] font-mono font-bold px-2.5 py-1 rounded-full bg-black/70 text-amber-400 border border-amber-500/30">
                        {set.cardsCollected}/{set.totalCards} Cards
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <span className="text-[0.62rem] font-mono uppercase text-zinc-300 font-bold block">{set.game}</span>
                        <h4 className="font-display font-bold text-sm text-white">{set.badgeName}</h4>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-4">
                        <span>Reward: <strong className="text-amber-400 font-bold">+{set.rewardXp} XP</strong></span>
                        <span>Badge Level {set.level}</span>
                      </div>

                      {set.crafted ? (
                        <Button disabled className="w-full rounded-2xl font-bold text-xs h-10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Badge Crafted & Active
                        </Button>
                      ) : isReady ? (
                        <Button
                          onClick={() => handleCraftBadge(set.id)}
                          className="w-full rounded-2xl font-bold text-xs h-10 glow-neon-primary bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                        >
                          <Hammer className="w-4 h-4 mr-1.5" /> Craft Foil Badge Now
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className="w-full rounded-2xl font-bold text-xs h-10 border-border/60">
                          Need {set.totalCards - set.cardsCollected} more card
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Achievements Grid */
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {sortedAchievements.map((a) => {
              const Icon = ICONS[a.icon] ?? Star;
              const progressPct = Math.min(100, (a.progress / a.goal) * 100);
              const isRare = a.xp >= 100;
              
              return (
                <motion.div
                  key={a.id}
                  variants={staggerItem}
                  className={cn(
                    "surface-1 rounded-3xl p-6 flex flex-col items-center text-center relative border transition-all duration-300 shadow-sm",
                    a.unlocked ? "border-primary/40 glow-neon-primary bg-card/80" : "border-border/30 opacity-70 bg-card/30"
                  )}
                >
                  {/* SVG Progress Ring */}
                  <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle
                        cx="40" cy="40" r="36"
                        className="stroke-muted fill-none"
                        strokeWidth="5"
                      />
                      <circle
                        cx="40" cy="40" r="36"
                        className={cn(
                          "fill-none transition-all duration-1000 ease-out",
                          a.unlocked ? "stroke-primary" : "stroke-muted-foreground/30"
                        )}
                        strokeWidth="5"
                        strokeDasharray="226.19"
                        strokeDashoffset={226.19 - (226.19 * progressPct) / 100}
                        strokeLinecap="round"
                      />
                    </svg>

                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300",
                      a.unlocked ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-muted/40 text-muted-foreground"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h4 className="font-display font-bold text-base text-foreground mb-1">{a.title}</h4>
                  <p className="text-xs font-serif text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{a.description}</p>

                  <div className="mt-auto w-full pt-3 border-t border-border/30 flex items-center justify-between font-mono text-xs">
                    <span className="text-[0.68rem] text-muted-foreground font-bold">
                      {a.progress}/{a.goal} ({Math.round(progressPct)}%)
                    </span>
                    <span className={cn(
                      "font-bold text-[0.68rem] px-2 py-0.5 rounded-full border",
                      isRare ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-primary/10 text-primary border-primary/20"
                    )}>
                      +{a.xp} XP {isRare ? '💎 RARE' : ''}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
