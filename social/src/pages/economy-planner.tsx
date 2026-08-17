import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, Sparkles, Copy, 
  IndianRupee, Download, CheckCircle2, Zap, DollarSign, TrendingUp, ShieldAlert 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface BuyTier {
  id: string;
  roundType: string;
  game: string;
  creditRequirement: string;
  loadout: string;
  tacticalObjective: string;
}

const BUY_TIERS: BuyTier[] = [
  { id: 'ec-1', roundType: 'Full Buy Round (Max Loadout)', game: 'Valorant / CS2', creditRequirement: '3,900 – 4,500 Credits', loadout: 'Vandal / AK-47 + Heavy Shields + Full Utility Set', tacticalObjective: 'Primary execute round; full map control and site retake utility' },
  { id: 'ec-2', roundType: 'Force Buy / Hero Rifle Call', game: 'Valorant Tier-1', creditRequirement: '2,000 – 2,800 Credits', loadout: 'Bulldog / Galil / Sheriff + Light Shields', tacticalObjective: 'Punish enemy post-pistol bonus or break enemy economic streak' },
  { id: 'ec-3', roundType: 'Full Eco / Save Round', game: 'Valorant / CS2 Scrims', creditRequirement: '< 1,500 Credits Save Target', loadout: 'Classic / USP-S (0 Spend) + Armor Retention', tacticalObjective: 'Guarantees 3,900+ credits next round for coordinated Full Buy' },
];

export default function EconomyPlanner() {
  const [tiers, setTiers] = useState<BuyTier[]>(BUY_TIERS);
  const [activeTier, setActiveTier] = useState('ec-1');

  const handleExportEcoStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('💰 Tactical In-Game Economy & Buy-Round Guide exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Tactical In-Game Economy Planner</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Buy-Round Thresholds, Loss Bonus Streaks, Weapon Drops & Eco Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportEcoStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Economy Strat
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Buy Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {tiers.map((t) => {
            const isSelected = activeTier === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveTier(t.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {t.game}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{t.creditRequirement}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{t.roundType}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Loadout:</strong> {t.loadout}</p>
                    <p><strong className="text-amber-400">Tactics:</strong> {t.tacticalObjective}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Economy Tier' : 'Inspect Round Call'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
