import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Crosshair 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PeekTier {
  id: string;
  peekStyle: string;
  game: string;
  exposureTime: string;
  baitEffect: string;
  preAimAngle: string;
}

const PEEK_TIERS: PeekTier[] = [
  { id: 'pk-1', peekStyle: 'Shoulder Jiggle-Peek (A/D Micro Tap)', game: 'Valorant / CS2 Pro', exposureTime: '0.06s Sub-Frame Exposure', baitEffect: '100% Baits Operator / AWP dry fire without taking damage', preAimAngle: 'Micro crosshair placement on holding angle pixel' },
  { id: 'pk-2', peekStyle: 'Ferrari Wide-Swing (Full Momentum)', game: 'CS2 Tier-1 LAN', exposureTime: '0.24s Kinetic Momentum Drift', baitEffect: 'Breaks defender static crosshair placement & tracking', preAimAngle: 'Pre-fired headshot alignment before clearing corner' },
  { id: 'pk-3', peekStyle: 'Crouch-Slide Cut Peek (Velocity Cancel)', game: 'Valorant Tier-1 Scrims', exposureTime: '0.14s Rapid Elevation Drop', baitEffect: 'Dodges crosshair at head-level crosshair holding height', preAimAngle: 'Sub-tick instant first-bullet burst tap execution' },
];

export default function JigglePeekMatrix() {
  const [peeks, setPeeks] = useState<PeekTier[]>(PEEK_TIERS);
  const [activePeek, setActivePeek] = useState('pk-1');

  const handleExportPeekStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Jiggle-Peek & Shoulder-Bait Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Jiggle-Peek & Shoulder-Bait Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Sub-Frame Exposure Times, Sniper Baiting, Kinetic Swing Momentum & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportPeekStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Peeking Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Peek Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {peeks.map((p) => {
            const isSelected = activePeek === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  sounds.playPop();
                  setActivePeek(p.id);
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
                    <span className="text-xs font-mono text-cyan-400 font-bold">{p.exposureTime}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{p.peekStyle}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Bait:</strong> {p.baitEffect}</p>
                    <p><strong className="text-amber-400">Pre-Aim:</strong> {p.preAimAngle}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Peeking Mechanic' : 'Inspect Kinematics'}
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
