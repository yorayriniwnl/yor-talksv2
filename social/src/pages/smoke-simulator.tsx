import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, Sparkles, Copy, 
  Eye, EyeOff, Shield, Swords, Download, CheckCircle2, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SmokeUtility {
  id: string;
  agent: string;
  game: string;
  duration: string;
  bloomRadius: string;
  oneWayAngle: string;
}

const SMOKES: SmokeUtility[] = [
  { id: 'sm-1', agent: 'Omen Dark Cover', game: 'Valorant Tier-1', duration: '15.00s Duration', bloomRadius: '4.10m Sphere', oneWayAngle: 'Ascent A-Main Box Headshot Angle' },
  { id: 'sm-2', agent: 'Brimstone Sky Smoke', game: 'Valorant Tier-1', duration: '19.25s Extended', bloomRadius: '4.50m Opaque', oneWayAngle: 'Bind B-Site Hookah Choke Seal' },
  { id: 'sm-3', agent: 'Viper Toxic Screen', game: 'Valorant Tier-1', duration: 'Fuel Based (15s Max)', bloomRadius: '40m Continuous Wall', oneWayAngle: 'Breeze Mid & A-Site Deep Partition' },
];

export default function SmokeSimulator() {
  const [smokes, setSmokes] = useState<SmokeUtility[]>(SMOKES);
  const [activeSmoke, setActiveSmoke] = useState('sm-1');

  const handleExportSmokeStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('💨 Tactical One-Way Smoke & Site Retake Strat exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-600 to-slate-800 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Smoke Wall & Lineup Simulator</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Vision Blocking Bloom, Decay Timers, One-Way Lineups & Strat Guide Export</p>
          </div>
        </div>

        <Button
          onClick={handleExportSmokeStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Smoke Strat
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Smoke Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {smokes.map((s) => {
            const isSelected = activeSmoke === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveSmoke(s.id);
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
                    <span className="text-xs font-mono text-purple-400 font-bold">{s.duration}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.agent}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Bloom Radius:</strong> {s.bloomRadius}</p>
                    <p><strong className="text-cyan-400">One-Way Lineup:</strong> {s.oneWayAngle}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Lineup' : 'Inspect Lineup'}
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
