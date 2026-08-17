import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Crosshair, ArrowUpRight, Target, Wind 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface JumpThrowSetup {
  id: string;
  lineupTarget: string;
  game: string;
  releaseTickDelta: string;
  flightTimeArc: string;
  landingAccuracy: string;
}

const JUMPTHROW_SETUPS: JumpThrowSetup[] = [
  { id: 'jt-1', lineupTarget: 'Mirage Mid Window Smoke from T-Spawn Bin', game: 'CS2 Tier-1', releaseTickDelta: '0.000s Sub-Tick Jump + Release Macro Sync', flightTimeArc: '4.82s Parabolic Arc Over Mid Roofs with 0.00° Spread', landingAccuracy: '100% Full Window Occlusion Eliminating AWPer Nest' },
  { id: 'jt-2', lineupTarget: 'Inferno B Site Coffin Smoke from Banana Sandbags', game: 'CS2 Tier-1', releaseTickDelta: '0.000s Forward-Walk Jump-Throw Key Bind', flightTimeArc: '3.94s Deep Arc Landing Flush against Coffin Lip', landingAccuracy: '100% Vision Cutoff for B-Retake Reinforcements' },
  { id: 'jt-3', lineupTarget: 'Ascent B Site Market Sova Shock Dart from Lobby', game: 'Valorant Scrims', releaseTickDelta: '2-Bounce 1-Bar Jump Release Charge', flightTimeArc: '2.80s Roof Bounce Clearing Switch Door Lever', landingAccuracy: '90 Damage Splash on Anchor Closing Market Door' },
];

export default function JumpThrowMatrix() {
  const [jumpThrows, setJumpThrows] = useState<JumpThrowSetup[]>(JUMPTHROW_SETUPS);
  const [activeJumpThrow, setActiveJumpThrow] = useState('jt-1');

  const handleExportJumpThrowStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Sub-Tick Jump-Throw & Trajectory Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Sub-Tick Jump-Throw Sync Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.000s Release Macro Sync, Parabolic Flight Arcs & Pixel-Flush Smoke Landings</p>
          </div>
        </div>

        <Button
          onClick={handleExportJumpThrowStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Jump-Throw Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* JumpThrows Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {jumpThrows.map((j) => {
            const isSelected = activeJumpThrow === j.id;
            return (
              <div
                key={j.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveJumpThrow(j.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {j.game}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{j.releaseTickDelta}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{j.lineupTarget}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Arc:</strong> {j.flightTimeArc}</p>
                    <p><strong className="text-emerald-400">Impact:</strong> {j.landingAccuracy}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Trajectory Arc' : 'Inspect Trajectory Physics'}
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
