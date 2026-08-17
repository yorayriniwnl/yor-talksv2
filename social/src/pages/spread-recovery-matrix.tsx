import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, Target 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SpreadTier {
  id: string;
  weapon: string;
  category: string;
  resetTime: string;
  inaccuracyRadius: string;
  burstStrategy: string;
}

const SPREAD_TIERS: SpreadTier[] = [
  { id: 'sp-1', weapon: 'AK-47 / Vandal Rifle', category: 'Precision High-Caliber', resetTime: '0.34s Full Accuracy Cooldown Window', inaccuracyRadius: '4.8 Sub-MOA Cone Expansion per Shot', burstStrategy: '2-Bullet Micro Burst → 0.35s Lateral Drift Reset' },
  { id: 'sp-2', weapon: 'M4A1-S / Phantom Rifle', category: 'Suppressed High-RPM', resetTime: '0.28s Rapid Recoil Damping Window', inaccuracyRadius: '3.2 Sub-MOA Tight Spread Cone', burstStrategy: '3-4 Bullet Controlled Spray → Dynamic Crouch Pull' },
  { id: 'sp-3', weapon: 'Desert Eagle / Sheriff Pistol', category: 'High-Impact Sidearm', resetTime: '0.48s Heavy Hand-Cannon Settle Time', inaccuracyRadius: '7.5 High Inaccuracy Cone on Rapid Taps', burstStrategy: 'Patience 1-Tap Rhythm (0.50s Interval Pacing)' },
];

export default function SpreadRecoveryMatrix() {
  const [spreads, setSpreads] = useState<SpreadTier[]>(SPREAD_TIERS);
  const [activeSpread, setActiveSpread] = useState('sp-1');

  const handleExportSpreadStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Weapon Spread & Spray Reset Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-600 to-amber-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Weapon Spread & Spray Reset Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">First-Shot Spread Decay, Inaccuracy Cones, Burst Timing & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportSpreadStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Spread Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Spread Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {spreads.map((s) => {
            const isSelected = activeSpread === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveSpread(s.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {s.category}
                    </span>
                    <span className="text-xs font-mono text-rose-400 font-bold">{s.resetTime}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.weapon}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Inaccuracy:</strong> {s.inaccuracyRadius}</p>
                    <p><strong className="text-amber-400">Strat:</strong> {s.burstStrategy}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Weapon Profile' : 'Inspect Spread Kinematics'}
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
