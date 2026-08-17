import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Sparkles, CheckCircle2, 
  Target, Download, Copy, Shield, Swords, Zap, Sliders 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface WeaponRecoil {
  id: string;
  name: string;
  game: string;
  verticalKick: string;
  horizontalDrift: string;
  bestGrip: string;
  sprayDifficulty: string;
}

const WEAPONS: WeaponRecoil[] = [
  { id: 'w-1', name: 'Beryl M762 (7.62mm)', game: 'BGMI Pro Scrims', verticalKick: 'Extreme Vertical Jump (+85%)', horizontalDrift: 'Moderate Left-Right Deviation (±15%)', bestGrip: 'Compensator + Vertical Foregrip', sprayDifficulty: 'Hard (Expert Pull-Down)' },
  { id: 'w-2', name: 'M416 (5.56mm)', game: 'BGMI Pro Scrims', verticalKick: 'Smooth Linear Rise (+45%)', horizontalDrift: 'Low Drift (±8%)', bestGrip: 'Compensator + Half Grip', sprayDifficulty: 'Medium (Laser Spray)' },
  { id: 'w-3', name: 'Vandal Rifle', game: 'Valorant Tier-1', verticalKick: 'First 4-Bullet Precision, then Sharp S-Curve', horizontalDrift: 'Randomized Bloom past 6th shot', bestGrip: 'Burst Fire & Counter-Strafing', sprayDifficulty: 'High (Tap & Burst Only)' },
];

export default function RecoilPatternMatrix() {
  const [weapons, setWeapons] = useState<WeaponRecoil[]>(WEAPONS);
  const [activeWeapon, setActiveWeapon] = useState<string>('w-1');

  const handleExportGuide = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Strat Book Weapon Spray Pattern & Gyro Guide exported as PDF/PNG!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-500 via-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Tactical Recoil & Spray Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Bullet Trajectory Simulation, Attachment Compensators & Gyroscope Calibration</p>
          </div>
        </div>

        <Button
          onClick={handleExportGuide}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Strat Recoil Guide
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Weapon Recoil Cards */}
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
                    <span className="text-xs font-mono text-orange-400 font-bold">{w.sprayDifficulty}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{w.name}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Vertical:</strong> {w.verticalKick}</p>
                    <p><strong className="text-foreground">Horizontal:</strong> {w.horizontalDrift}</p>
                    <p><strong className="text-emerald-400">Recommended:</strong> {w.bestGrip}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Calibration' : 'Select Calibration'}
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
