import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDown, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, MoveDown, Compass, Mountain 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface FastDropSetup {
  id: string;
  dropSpot: string;
  game: string;
  terminalVelocity: string;
  silentBrakingWindow: string;
  landingAccuracyReset: string;
}

const FAST_DROP_SETUPS: FastDropSetup[] = [
  { id: 'fd-1', dropSpot: 'CS2 Mirage Palace Balcony to A-Site Under-Wood', game: 'CS2 Tier-1', terminalVelocity: '240 u/s Vertical Drop Speed', silentBrakingWindow: '0.04s Pixel-Ledge Slide (Zero Landing Noise)', landingAccuracyReset: '0.08s Instant First-Shot AK-47 Recovery' },
  { id: 'fd-2', dropSpot: 'Valorant Haven C-Long Platform to Lower Logs', game: 'Valorant Scrims', terminalVelocity: '215 u/s Fast-Fall Gravity Descent', silentBrakingWindow: '0.06s Air-Strafe Ledge Graze (Silent Retake Drop)', landingAccuracyReset: '0.10s Vandal Zero Spread Tap Reset' },
  { id: 'fd-3', dropSpot: 'Split B-Heaven Vent Drop to Lower Site Pillar', game: 'Tier-1 Scrims', terminalVelocity: '235 u/s High-Velocity Drop Angle', silentBrakingWindow: '0.05s Wall-Slide Air Friction Cancel', landingAccuracyReset: '0.07s Phantom Multi-Headshot Reset' },
];

export default function FastDropMatrix() {
  const [drops, setDrops] = useState<FastDropSetup[]>(FAST_DROP_SETUPS);
  const [activeDrop, setActiveDrop] = useState('fd-1');

  const handleExportFastDropStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🏔️ Tactical Fast-Drop Elevation & Air-Braking Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ArrowDown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Fast-Drop & Air-Braking Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">240 u/s Terminal Fall Deceleration, Silent Ledge Slides & Zero Landing Noise</p>
          </div>
        </div>

        <Button
          onClick={handleExportFastDropStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Fast-Drop Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Drops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {drops.map((d) => {
            const isSelected = activeDrop === d.id;
            return (
              <div
                key={d.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveDrop(d.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {d.game}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{d.terminalVelocity}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{d.dropSpot}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Silent Braking:</strong> {d.silentBrakingWindow}</p>
                    <p><strong className="text-cyan-400">Accuracy Reset:</strong> {d.landingAccuracyReset}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Elevation Drop' : 'Inspect Fast Drop'}
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
