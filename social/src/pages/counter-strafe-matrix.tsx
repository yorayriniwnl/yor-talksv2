import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Keyboard, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface StrafeTier {
  id: string;
  technique: string;
  game: string;
  stopVelocityTime: string;
  rapidTriggerActuation: string;
  accuracyResetWindow: string;
}

const STRAFE_TIERS: StrafeTier[] = [
  { id: 'cs-1', technique: 'A-D Opposing Key Counter-Tap', game: 'CS2 Tier-1 Scrims', stopVelocityTime: '0.024s Instant Deceleration (250 u/s → 0.0 u/s)', rapidTriggerActuation: '0.1mm Magnetic Switch Rapid Reset', accuracyResetWindow: '0.032s Pinpoint First-Shot Accuracy Window' },
  { id: 'cs-2', technique: 'Deadzone Counter-Strafe Drift', game: 'Valorant Tier-1', stopVelocityTime: '0.038s Shooting Speed Threshold (<30% speed)', rapidTriggerActuation: '0.15mm Dynamic Rapid Trigger Depth', accuracyResetWindow: '0.045s Instant First-Bullet Spread Reset' },
  { id: 'cs-3', technique: 'Sprint-To-Stop Slide Cancel', game: 'BGMI Pro Circuit', stopVelocityTime: '0.050s Joystick Deadzone Center Snap', rapidTriggerActuation: 'Touch Screen Sensitivity 100% Deadzone Snap', accuracyResetWindow: '0.060s Hipfire Spread Tightening Reset' },
];

export default function CounterStrafeMatrix() {
  const [strafes, setStrafes] = useState<StrafeTier[]>(STRAFE_TIERS);
  const [activeStrafe, setActiveStrafe] = useState('cs-1');

  const handleExportStrafeStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Counter-Strafe & Stop-Velocity Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-400 via-emerald-500 to-cyan-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Counter-Strafe & Stop-Velocity Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.02s Deceleration Physics, Rapid Trigger Magnetic Actuation & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportStrafeStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Deceleration Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Strafe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {strafes.map((s) => {
            const isSelected = activeStrafe === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveStrafe(s.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {s.game}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{s.rapidTriggerActuation}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.technique}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Stop Time:</strong> {s.stopVelocityTime}</p>
                    <p><strong className="text-teal-400">Reset Window:</strong> {s.accuracyResetWindow}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Deceleration Dynamic' : 'Inspect Kinematics'}
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
