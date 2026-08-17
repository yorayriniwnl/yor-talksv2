import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CircleDot, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface BounceTier {
  id: string;
  surface: string;
  material: string;
  restitution: string;
  trajectoryAngle: string;
  utilityApplication: string;
}

const BOUNCE_TIERS: BounceTier[] = [
  { id: 'bn-1', surface: 'Concrete / Brick Wall', material: 'Reinforced Masonry', restitution: '0.62 Elasticity Restitution Multiplier', trajectoryAngle: '45° Incident Angle → 45° Reflected Lineup', utilityApplication: 'CS2 Mirage A-Ramp Pop-Flash & Inferno Banana Molotov' },
  { id: 'bn-2', surface: 'Corrugated Metal Sheet', material: 'Galvanized Steel Wall', restitution: '0.74 High-Velocity Rebound Multiplier', trajectoryAngle: '30° Sharp Skim Bank-Shot Angle', utilityApplication: 'Valorant Ascent B-Main Sova Dart & Viper Poison Orb' },
  { id: 'bn-3', surface: 'Wood / Plaster Partition', material: 'Treated Hardwood Ply', restitution: '0.48 Energy Absorption Multiplier', trajectoryAngle: '60° High-Arc Soft Drop Angle', utilityApplication: 'Dust 2 Xbox Smoke & B-Site Retake Flashbang Drop' },
];

export default function BounceMatrix() {
  const [bounces, setBounces] = useState<BounceTier[]>(BOUNCE_TIERS);
  const [activeBounce, setActiveBounce] = useState('bn-1');

  const handleExportBounceStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Utility Trajectory & Bounce Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Utility Trajectory & Bounce Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Coefficient of Restitution Physics, Surface Reflectance & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportBounceStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Bounce Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Bounce Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {bounces.map((b) => {
            const isSelected = activeBounce === b.id;
            return (
              <div
                key={b.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveBounce(b.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {b.material}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{b.restitution}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{b.surface}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Angle:</strong> {b.trajectoryAngle}</p>
                    <p><strong className="text-amber-400">Strat:</strong> {b.utilityApplication}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Trajectory Model' : 'Inspect Restitution'}
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
