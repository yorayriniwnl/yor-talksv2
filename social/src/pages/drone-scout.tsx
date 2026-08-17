import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Navigation, Sparkles, CheckCircle2, 
  Send, Shield, Flame, Crosshair, Eye, Video 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface DroneTarget {
  id: string;
  name: string;
  grid: string;
  occupancy: string;
  vehicles: string;
  status: 'CLEAR' | 'HOSTILE' | 'CONTESTED';
}

const TARGETS: DroneTarget[] = [
  { id: 'dt-1', name: 'Rozhok Water City Complex', grid: 'Grid D-4', occupancy: '3 Enemies Detected (Sniper on Roof)', vehicles: '1 Dacia Sedan Tagged', status: 'HOSTILE' },
  { id: 'dt-2', name: 'School Apartments Red Building', grid: 'Grid E-5', occupancy: '4-Stack Squad Holding Staircase', vehicles: '2 UAZ Tagged', status: 'HOSTILE' },
  { id: 'dt-3', name: 'Farm Triple Warehouses', grid: 'Grid F-7', occupancy: 'Clear / No Movement', vehicles: '1 Buggy Tagged', status: 'CLEAR' },
  { id: 'dt-4', name: 'Pochinki South Ridge Compound', grid: 'Grid E-6', occupancy: '2 Scrims Duos in Firefight', vehicles: 'Motorbike Burning', status: 'CONTESTED' },
];

export default function DroneScout() {
  const [targets, setTargets] = useState<DroneTarget[]>(TARGETS);

  const handleDispatchRecon = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🛸 Live Tactical Drone Telemetry & Enemy Coordinates dispatched to Squad Voice Comms & Discord!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Tactical Drone Scouting Hub</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Aerial UAV Reconnaissance, Compound Occupancy AI & Vehicle Tags</p>
          </div>
        </div>

        <Button
          onClick={handleDispatchRecon}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Dispatch Squad Recon
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-4 font-sans">
          {targets.map((t) => (
            <div
              key={t.id}
              className={cn(
                "surface-1 p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between shadow-xl gap-4 transition-all",
                t.status === 'HOSTILE' ? "border-red-500/40 bg-red-500/5" :
                t.status === 'CONTESTED' ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/40 bg-emerald-500/5"
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-lg font-mono font-bold text-[0.65rem]",
                    t.status === 'HOSTILE' ? "bg-red-500/20 text-red-400" :
                    t.status === 'CONTESTED' ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                  )}>
                    {t.status}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{t.grid}</span>
                </div>
                <h3 className="font-display font-black text-lg text-foreground">{t.name}</h3>
                <p className="text-xs font-mono text-muted-foreground">{t.occupancy} • <strong className="text-primary">{t.vehicles}</strong></p>
              </div>

              <div className="text-right font-mono text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Thermal Lock 100%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
