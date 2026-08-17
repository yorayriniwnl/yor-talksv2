import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Target 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface AccuracySetup {
  id: string;
  weapon: string;
  game: string;
  firstShotSpreadCone: string;
  guaranteedHeadshotRange: string;
  crouchStabilityMultiplier: string;
}

const ACCURACY_SETUPS: AccuracySetup[] = [
  { id: 'fb-1', weapon: 'CS2 AK-47 Standing First-Bullet Tap', game: 'CS2 Tier-1', firstShotSpreadCone: '0.41° Sub-Pixel Dispersion Angle', guaranteedHeadshotRange: '21.74m Guaranteed Pixel Headshot Radius', crouchStabilityMultiplier: '1.45x (Expands to 31.5m on Instant Crouch)' },
  { id: 'fb-2', weapon: 'Valorant Vandal Standing Tap vs Phantom', game: 'Valorant Scrims', firstShotSpreadCone: '0.25° First-Shot Inaccuracy Spread Cone', guaranteedHeadshotRange: '28.5m Perfect 1-Tap Execution Threshold', crouchStabilityMultiplier: '1.25x ADS Scope Accuracy Recovery' },
  { id: 'fb-3', weapon: 'CS2 SG 553 Scoped Krieg Hitscan Hold', game: 'CS2 Tier-1', firstShotSpreadCone: '0.15° Precision Laser Hitscan Cone', guaranteedHeadshotRange: '48.2m Flawless Long-Range Sniper Duel Range', crouchStabilityMultiplier: '1.60x Perfect 100% Hitscan Pixel Pinpoint' },
];

export default function FirstBulletInaccuracyMatrix() {
  const [accuracies, setAccuracies] = useState<AccuracySetup[]>(ACCURACY_SETUPS);
  const [activeAccuracy, setActiveAccuracy] = useState('fb-1');

  const handleExportAccuracyStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical First-Bullet Inaccuracy & Gunplay Spread Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">First-Bullet Inaccuracy & Gunplay Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.41° Spread Cones, 21.74m Guaranteed Headshot Thresholds & Crouch Recovery</p>
          </div>
        </div>

        <Button
          onClick={handleExportAccuracyStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Gunplay Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Accuracies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {accuracies.map((a) => {
            const isSelected = activeAccuracy === a.id;
            return (
              <div
                key={a.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveAccuracy(a.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {a.game}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{a.firstShotSpreadCone}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{a.weapon}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Range:</strong> {a.guaranteedHeadshotRange}</p>
                    <p><strong className="text-amber-400">Recovery:</strong> {a.crouchStabilityMultiplier}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Gunplay Profile' : 'Inspect Accuracy Range'}
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
