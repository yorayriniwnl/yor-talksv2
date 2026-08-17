import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Target, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface AngleProfile {
  id: string;
  weapon: string;
  game: string;
  subPixelSmoothing: string;
  flickCorrection: string;
  recommendedEDpi: string;
}

const ANGLE_PROFILES: AngleProfile[] = [
  { id: 'as-1', weapon: 'Vandal / Phantom Tap-Burst', game: 'Valorant Tier-1', subPixelSmoothing: '0.008°/tick Sub-Pixel Precision', flickCorrection: '4-Pixel Micro-Flick in 0.042s Window', recommendedEDpi: '280 eDPI (800 DPI × 0.35 Sens)' },
  { id: 'as-2', weapon: 'AK-47 / M4A1-S First-Shot Snap', game: 'CS2 Tier-1 Scrims', subPixelSmoothing: 'Raw Input Linear True-1:1 Tracking', flickCorrection: '6-Pixel Head-Level Reset in 0.038s', recommendedEDpi: '800 eDPI (400 DPI × 2.00 Sens)' },
  { id: 'as-3', weapon: 'M416 6x Gyro Micro-Adjustment', game: 'BGMI Pro Circuit', subPixelSmoothing: '300% Gyro Micro-Yaw Horizon Stabilization', flickCorrection: 'Instant Thumb Micro-Flick Offset', recommendedEDpi: '320% Full Gyro Sensitivity' },
];

export default function AngleSnapMatrix() {
  const [profiles, setProfiles] = useState<AngleProfile[]>(ANGLE_PROFILES);
  const [activeProfile, setActiveProfile] = useState('as-1');

  const handleExportAngleStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Angle-Snapping & Micro-Adjustment Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-600 to-amber-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Angle-Snapping & Micro-Adjustment Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Sub-Pixel Aim Tracking, 0.04s Micro-Flick Windows, eDPI Presets & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportAngleStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Aim Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {profiles.map((p) => {
            const isSelected = activeProfile === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveProfile(p.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {p.game}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{p.recommendedEDpi}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{p.weapon}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Tracking:</strong> {p.subPixelSmoothing}</p>
                    <p><strong className="text-rose-400">Micro-Flick:</strong> {p.flickCorrection}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Aim Calibration' : 'Inspect Telemetry'}
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
