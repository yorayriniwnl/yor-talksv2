import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Crosshair, Eye, EyeOff, Sun 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PopFlashSetup {
  id: string;
  lineupLocation: string;
  game: string;
  detonationDelay: string;
  audioMasking: string;
  blindDuration: string;
}

const POPFLASH_SETUPS: PopFlashSetup[] = [
  { id: 'pf-1', lineupLocation: 'Inferno Banana Deep Sky Pop-Flash', game: 'CS2 Tier-1', detonationDelay: '0.04s Instant Air Detonation Upon Crossing Roof Edge', audioMasking: 'Zero Surface Clatter & Zero Audio Bounce Sound Tell', blindDuration: '4.87s Full Whiteout Blindness on Holding CT Rifler' },
  { id: 'pf-2', lineupLocation: 'Mirage A Ramp Over-Building Run-Throw', game: 'CS2 Tier-1', detonationDelay: '0.06s High Skyburst Above Tetris Line', audioMasking: 'Sub-Audible Detonation Vector Bypassing Site Audio', blindDuration: '5.10s Complete Blinding on Ticket & Triple Players' },
  { id: 'pf-3', lineupLocation: 'Ascent A Main Kay/O Right-Click Pop', game: 'Valorant Scrims', detonationDelay: '0.00s Direct Wall Detonation', audioMasking: 'Instant Flash Trigger Through Smoke Edge', blindDuration: '2.25s Instant Blind Window for Site Anchor Liquidation' },
];

export default function PopFlashMatrix() {
  const [popFlashes, setPopFlashes] = useState<PopFlashSetup[]>(POPFLASH_SETUPS);
  const [activePopFlash, setActivePopFlash] = useState('pf-1');

  const handleExportPopFlashStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('☀️ Tactical Pop-Flash & Auditory Masking Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Pop-Flash & Audio Masking Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.04s Sky Detonation, Zero Audio Bounce Tells & Unavoidable Full-Blind Angles</p>
          </div>
        </div>

        <Button
          onClick={handleExportPopFlashStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Pop-Flash Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* PopFlashes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {popFlashes.map((p) => {
            const isSelected = activePopFlash === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  sounds.playPop();
                  setActivePopFlash(p.id);
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
                    <span className="text-xs font-mono text-yellow-400 font-bold">{p.detonationDelay}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{p.lineupLocation}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Audio:</strong> {p.audioMasking}</p>
                    <p><strong className="text-yellow-400">Blind:</strong> {p.blindDuration}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Pop-Flash Profile' : 'Inspect Detonation Geometry'}
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
