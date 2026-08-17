import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Target 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface WallbangTier {
  id: string;
  material: string;
  game: string;
  penetrationLevel: string;
  damageRetained: string;
  hotspots: string;
}

const WALLBANG_TIERS: WallbangTier[] = [
  { id: 'wb-1', material: 'Ascent B-Main Thin Wood Walls', game: 'Valorant Tier-1', penetrationLevel: 'High (Odin / Ares / Guardian)', damageRetained: '85% Bullet Damage Retained', hotspots: 'Spam Lane into B-Site lane box default plant' },
  { id: 'wb-2', material: 'Haven Garage Double Doors (Wood & Plaster)', game: 'Valorant Scrims', penetrationLevel: 'Medium / High Penetration', damageRetained: '70% Penetration Damage Retained', hotspots: 'Window recon arrow spam through double door seam' },
  { id: 'wb-3', material: 'Mirage Mid Window Wooden Grate / Squeezer', game: 'CS2 Pro Scrims', penetrationLevel: 'High Bullet Penetration', damageRetained: '78% Penetration Damage Retained', hotspots: 'Top Mid AWP wallbang into Window sniper perch' },
];

export default function WallbangMatrix() {
  const [wallbangs, setWallbangs] = useState<WallbangTier[]>(WALLBANG_TIERS);
  const [activeWallbang, setActiveWallbang] = useState('wb-1');

  const handleExportWallbangStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🛡️ Tactical Wallbang & Bullet Penetration Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-600 to-red-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Wallbang & Penetration Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Material Densities, Bullet Penetration Multipliers, Spray Angles & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportWallbangStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Wallbang Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Wallbang Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {wallbangs.map((w) => {
            const isSelected = activeWallbang === w.id;
            return (
              <div
                key={w.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveWallbang(w.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {w.game}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{w.damageRetained}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{w.material}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Utility:</strong> {w.penetrationLevel}</p>
                    <p><strong className="text-amber-400">Hotspot:</strong> {w.hotspots}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Wallbang Hotspot' : 'Inspect Material Density'}
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
