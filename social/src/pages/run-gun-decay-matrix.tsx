import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, TrendingDown, Crosshair 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface RunGunTier {
  id: string;
  weapon: string;
  game: string;
  movingSpreadPenalty: string;
  decayTimeToZero: string;
  optimalCounterStrafe: string;
}

const RUN_GUN_TIERS: RunGunTier[] = [
  { id: 'rg-1', weapon: 'Vandal / AK-47 Rifle Moving Cone', game: 'CS2 & Valorant Tier-1', movingSpreadPenalty: '+5.4° Massive Inaccuracy Cone Expansion', decayTimeToZero: '0.18s Velocity Deceleration Reset Window', optimalCounterStrafe: 'Requires Full 100% Zero-Velocity Stop Before 1st Bullet Click' },
  { id: 'rg-2', weapon: 'Phantom / M4A1-S Silenced Carbine', game: 'Valorant Scrims', movingSpreadPenalty: '+3.8° Moderate Run Dispersion Cone', decayTimeToZero: '0.14s Rapid Inaccuracy Recovery Curve', optimalCounterStrafe: 'Allows Micro-Shift Walk Taps within 12m Close Range Engagements' },
  { id: 'rg-3', weapon: 'Spectre / MP9 High-Mobility SMG', game: 'Tier-1 Scrims', movingSpreadPenalty: '+1.6° Controlled Running Bullet Cluster', decayTimeToZero: '0.08s Sub-Second Zero Reset', optimalCounterStrafe: 'Full Run-and-Gun Spray Viable on Eco Round Anti-Plant Retakes' },
];

export default function RunGunDecayMatrix() {
  const [weapons, setWeapons] = useState<RunGunTier[]>(RUN_GUN_TIERS);
  const [activeWeapon, setActiveWeapon] = useState('rg-1');

  const handleExportRunGunStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Run-and-Gun Inaccuracy Decay Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Run-and-Gun Decay Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Moving Cone Expansion, Inaccuracy Recovery Curves & 1st-Bullet Accuracy</p>
          </div>
        </div>

        <Button
          onClick={handleExportRunGunStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Inaccuracy Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Weapons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {weapons.map((w) => {
            const isSelected = activeWeapon === w.id;
            return (
              <div
                key={w.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveWeapon(w.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {w.game}
                    </span>
                    <span className="text-xs font-mono text-rose-400 font-bold">{w.movingSpreadPenalty}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{w.weapon}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Decay Time:</strong> {w.decayTimeToZero}</p>
                    <p><strong className="text-amber-400">Firing Tech:</strong> {w.optimalCounterStrafe}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Inaccuracy Curve' : 'Inspect Moving Spread'}
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
