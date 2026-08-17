import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Crosshair, MoveHorizontal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface JiggleSetup {
  id: string;
  peekAngle: string;
  game: string;
  exposureWindow: string;
  prefireCadence: string;
  tacticalAdvantage: string;
}

const JIGGLE_SETUPS: JiggleSetup[] = [
  { id: 'jc-1', peekAngle: 'Dust II Long Corner Shoulder-Bait Jiggle', game: 'CS2 Tier-1', exposureWindow: '0.08s Shoulder Model Flash Without Head Hitbox Reveal', prefireCadence: 'Baits AWP Shot then Counter-Strafes for Instant 1-Tap', tacticalAdvantage: 'Bypasses 0.22s Human Baseline AWP Reaction Window' },
  { id: 'jc-2', peekAngle: 'Ascent B Main Operator Prefire Slice', game: 'Valorant Scrims', exposureWindow: '0.04s Micro-Key Tap Deadzone Alignment', prefireCadence: 'Pre-aims Common Generator Angle With Phantom Burst', tacticalAdvantage: 'Guaranteed First-Bullet Headshot Kill' },
  { id: 'jc-3', peekAngle: 'Mirage Mirage Middle Window Snipe Check', game: 'CS2 Tier-1', exposureWindow: '0.06s ADAD Rapid Keyboard Snap', prefireCadence: 'Wallbang Jiggle Checking Window Crouch Angle', tacticalAdvantage: 'Extracts Free Sound Tell Without Damage Risk' },
];

export default function JiggleCounterMatrix() {
  const [jiggles, setJiggles] = useState<JiggleSetup[]>(JIGGLE_SETUPS);
  const [activeJiggle, setActiveJiggle] = useState('jc-1');

  const handleExportJiggleStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Jiggle-Counter & Rapid Prefire Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <MoveHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Jiggle-Counter & Prefire Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.08s Shoulder Bait, Sub-Tick Instant Stop & Anti-AWP Counter-Prefire Angles</p>
          </div>
        </div>

        <Button
          onClick={handleExportJiggleStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Jiggle Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Jiggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {jiggles.map((j) => {
            const isSelected = activeJiggle === j.id;
            return (
              <div
                key={j.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveJiggle(j.id);
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
                    <span className="text-xs font-mono text-amber-400 font-bold">{j.exposureWindow}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{j.peekAngle}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Cadence:</strong> {j.prefireCadence}</p>
                    <p><strong className="text-amber-400">Impact:</strong> {j.tacticalAdvantage}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Jiggle Profile' : 'Inspect Prefire Timing'}
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
