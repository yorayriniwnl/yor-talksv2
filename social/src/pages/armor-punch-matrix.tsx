import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Sparkles, Copy, 
  Swords, Download, CheckCircle2, ShieldAlert, Activity, Zap, Compass, Mountain, Crosshair 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface FlinchSetup {
  id: string;
  armorState: string;
  game: string;
  aimPunchDeflection: string;
  flinchRecoveryWindow: string;
  combatAdvantage: string;
}

const FLINCH_SETUPS: FlinchSetup[] = [
  { id: 'ap-1', armorState: 'Full Kevlar + Helmet Heavy Buy', game: 'CS2 Tier-1', aimPunchDeflection: '0.00° Complete Aim-Punch Absorption on Body Hits (5.0% on Dinks)', flinchRecoveryWindow: '0.00s Instant Crosshair Stability Maintenance', combatAdvantage: 'Guarantees Flawless Spray Continuity Under Fire' },
  { id: 'ap-2', armorState: 'Heavy Shield + Phantom Headshot Dink', game: 'Valorant Scrims', aimPunchDeflection: '1.25° Vertical Micro-Flinch Crosshair Kick', flinchRecoveryWindow: '0.08s Counter-Pull Recoil Tap Stabilization', combatAdvantage: 'Enables Instant 2nd-Bullet Return Headshot' },
  { id: 'ap-3', armorState: 'Eco Round Zero-Armor Pistol Armorless Hold', game: 'CS2 Tier-1', aimPunchDeflection: '24.50° Violent Screen Kick & Weapon Jolt', flinchRecoveryWindow: '0.34s Severe Visual & Weapon Disorientation', combatAdvantage: 'Prioritize 1-Tap Jiggle-Peeks Over Spraying' },
];

export default function ArmorPunchMatrix() {
  const [flinches, setFlinches] = useState<FlinchSetup[]>(FLINCH_SETUPS);
  const [activeFlinch, setActiveFlinch] = useState('ap-1');

  const handleExportArmorPunchStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🛡️ Tactical Armor Punch & Flinch Recovery Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Armor Punch & Flinch Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.00° Kevlar Absorption, 0.08s Counter-Pull Recovery & Eco Flinch Mitigation</p>
          </div>
        </div>

        <Button
          onClick={handleExportArmorPunchStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Flinch Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Flinches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {flinches.map((f) => {
            const isSelected = activeFlinch === f.id;
            return (
              <div
                key={f.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveFlinch(f.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {f.game}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{f.aimPunchDeflection}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{f.armorState}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Recovery:</strong> {f.flinchRecoveryWindow}</p>
                    <p><strong className="text-amber-400">Impact:</strong> {f.combatAdvantage}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Armor Profile' : 'Inspect Flinch Rate'}
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
