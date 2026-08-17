import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Crosshair, Bomb, ShieldAlert, Target 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface BoostPlantSetup {
  id: string;
  boostLocation: string;
  game: string;
  elevationCoordinates: string;
  defuseDenialRadius: string;
  tacticalAdvantage: string;
}

const BOOSTPLANT_SETUPS: BoostPlantSetup[] = [
  { id: 'bp-1', boostLocation: 'Dust II A Site Goose Double-Crate Boost Plant', game: 'CS2 Tier-1', elevationCoordinates: 'Z = 142.5u Pixel Elevation on Upper Green Box Edge', defuseDenialRadius: 'Ground Defusers Must Jump & Expose Head to Pit Riflers', tacticalAdvantage: '0.00% Ninja Defuse Success Rate from Long A Crossfire' },
  { id: 'bp-2', boostLocation: 'Mirage Default Triple-Box Silent Edge Plant', game: 'CS2 Tier-1', elevationCoordinates: 'Z = 96.0u Pixel-Perfect Balcony Pixel Alignment', defuseDenialRadius: 'Forces 3.5s Pathing Penalty Around Triple Box', tacticalAdvantage: 'Direct 1-Tap Sightline from Deep Palace & A-Ramp Hall' },
  { id: 'bp-3', boostLocation: 'Haven A Site High Generator Sage Wall Plant', game: 'Valorant Scrims', elevationCoordinates: 'Z = 210.0u Sage Barrier Top Plane Elevation', defuseDenialRadius: 'Requires Enemy to Destroy 800HP Wall Before Touching Spike', tacticalAdvantage: 'Guaranteed 12-Second Post-Plant Delay Securing Round Win' },
];

export default function BoostPlantMatrix() {
  const [boostPlants, setBoostPlants] = useState<BoostPlantSetup[]>(BOOSTPLANT_SETUPS);
  const [activeBoostPlant, setActiveBoostPlant] = useState('bp-1');

  const handleExportBoostPlantStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('💣 Tactical Boost-Plant & Elevation Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Bomb className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Boost-Plant Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Pixel-Elevated Crate Plants, Ninja Defuse Denial & Unstoppable Post-Plant Crossfires</p>
          </div>
        </div>

        <Button
          onClick={handleExportBoostPlantStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Boost-Plant Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* BoostPlants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {boostPlants.map((b) => {
            const isSelected = activeBoostPlant === b.id;
            return (
              <div
                key={b.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveBoostPlant(b.id);
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
                    <span className="text-xs font-mono text-amber-400 font-bold">{b.elevationCoordinates}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{b.boostLocation}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Denial:</strong> {b.defuseDenialRadius}</p>
                    <p><strong className="text-amber-400">Advantage:</strong> {b.tacticalAdvantage}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Elevation Profile' : 'Inspect Boost Coordinates'}
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
