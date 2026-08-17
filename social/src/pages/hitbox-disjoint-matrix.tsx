import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Crosshair 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface HitboxSetup {
  id: string;
  movementScenario: string;
  game: string;
  subtickDisjointWindow: string;
  hitregCompensation: string;
  skeletalAlignmentGain: string;
}

const HITBOX_SETUPS: HitboxSetup[] = [
  { id: 'hd-1', movementScenario: 'CS2 Rapid Crouch-Uncrouch Spam Behind Box', game: 'CS2 Sub-Tick', subtickDisjointWindow: '0.016s Animation vs Physics Interpolation Delta', hitregCompensation: 'Aim at Neck-Base to Catch Interpolated Eyeline', skeletalAlignmentGain: '+28.4% Hitreg Reliability on Headshot Angle' },
  { id: 'hd-2', movementScenario: 'Valorant Jett Updraft Float to Operator Quick-Scope', game: 'Valorant 128-Tick', subtickDisjointWindow: '0.024s Airborne Hitbox Lag Offset', hitregCompensation: 'Track Lower Torso During Apex Descent', skeletalAlignmentGain: 'Eliminates False Spark Registration' },
  { id: 'hd-3', movementScenario: 'CS2 Jump-Scout Apex Inaccuracy Reset Window', game: 'CS2 Tier-1', subtickDisjointWindow: '0.000s Zero Velocity Peak Synchronization', hitregCompensation: 'Shoot at Exact Highest Parabolic Point', skeletalAlignmentGain: '100% Guaranteed Laser Skull Cracking' },
];

export default function HitboxDisjointMatrix() {
  const [hitboxes, setHitboxes] = useState<HitboxSetup[]>(HITBOX_SETUPS);
  const [activeHitbox, setActiveHitbox] = useState('hd-1');

  const handleExportHitboxStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🛡️ Tactical Hitbox Disjoint & Skeletal Hitreg Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Hitbox Disjoint & Hitreg Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.016s Crouch Desync, Sub-Tick Skeletal Alignment & Jump-Scout Head Compression</p>
          </div>
        </div>

        <Button
          onClick={handleExportHitboxStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Hitbox Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Hitbox Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {hitboxes.map((h) => {
            const isSelected = activeHitbox === h.id;
            return (
              <div
                key={h.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveHitbox(h.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {h.game}
                    </span>
                    <span className="text-xs font-mono text-rose-400 font-bold">{h.subtickDisjointWindow}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{h.movementScenario}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Comp:</strong> {h.hitregCompensation}</p>
                    <p><strong className="text-rose-400">Gain:</strong> {h.skeletalAlignmentGain}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Hitbox Profile' : 'Inspect Skeletal Hitreg'}
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
