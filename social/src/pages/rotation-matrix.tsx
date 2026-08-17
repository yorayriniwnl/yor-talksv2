import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface RotationTier {
  id: string;
  mapRoute: string;
  game: string;
  sprintTiming: string;
  knifeBonus: string;
  flankWindow: string;
}

const ROTATION_TIERS: RotationTier[] = [
  { id: 'rm-1', mapRoute: 'Haven (A-Site to C-Site via CT Spawn)', game: 'Valorant Tier-1', sprintTiming: '14.2s Full Sprint', knifeBonus: '11.8s with Melee Knife (+20% Speed)', flankWindow: 'Attacker A-Long flank reaches CT connector at 16.5s' },
  { id: 'rm-2', mapRoute: 'Ascent (B-Site to A-Site via Mid Pizza)', game: 'Valorant / CS2', sprintTiming: '12.4s Mid Rotate', knifeBonus: '10.2s with Melee Knife', flankWindow: 'Mid Courtyard controller smoke delays flank by 15.0s' },
  { id: 'rm-3', mapRoute: 'Bind (A-Site to B-Site via TP Teleporter)', game: 'Valorant / Scrims', sprintTiming: '2.1s Instant TP Sound Cue', knifeBonus: 'Instant transit with audible audio spike', flankWindow: 'Hookah defenders have 3.2s crossfire setup window' },
];

export default function RotationMatrix() {
  const [rotations, setRotations] = useState<RotationTier[]>(ROTATION_TIERS);
  const [activeRotation, setActiveRotation] = useState('rm-1');

  const handleExportRotationStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🗺️ Tactical Map Rotation & Chokepoint Timing Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Map Rotation Timing Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">A-to-B Transit Clocks, Knife Sprint Bonuses, Flank Windows & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportRotationStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Rotation Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Rotation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {rotations.map((r) => {
            const isSelected = activeRotation === r.id;
            return (
              <div
                key={r.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveRotation(r.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {r.game}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{r.sprintTiming}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{r.mapRoute}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Knife Sprint:</strong> {r.knifeBonus}</p>
                    <p><strong className="text-amber-400">Flank Timing:</strong> {r.flankWindow}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Route' : 'Inspect Timing Clocks'}
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
