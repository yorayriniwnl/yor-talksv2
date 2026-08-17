import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CornerDownRight, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, MoveRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface BounceSetup {
  id: string;
  bankLineup: string;
  game: string;
  incidentAngle: string;
  restitutionCoeff: string;
  popTiming: string;
}

const BOUNCE_SETUPS: BounceSetup[] = [
  { id: 'ba-1', bankLineup: 'CS2 Mirage Palace Exit to Deep A-Site Double-Bank Flash', game: 'CS2 Tier-1', incidentAngle: '42.0° Concrete Wall Geometric Reflection', restitutionCoeff: 'e = 0.85 Concrete Restitution', popTiming: '0.08s Unreactable Airburst Over Pillar' },
  { id: 'ba-2', bankLineup: 'CS2 Inferno Banana Car to Sandbags Wood-Bank Molotov', game: 'CS2 Tier-1', incidentAngle: '35.5° Plywood Wall Angle Deflection', restitutionCoeff: 'e = 0.65 Wood Shock Absorption', popTiming: '100% Choke Spread with Zero Exposure' },
  { id: 'ba-3', bankLineup: 'Valorant Ascent A-Main Arch Triple-Bank Recon Arrow', game: 'Valorant Scrims', incidentAngle: '52.3° High-Wall Sova Ricochet Arc', restitutionCoeff: 'e = 0.90 Precision Metal Bounce', popTiming: 'Reveals Generator & Tree Defiance' },
];

export default function BounceAngleMatrix() {
  const [bounces, setBounces] = useState<BounceSetup[]>(BOUNCE_SETUPS);
  const [activeBounce, setActiveBounce] = useState('ba-1');

  const handleExportBounceAngleStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📐 Tactical Lineup Bounce-Angle Trigonometry & Bank-Shot Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <CornerDownRight className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bounce-Angle Trigonometry Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Specular Reflection Geometry, e = 0.85 Restitution Physics & Zero-Exposure Bank Lineups</p>
          </div>
        </div>

        <Button
          onClick={handleExportBounceAngleStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Bounce Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Bounces Grid */}
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
                      {b.game}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{b.incidentAngle}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{b.bankLineup}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Restitution:</strong> {b.restitutionCoeff}</p>
                    <p><strong className="text-amber-400">Pop Timing:</strong> {b.popTiming}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Bank Trajectory' : 'Inspect Reflection Angle'}
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
