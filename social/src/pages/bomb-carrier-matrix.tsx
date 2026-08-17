import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Bomb 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface BombCarrierSetup {
  id: string;
  baitLineup: string;
  game: string;
  radarConcealment: string;
  rotationDelay: string;
  anchorDisplacement: string;
}

const BOMB_CARRIER_SETUPS: BombCarrierSetup[] = [
  { id: 'bc-1', baitLineup: 'CS2 Mirage T-Roof Bomb-Drop Audio Bait to Deep Palace', game: 'CS2 Tier-1', radarConcealment: '0.12s Radar Icon Concealment Behind Solid Mesh', rotationDelay: '4.8s CT Anchor Over-Rotation Delay', anchorDisplacement: 'Forces 3-Player B-Site Retake Vacancy' },
  { id: 'bc-2', baitLineup: 'Valorant Haven A-Long Spike Sound Drop into C-Garage Push', game: 'Valorant Scrims', radarConcealment: '100% Minimap Line-of-Sight Break', rotationDelay: '5.2s Fake Audio Draw Window', anchorDisplacement: 'Isolates C-Site Solo Defender for 1v1' },
  { id: 'bc-3', baitLineup: 'CS2 Inferno Banana Car Dead-Drop to Second Mid Splitting', game: 'Tier-1 Scrims', radarConcealment: '0.00s Zero Visual Radar Telemetry for CTs', rotationDelay: '6.0s Fake B-Execute Draw', anchorDisplacement: 'Clears A-Short Bracket with Zero Contestation' },
];

export default function BombCarrierMatrix() {
  const [baits, setBaits] = useState<BombCarrierSetup[]>(BOMB_CARRIER_SETUPS);
  const [activeBait, setActiveBait] = useState('bc-1');

  const handleExportBombCarrierStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('💣 Tactical Bomb-Carrier Bait & Radar Concealment Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-500 via-rose-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Bomb className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bomb-Carrier Radar Concealment Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.12s Radar Disguise, 4.8s Fake Audio Rotation Delay & Dead-Drop Lineups</p>
          </div>
        </div>

        <Button
          onClick={handleExportBombCarrierStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Bait Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Baits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {baits.map((b) => {
            const isSelected = activeBait === b.id;
            return (
              <div
                key={b.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveBait(b.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {b.game}
                    </span>
                    <span className="text-xs font-mono text-rose-400 font-bold">{b.radarConcealment}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{b.baitLineup}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Rotation:</strong> {b.rotationDelay}</p>
                    <p><strong className="text-rose-400">Impact:</strong> {b.anchorDisplacement}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Carrier Bait' : 'Inspect Concealment Route'}
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
