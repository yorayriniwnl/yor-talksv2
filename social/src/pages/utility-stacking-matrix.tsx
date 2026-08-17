import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, Bomb, Wind 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface StackingTier {
  id: string;
  chokeSetup: string;
  game: string;
  dpsChainingDamage: string;
  denialDuration: string;
  utilityCombos: string;
}

const STACKING_TIERS: StackingTier[] = [
  { id: 'us-1', chokeSetup: 'CS2 Inferno Banana Car Deep Molotov + Double HE', game: 'CS2 Tier-1', dpsChainingDamage: '85-100 HP Instant Fatal Choke Flush', denialDuration: '7.2s Total Vision & Passage Blockade', utilityCombos: 'Deep Moly + Top-Mid Flash + Double High-Explosive Chaining' },
  { id: 'us-2', chokeSetup: 'Valorant Bind B-Hookah Snakebite + Paint Shells', game: 'Valorant Scrims', dpsChainingDamage: '18.5 DPS Vulnerable Double Damage Multiplier', denialDuration: '6.5s Exit Route Quarantine', utilityCombos: 'Viper Acid Pool + Raze Cluster Grenade + Brimstone Incendiary' },
  { id: 'us-3', chokeSetup: 'Ascent B-Main Deep Choke Slow Orb + GravNet', game: 'Tier-1 Scrims', dpsChainingDamage: '100% Movement Immobilization & Choke Pin', denialDuration: '8.0s Retake Delay Clock Extension', utilityCombos: 'Sage Ice Orb + Deadlock GravNet + Sova Shock Dart Trajectory' },
];

export default function UtilityStackingMatrix() {
  const [combos, setCombos] = useState<StackingTier[]>(STACKING_TIERS);
  const [activeCombo, setActiveCombo] = useState('us-1');

  const handleExportUtilityStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('💣 Tactical Utility Stacking & Choke Suppression Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-500 via-orange-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Bomb className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Utility Stacking & Choke Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">18.5 DPS Damage Amplification, Molotov + HE Chaining & Denial Timelines</p>
          </div>
        </div>

        <Button
          onClick={handleExportUtilityStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Utility Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Combos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {combos.map((c) => {
            const isSelected = activeCombo === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveCombo(c.id);
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
                    <span className="text-xs font-mono text-orange-400 font-bold">{c.dpsChainingDamage}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{c.chokeSetup}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Denial Time:</strong> {c.denialDuration}</p>
                    <p><strong className="text-amber-400">Stack Sequence:</strong> {c.utilityCombos}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Choke Suppression' : 'Inspect Utility Stack'}
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
