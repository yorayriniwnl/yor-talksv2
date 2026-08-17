import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Award, Shield, Sparkles, Share2, 
  Flame, Star, Crown, CheckCircle2, Lock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ClanTrophy {
  id: string;
  name: string;
  tournament: string;
  year: string;
  icon: string;
  glowColor: string;
  unlocked: boolean;
  prizePool: string;
  mvp: string;
}

const CLAN_TROPHIES: ClanTrophy[] = [
  {
    id: 'tr-1',
    name: 'BGIS National Championship Cup 🏆',
    tournament: 'Battlegrounds Mobile India Series',
    year: '2026',
    icon: '🏆',
    glowColor: 'from-amber-400 to-yellow-600',
    unlocked: true,
    prizePool: '₹1,00,00,000 INR',
    mvp: 'Scout Cyber'
  },
  {
    id: 'tr-2',
    name: 'Valorant South Asia Masters Cup 🔱',
    tournament: 'VCT South Asia Stage 2',
    year: '2026',
    icon: '🔱',
    glowColor: 'from-cyan-400 to-blue-600',
    unlocked: true,
    prizePool: '₹40,00,000 INR',
    mvp: 'Vortex Jet'
  },
  {
    id: 'tr-3',
    name: 'Bharat Grandmaster Blitz Shield 🛡️',
    tournament: 'National Cyber Chess Masters',
    year: '2026',
    icon: '🛡️',
    glowColor: 'from-purple-500 to-indigo-600',
    unlocked: true,
    prizePool: '₹15,00,000 INR',
    mvp: 'Grandmaster Shiva'
  },
  {
    id: 'tr-4',
    name: 'Global Esports World Cup Gold 👑',
    tournament: 'Riyadh Esports World Cup',
    year: 'Upcoming 2027',
    icon: '👑',
    glowColor: 'from-rose-500 to-pink-600',
    unlocked: false,
    prizePool: '$1,000,000 USD',
    mvp: 'To Be Decided'
  }
];

export default function TrophyRoom() {
  const [selectedTrophy, setSelectedTrophy] = useState(CLAN_TROPHIES[0]);

  const handleShareTrophy = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🏆 Trophy Room showcase link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Virtual Trophy Room & Hall of Fame</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Official Clan Championship Pedestals & Silverware Showcase</p>
          </div>
        </div>

        <Button
          onClick={handleShareTrophy}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Share2 className="w-3.5 h-3.5 mr-1" /> Share Trophy Room
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main 3D Holographic Trophy Pedestal Column */}
          <div className="lg:col-span-6 flex justify-center py-6">
            <div className="relative w-80 h-96 rounded-3xl p-8 bg-zinc-950 border-4 border-amber-500/40 shadow-2xl flex flex-col items-center justify-between overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-black/80 pointer-events-none" />

              <span className="relative z-10 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                CHAMPIONSHIP SILVERWARE &middot; {selectedTrophy.year}
              </span>

              {/* 3D Trophy Hologram */}
              <div className="text-7xl my-auto animate-bounce filter drop-shadow-[0_0_24px_rgba(251,191,36,0.8)] select-none">
                {selectedTrophy.icon}
              </div>

              {/* Plaque Base */}
              <div className="relative z-10 w-full p-4 rounded-2xl bg-black/80 border border-white/10 text-center font-sans space-y-1">
                <h4 className="font-display font-black text-sm text-amber-300 uppercase">{selectedTrophy.name}</h4>
                <p className="text-[0.68rem] font-mono text-zinc-400">Prize: {selectedTrophy.prizePool} &middot; MVP: {selectedTrophy.mvp}</p>
              </div>
            </div>
          </div>

          {/* Trophy Cabinet Grid Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="showcase-section-title">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3>Championship Trophy Cabinet</h3>
            </div>

            <div className="space-y-3">
              {CLAN_TROPHIES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    sounds.playPop();
                    setSelectedTrophy(t);
                  }}
                  className={cn(
                    "w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between",
                    selectedTrophy.id === t.id ? "border-amber-400 bg-amber-500/20 shadow-lg glow-neon-primary" : "border-border/40 hover:bg-muted/40",
                    !t.unlocked && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <h4 className="font-display font-bold text-sm text-foreground">{t.name}</h4>
                      <span className="text-xs font-mono text-muted-foreground">{t.tournament} ({t.year})</span>
                    </div>
                  </div>

                  <div>
                    {t.unlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
