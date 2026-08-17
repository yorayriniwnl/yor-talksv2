import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PeekTier {
  id: string;
  scenario: string;
  game: string;
  rttAdvantage: string;
  interpolationFrame: string;
  tacticalCounter: string;
}

const PEEK_TIERS: PeekTier[] = [
  { id: 'pk-1', scenario: 'High-Velocity Ferrari Wide Swing', game: 'CS2 Tier-1 Scrims', rttAdvantage: '45ms Peeker Vision Lead over Stationary Holder', interpolationFrame: 'Sub-Tick Interp Buffer (15.6ms Client Advance)', tacticalCounter: 'Off-Angle Positioning & Dynamic Crouch Reposition' },
  { id: 'pk-2', scenario: 'Poppin Swing / Fast Angle Slice', game: 'Valorant Tier-1', rttAdvantage: '32ms Server Rewind Hit Registration Window', interpolationFrame: '128-Tick Network Clock Packet Alignment', tacticalCounter: 'Utility Flash Counter & Jiggle Shoulder Bait' },
  { id: 'pk-3', scenario: 'Third-Person TPP Corner Slice', game: 'BGMI Pro Circuit', rttAdvantage: '60ms Desync Peek over High-Ping Anchors', interpolationFrame: '20Hz Mobile Network Tick Sync Offset', tacticalCounter: 'Pre-Fire Choke Line & Stun Grenade Delay' },
];

export default function PeekersAdvantageMatrix() {
  const [peeks, setPeeks] = useState<PeekTier[]>(PEEK_TIERS);
  const [activePeek, setActivePeek] = useState('pk-1');

  const handleExportPeekStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Peeker’s Advantage & Latency Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Peeker’s Advantage & Network Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">RTT Latency Delta, 15ms Interp Clocks, Server Rewind & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportPeekStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Network Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Peek Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {peeks.map((p) => {
            const isSelected = activePeek === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  sounds.playPop();
                  setActivePeek(p.id);
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
                    <span className="text-xs font-mono text-rose-400 font-bold">{p.rttAdvantage}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{p.scenario}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Network:</strong> {p.interpolationFrame}</p>
                    <p><strong className="text-amber-400">Counter:</strong> {p.tacticalCounter}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Latency Model' : 'Inspect Lag Compensation'}
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
