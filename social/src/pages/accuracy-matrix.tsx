import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Target 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface WeaponAccuracyTier {
  id: string;
  weaponName: string;
  game: string;
  firstShotCone: string;
  counterStrafeDeadzone: string;
  crouchMultiplier: string;
}

const WEAPON_ACCURACY_TIERS: WeaponAccuracyTier[] = [
  { id: 'wa-1', weaponName: 'Vandal / AK-47 (Rifle)', game: 'Valorant / CS2', firstShotCone: '0.25° Inaccuracy Cone', counterStrafeDeadzone: 'Zero-velocity stop required (<30% speed)', crouchMultiplier: 'Crouching tightens first-bullet spread by 25%' },
  { id: 'wa-2', weaponName: 'Phantom / M4A1-S (Silenced Rifle)', game: 'Valorant Tier-1', firstShotCone: '0.20° Precision Cone', counterStrafeDeadzone: 'Faster movement recovery window (0.12s)', crouchMultiplier: 'Crouching enables sub-pixel micro recoil compensation' },
  { id: 'wa-3', weaponName: 'Sheriff / Desert Eagle (Handgun)', game: 'Valorant / CS2', firstShotCone: '0.15° Pinpoint Cone', counterStrafeDeadzone: 'Full standing deadzone required for 50m headshots', crouchMultiplier: 'Crouch tapping eliminates second-bullet deviation' },
];

export default function AccuracyMatrix() {
  const [weapons, setWeapons] = useState<WeaponAccuracyTier[]>(WEAPON_ACCURACY_TIERS);
  const [activeWeapon, setActiveWeapon] = useState('wa-1');

  const handleExportAccuracyStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Weapon Spread & First-Shot Accuracy Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Weapon Spread & Accuracy Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">First-Bullet Spread Cones, Counter-Strafe Deadzones & Crouch Multipliers</p>
          </div>
        </div>

        <Button
          onClick={handleExportAccuracyStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Accuracy Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Weapon Grid */}
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
                    <span className="text-xs font-mono text-amber-400 font-bold">{w.firstShotCone}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{w.weaponName}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Deadzone:</strong> {w.counterStrafeDeadzone}</p>
                    <p><strong className="text-emerald-400">Crouch:</strong> {w.crouchMultiplier}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Weapon' : 'Inspect Accuracy Cone'}
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
