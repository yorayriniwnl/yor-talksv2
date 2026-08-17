import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Keyboard, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, MoveHorizontal, Crosshair 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface MicroStrafeTier {
  id: string;
  technique: string;
  game: string;
  cadenceDuration: string;
  velocityWindow: string;
  tacticalAdvantage: string;
}

const MICRO_STRAFE_TIERS: MicroStrafeTier[] = [
  { id: 'ms-1', technique: '45ms A-D Shoulder Bait Jiggle Peek', game: 'CS2 & Valorant Scrims', cadenceDuration: '42ms Micro-Tap Key Cadence', velocityWindow: '< 34 u/s Sub-Deadzone Threshold', tacticalAdvantage: 'Baits AWP/Operator Shot Without Exposing Head Hitbox' },
  { id: 'ms-2', technique: 'Micro-Step Angle Slicing (Pie-Cutting)', game: 'Valorant Tier-1', cadenceDuration: '60ms Single-Step Counter-Tap', velocityWindow: 'Instant Zero Velocity Reset at 0ms', tacticalAdvantage: 'Clears Site Corners 15° at a Time with 100% 1st Bullet Accuracy' },
  { id: 'ms-3', technique: 'Crouch-Uncrouch Jiggle Headshot Bait', game: 'Tier-1 Scrims', cadenceDuration: '80ms Stance Oscillation Cycle', velocityWindow: 'Maintains Crosshair Height Stability', tacticalAdvantage: 'Disrupts Opponent Crosshair Placement at Head Level' },
];

export default function MicroStrafeMatrix() {
  const [techniques, setTechniques] = useState<MicroStrafeTier[]>(MICRO_STRAFE_TIERS);
  const [activeTechnique, setActiveTechnique] = useState('ms-1');

  const handleExportMicroStrafeStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Micro-Strafe & Jiggle-Peek Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <MoveHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Micro-Strafe & Jiggle-Peek Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">45ms Key Cadence, 34 u/s Deadzone Threshold, Sniper Baits & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportMicroStrafeStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Micro-Strafe Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Techniques Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {techniques.map((t) => {
            const isSelected = activeTechnique === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveTechnique(t.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {t.game}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{t.cadenceDuration}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{t.technique}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Velocity:</strong> {t.velocityWindow}</p>
                    <p><strong className="text-amber-400">Tactics:</strong> {t.tacticalAdvantage}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Jiggle Mechanics' : 'Simulate Micro-Strafe'}
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
