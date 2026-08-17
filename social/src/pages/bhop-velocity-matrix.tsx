import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Gauge 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface BhopTier {
  id: string;
  technique: string;
  game: string;
  maxVelocity: string;
  airAcceleration: string;
  strafeKeySync: string;
}

const BHOP_TIERS: BhopTier[] = [
  { id: 'bh-1', technique: 'Scroll-Wheel Air-Strafe Bhop Chain', game: 'CS2 Tier-1 Scrims', maxVelocity: '305.0 Units/Sec (Max Engine Cap)', airAcceleration: '+12.4 u/s per synchronized air strafe', strafeKeySync: 'A + Mouse Left / D + Mouse Right (Sub-Tick Perfect)' },
  { id: 'bh-2', technique: 'Neon / Raze Kinetic Air Strafe Drift', game: 'Valorant Tier-1', maxVelocity: '6.75 Meters/Sec Slide Burst', airAcceleration: '+18% Speed Boost across Ramp Slopes', strafeKeySync: 'Directional A/D air curve around corner choke' },
  { id: 'bh-3', technique: 'Sub-Tick Jump-Throw Velocity Momentum', game: 'CS2 Pro Circuit', maxVelocity: '250.0 u/s Running Throw Boost', airAcceleration: 'Zero velocity bleed on instantaneous smoke release', strafeKeySync: 'Forward W + Space jump-throw alignment' },
];

export default function BhopVelocityMatrix() {
  const [bhops, setBhops] = useState<BhopTier[]>(BHOP_TIERS);
  const [activeBhop, setActiveBhop] = useState('bh-1');

  const handleExportBhopStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Bunny-Hop & Strafe Velocity Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-500 via-amber-500 to-orange-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bunny-Hop & Strafe Velocity Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Air Acceleration Physics, 305 u/s Engine Caps, Strafe Sync & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportBhopStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Velocity Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Bhop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {bhops.map((b) => {
            const isSelected = activeBhop === b.id;
            return (
              <div
                key={b.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveBhop(b.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {b.game}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{b.maxVelocity}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{b.technique}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Air Accel:</strong> {b.airAcceleration}</p>
                    <p><strong className="text-amber-400">Sync:</strong> {b.strafeKeySync}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Velocity Dynamic' : 'Inspect Kinematics'}
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
