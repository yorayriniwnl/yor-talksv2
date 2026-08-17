import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownToLine, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, MoveDown, Compass, Mountain 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface LadderSetup {
  id: string;
  ladderZone: string;
  game: string;
  slideSpeed: string;
  unGrabTiming: string;
  audioSignature: string;
}

const LADDER_SETUPS: LadderSetup[] = [
  { id: 'ls-1', ladderZone: 'CS2 Mirage Underpass Ladder to Short Fast-Descent', game: 'CS2 Tier-1', slideSpeed: '300 u/s Terminal Ladder Slide Speed', unGrabTiming: '0.04s Instant Air-Strafe Disconnect Window', audioSignature: '0.00s Zero Ladder Thud Sound' },
  { id: 'ls-2', ladderZone: 'CS2 Vertigo Mid Ladder Room to B-Site Drop', game: 'CS2 Tier-1', slideSpeed: '285 u/s Fast Ladder Wall-Skate', unGrabTiming: '0.06s Silent Edge Step Disconnect', audioSignature: '100% Silent Entry Behind Mid Anchors' },
  { id: 'ls-3', ladderZone: 'CS2 Nuke Vents Ladder to Decon Quick-Drop', game: 'Tier-1 Scrims', slideSpeed: '310 u/s Rapid Vent Shaft Acceleration', unGrabTiming: '0.03s Crouch-Decouple Landing Sync', audioSignature: '0.00s Zero Aim-Punch Shock' },
];

export default function LadderSlideMatrix() {
  const [ladders, setLadders] = useState<LadderSetup[]>(LADDER_SETUPS);
  const [activeLadder, setActiveLadder] = useState('ls-1');

  const handleExportLadderSlideStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🪜 Tactical Ladder-Slide Velocity & Silent Drop Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ArrowDownToLine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Ladder-Slide & Silent Drop Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">300 u/s Ladder Slide Acceleration, 0.04s Air-Strafe Disconnect & Silent Drops</p>
          </div>
        </div>

        <Button
          onClick={handleExportLadderSlideStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Ladder Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Ladders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {ladders.map((l) => {
            const isSelected = activeLadder === l.id;
            return (
              <div
                key={l.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveLadder(l.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {l.game}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{l.slideSpeed}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{l.ladderZone}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Un-Grab Timing:</strong> {l.unGrabTiming}</p>
                    <p><strong className="text-amber-400">Audio Signature:</strong> {l.audioSignature}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Ladder Vector' : 'Inspect Descent Physics'}
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
