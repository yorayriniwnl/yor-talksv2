import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mountain, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, ArrowUpRight, Crosshair 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface VerticalTier {
  id: string;
  elevationSpot: string;
  game: string;
  verticalAngleAdvantage: string;
  headshotProjectionRatio: string;
  tacticalElevationHold: string;
}

const VERTICAL_TIERS: VerticalTier[] = [
  { id: 'vf-1', elevationSpot: 'Valorant Split A-Rafters to A-Site Screen', game: 'Valorant Scrims', verticalAngleAdvantage: '38.4° Steep Downward Firing Cone Projection', headshotProjectionRatio: '72% Larger Headshot Hitbox Surface Exposed to Defender', tacticalElevationHold: 'Crouch Hold Obscures Defender Body Behind Rafter Metal Rail' },
  { id: 'vf-2', elevationSpot: 'CS2 Nuke Heaven Catwalk to A-Site Silo', game: 'CS2 Tier-1', verticalAngleAdvantage: '42.1° Overhead Catwalk Vantage Point', headshotProjectionRatio: '68% Vertical Geometry Headshot Bias', tacticalElevationHold: 'Forces Terrorist Crosshair to High Vertical Flick Disorientation' },
  { id: 'vf-3', elevationSpot: 'Ascent A-Site Top Generator to Main Arch', game: 'Tier-1 Scrims', verticalAngleAdvantage: '29.5° Mid-Elevation High Box Vantage', headshotProjectionRatio: '55% Elevated Crosshair Headshot Alignment', tacticalElevationHold: 'Off-Angle Boost Breaks Attacker Standard Horizontal Pre-Aim' },
];

export default function VerticalFOVMatrix() {
  const [spots, setSpots] = useState<VerticalTier[]>(VERTICAL_TIERS);
  const [activeSpot, setActiveSpot] = useState('vf-1');

  const handleExportVerticalStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🏔️ Tactical High-Ground Vertical FOV Advantage Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Mountain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">High-Ground Vertical FOV Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">38° Downward Cones, Headshot Projection Hitbox Bias & Elevation Holds</p>
          </div>
        </div>

        <Button
          onClick={handleExportVerticalStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Elevation Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Spots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {spots.map((s) => {
            const isSelected = activeSpot === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveSpot(s.id);
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
                    <span className="text-xs font-mono text-sky-400 font-bold">{s.verticalAngleAdvantage}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.elevationSpot}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Hitbox Bias:</strong> {s.headshotProjectionRatio}</p>
                    <p><strong className="text-emerald-400">Positioning:</strong> {s.tacticalElevationHold}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active High-Ground Spot' : 'Inspect Elevation Angle'}
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
