import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, Crosshair 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface OffAngleTier {
  id: string;
  location: string;
  game: string;
  preAimOffset: string;
  reactionAdvantage: string;
  pixelSlitHold: string;
}

const OFF_ANGLE_TIERS: OffAngleTier[] = [
  { id: 'oa-1', location: 'CS2 Inferno Banana Car Deep Slice', game: 'CS2 Scrims', preAimOffset: '45° Geometric Offset from Standard Wood Pre-Aim', reactionAdvantage: '0.14s Human Saccadic Reaction Lag Advantage', pixelSlitHold: '2-Pixel Micro Gap between Barrels & Sandbags' },
  { id: 'oa-2', location: 'Valorant Ascent A-Main Tree Box Headshot', game: 'Valorant Tier-1', preAimOffset: 'Elevation Boost on radianite crate corner', reactionAdvantage: '0.12s Crosshair Micro-Adjustment Penalty for Peeker', pixelSlitHold: '1-Pixel Tight Operator Hold on Main Archway' },
  { id: 'oa-3', location: 'Dust 2 Long A Pit Reverse Anchor', game: 'Tier-1 Scrims', preAimOffset: 'Crouched Head-Glitch behind Pit Brick Slope', reactionAdvantage: '0.16s Disorienting Vertical Depth Misalignment', pixelSlitHold: 'Pixel Slit Hold on A-Site Ramp Retake Crossing' },
];

export default function OffAngleMatrix() {
  const [angles, setAngles] = useState<OffAngleTier[]>(OFF_ANGLE_TIERS);
  const [activeAngle, setActiveAngle] = useState('oa-1');

  const handleExportOffAngleStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Off-Angle & Pixel-Gap Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-cyan-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Off-Angle & Pixel-Gap Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Pre-Aim Displacement, Human Saccadic Lag, 1-Pixel Holds & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportOffAngleStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Off-Angle Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Angle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {angles.map((a) => {
            const isSelected = activeAngle === a.id;
            return (
              <div
                key={a.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveAngle(a.id);
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
                    <span className="text-xs font-mono text-emerald-400 font-bold">{a.reactionAdvantage}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{a.location}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Pre-Aim:</strong> {a.preAimOffset}</p>
                    <p><strong className="text-amber-400">Hold:</strong> {a.pixelSlitHold}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Off-Angle Point' : 'Inspect Micro-Gap'}
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
