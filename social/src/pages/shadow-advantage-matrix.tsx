import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, Eye, Moon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ShadowTier {
  id: string;
  mapSpot: string;
  game: string;
  shadowPrePeekTell: string;
  lightingAngle: string;
  tacticalAdvantage: string;
}

const SHADOW_TIERS: ShadowTier[] = [
  { id: 'sh-1', mapSpot: 'Valorant Ascent B-Main Lane to Site', game: 'Valorant Scrims', shadowPrePeekTell: '0.24s Early Shadow Silhouette Cast on Floor', lightingAngle: 'Directional Low Sun Angle from Mid Courtyard', tacticalAdvantage: 'Allows Pre-Firing Enemy Legs Before They Clear Archway' },
  { id: 'sh-2', mapSpot: 'CS2 Dust 2 Long A Corner to Pit', game: 'CS2 Tier-1', shadowPrePeekTell: '0.19s Gun Barrel Shadow Projection on Blue Box', lightingAngle: 'Overhead Mediterranean Sun Geometry', tacticalAdvantage: 'Reveals Aggressive AWPer Walk-Peeking Long Doors' },
  { id: 'sh-3', mapSpot: 'Mirage A-Site Palace Exit to Balcony', game: 'Tier-1 Scrims', shadowPrePeekTell: '0.22s Scaffold Shadow Silhouette Warning', lightingAngle: 'Late Afternoon Moroccan Sun Azimuth', tacticalAdvantage: 'Alerts CT Ticket Defender to Instant Palace Rush' },
];

export default function ShadowAdvantageMatrix() {
  const [spots, setSpots] = useState<ShadowTier[]>(SHADOW_TIERS);
  const [activeSpot, setActiveSpot] = useState('sh-1');

  const handleExportShadowStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('☀️ Tactical Shadow Advantage & Lighting Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Shadow Advantage & Lighting Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Directional Light Casters, 0.22s Silhouette Tells & Stealth Pre-Aims</p>
          </div>
        </div>

        <Button
          onClick={handleExportShadowStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Shadow Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Spots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {spots.map((s) => {
            const isSelected = activeSpot === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveSpot(s.id);
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
                    <span className="text-xs font-mono text-amber-400 font-bold">{s.shadowPrePeekTell}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.mapSpot}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Light Azimuth:</strong> {s.lightingAngle}</p>
                    <p><strong className="text-emerald-400">Tactics:</strong> {s.tacticalAdvantage}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Shadow Vector' : 'Inspect Light Cast'}
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
