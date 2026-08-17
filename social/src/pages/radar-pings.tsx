import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, Sparkles, Copy, 
  MapPin, Download, CheckCircle2, Zap, AlertTriangle, ShieldAlert, Target 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface CalloutTier {
  id: string;
  locationName: string;
  game: string;
  pingType: string;
  dangerLevel: string;
  tacticalCallout: string;
}

const CALLOUT_TIERS: CalloutTier[] = [
  { id: 'cl-1', locationName: 'A-Short / Haven Lamps / A-Main', game: 'Valorant Tier-1', pingType: 'Red Threat / Sniper Sightline', dangerLevel: 'High (Operator Angle)', tacticalCallout: 'Smoking Lamps doorway denies defender Op angle; flash over A-Main box' },
  { id: 'cl-2', locationName: 'B-Long / Mirage B-Apartments', game: 'CS2 / Valorant', pingType: 'Yellow Utility Ping', dangerLevel: 'Medium (Rush Choke)', tacticalCallout: 'Double molly corridor entrance to delay execute by 14 seconds' },
  { id: 'cl-3', locationName: 'Mid Window / Ascent Mid Courtyard', game: 'Valorant / Scrims', pingType: 'Blue Recon / Wallbang Ping', dangerLevel: 'Critical Map Control', tacticalCallout: 'Breach flash through Mid Tiles allows instant Catwalk control' },
];

export default function RadarPings() {
  const [callouts, setCallouts] = useState<CalloutTier[]>(CALLOUT_TIERS);
  const [activeCallout, setActiveCallout] = useState('cl-1');

  const handleExportRadarStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Map Callouts & Radar Ping Wheel Guide exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-600 to-blue-700 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Map Callouts & Radar Pings Deck</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Ping Wheel Markers, Sniper Sightlines, Choke Point Calls & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportRadarStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Radar Callouts
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Callout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {callouts.map((c) => {
            const isSelected = activeCallout === c.id;
            return (
              <div
                key={c.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveCallout(c.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {c.game}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{c.dangerLevel}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{c.locationName}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Ping:</strong> {c.pingType}</p>
                    <p><strong className="text-amber-400">Callout:</strong> {c.tacticalCallout}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Map Callout' : 'Inspect Sightline'}
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
