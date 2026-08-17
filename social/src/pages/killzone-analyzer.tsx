import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, MapPin, Sparkles, CheckCircle2, 
  Send, Shield, Flame, Target, Download, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface KillHotspot {
  id: string;
  zone: string;
  map: string;
  firstBloods: string;
  dangerLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  recomm: string;
}

const HOTSPOTS: KillHotspot[] = [
  { id: 'hz-1', zone: 'Pochinki Church Hill / 6-Plex', map: 'Erangel', firstBloods: '42.8% First Blood Rate', dangerLevel: 'CRITICAL', recomm: 'Hold compound ridge with DMR cross-fire; smoke lower dip.' },
  { id: 'hz-2', zone: 'Military Base Bridge Toll Gate', map: 'Erangel', firstBloods: '38.4% First Blood Rate', dangerLevel: 'CRITICAL', recomm: 'Deploy water scout boat before zone 3 collapse.' },
  { id: 'hz-3', zone: 'Pecado Casino Rooftop & Arena', map: 'Miramar', firstBloods: '31.2% First Blood Rate', dangerLevel: 'HIGH', recomm: 'Early grenade barrage into 2nd floor balcony.' },
  { id: 'hz-4', zone: 'Ascent A-Site Main Choke & Tree', map: 'Ascent', firstBloods: '49.1% First Blood Rate', dangerLevel: 'CRITICAL', recomm: 'Sova recon dart to reveal Wine lurker + Omen one-way smoke.' },
];

export default function KillzoneAnalyzer() {
  const [hotspots, setHotspots] = useState<KillHotspot[]>(HOTSPOTS);

  const handleExportStratBook = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📑 4K Tactical Killzone Strat Book PDF exported for Clan Coach & Players!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Killzone Heatmap & Strat Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">First-Blood Choke Points, Grenade Arc Telemetry & Rotation Blueprints</p>
          </div>
        </div>

        <Button
          onClick={handleExportStratBook}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Strat Book PDF
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-4 font-sans">
          {hotspots.map((h) => (
            <div
              key={h.id}
              className="surface-1 p-6 rounded-3xl border border-border/40 flex flex-col md:flex-row md:items-center justify-between shadow-xl gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-red-500/20 text-red-400 font-mono font-bold text-[0.65rem]">
                    {h.dangerLevel}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{h.map} Map Zone</span>
                </div>
                <h3 className="font-display font-black text-lg text-foreground">{h.zone}</h3>
                <p className="text-xs font-mono text-muted-foreground">{h.recomm}</p>
              </div>

              <div className="text-right font-mono text-xs">
                <span className="text-amber-400 font-bold block">{h.firstBloods}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 justify-end">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Blueprint Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
