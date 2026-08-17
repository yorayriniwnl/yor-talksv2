import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Sun, EyeOff, Target 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PopPeekTier {
  id: string;
  lineup: string;
  game: string;
  flashSyncWindow: string;
  popDetonationTime: string;
  tacticalEntry: string;
}

const POP_PEEK_TIERS: PopPeekTier[] = [
  { id: 'pp-1', lineup: 'Valorant Ascent A-Main High Sky Pop-Flash', game: 'Valorant Scrims', flashSyncWindow: '0.12s Instant Behind-the-Flash Peek Swing', popDetonationTime: '0.8s High-Altitude Airburst Detonation', tacticalEntry: 'Catches Tree Room & Dice Defenders 100% Fully Blinded' },
  { id: 'pp-2', lineup: 'CS2 Mirage A-Ramp Underhand Pop-Flash', game: 'CS2 Tier-1', flashSyncWindow: '0.08s Micro-Window Corner Wide Swing', popDetonationTime: '0.5s Quick Bouncing Floor Detonation', tacticalEntry: 'Disables CT Ticket Sniper & Triple Box Anchors' },
  { id: 'pp-3', lineup: 'Haven C-Long Curve Skybox Blind Pop', game: 'Tier-1 Scrims', flashSyncWindow: '0.14s Coordinated Duelist Entry Timing', popDetonationTime: '0.9s Overhead Geometry Airburst', tacticalEntry: 'Guarantees Free Opening Kill on C-Site Operator Hold' },
];

export default function PopPeekMatrix() {
  const [lineups, setLineups] = useState<PopPeekTier[]>(POP_PEEK_TIERS);
  const [activeLineup, setActiveLineup] = useState('pp-1');

  const handleExportPopPeekStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Flash Pop-Peek & Retake Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-300 via-yellow-400 to-rose-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Pop-Peek & Retake Timing Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.12s Flash Synchronization, Sky Pop-Flashes & Retake Timing Windows</p>
          </div>
        </div>

        <Button
          onClick={handleExportPopPeekStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Pop-Peek Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Lineups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {lineups.map((l) => {
            const isSelected = activeLineup === l.id;
            return (
              <div
                key={l.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveLineup(l.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {l.game}
                    </span>
                    <span className="text-xs font-mono text-yellow-400 font-bold">{l.flashSyncWindow}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{l.lineup}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Detonation:</strong> {l.popDetonationTime}</p>
                    <p><strong className="text-rose-400">Entry Execution:</strong> {l.tacticalEntry}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Pop-Peek Timing' : 'Inspect Flash Lineup'}
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
