import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  VolumeX, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, ArrowDownUp 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface WeaponCatchSetup {
  id: string;
  tossLineup: string;
  game: string;
  acousticElimination: string;
  catchTiming: string;
  stealthAdvantage: string;
}

const WEAPON_CATCH_SETUPS: WeaponCatchSetup[] = [
  { id: 'wc-1', tossLineup: 'CS2 Mirage B-Apartments to Kitchen Silent AWP Mid-Air Pass', game: 'CS2 Tier-1', acousticElimination: '0.00 dB Zero Floor Clatter on Catch', catchTiming: '0.04s E-Interact Mid-Air Snag Timing', stealthAdvantage: 'Bypasses 14.5m Audio Detection Radius' },
  { id: 'wc-2', tossLineup: 'Valorant Ascent A-Link to Tree Phantom Silent Hand-Off', game: 'Valorant Scrims', acousticElimination: '100% Zero Metal Clatter Sound', catchTiming: '0.08s Buy-Round Drop Intercept', stealthAdvantage: 'Conceals Roster Weapon Distribution' },
  { id: 'wc-3', tossLineup: 'CS2 Nuke Heaven to Locker Room Drop-Snag', game: 'Tier-1 Scrims', acousticElimination: '0.00 dB Zero Sheet Metal Ring Clatter', catchTiming: '0.05s Vertical Drop Catch Synchronization', stealthAdvantage: 'Enables Undetected Late-Round Weapon Upgrades' },
];

export default function WeaponCatchMatrix() {
  const [catches, setCatches] = useState<WeaponCatchSetup[]>(WEAPON_CATCH_SETUPS);
  const [activeCatch, setActiveCatch] = useState('wc-1');

  const handleExportWeaponCatchStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🔇 Tactical Silent Weapon Catch & Noise Cancellation Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <VolumeX className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Silent Weapon-Catch Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.00 dB Clatter Cancellation, Mid-Air Catch Mechanics & 14.5m Audio Radius Bypass</p>
          </div>
        </div>

        <Button
          onClick={handleExportWeaponCatchStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Catch Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Catches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {catches.map((c) => {
            const isSelected = activeCatch === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveCatch(c.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {c.game}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{c.acousticElimination}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{c.tossLineup}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Timing:</strong> {c.catchTiming}</p>
                    <p><strong className="text-emerald-400">Stealth:</strong> {c.stealthAdvantage}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Catch Lineup' : 'Inspect Acoustic Profile'}
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
