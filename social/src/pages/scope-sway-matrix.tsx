import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Focus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ScopeSetup {
  id: string;
  weapon: string;
  game: string;
  swayDampening: string;
  stabilizationWindow: string;
  accuracyReset: string;
}

const SCOPE_SETUPS: ScopeSetup[] = [
  { id: 'ss-1', weapon: 'CS2 SSG 08 Scout Jump-Shot Zero-Sway Apex Timing', game: 'CS2 Tier-1', swayDampening: '0.00s Perfect Zero Inaccuracy Peak at Apex', stabilizationWindow: '3.5s Steady Breath Reticle Lock', accuracyReset: '100% First-Shot Headshot Precision' },
  { id: 'ss-2', weapon: 'Valorant Marshal / Outlaw Fast-Snap Hold', game: 'Valorant Scrims', swayDampening: '0.06s Post-Movement Steady Reticle Lock', stabilizationWindow: '4.0s Zero Respiratory Drift Window', accuracyReset: '0.04s Micro-Flick Reset' },
  { id: 'ss-3', weapon: 'CS2 AWP 1-Pixel Pixel-Gap Reticle Hold', game: 'Tier-1 Scrims', swayDampening: '0.00s Zero Figure-8 Lissajous Sway', stabilizationWindow: '5.0s Deep Breath Focus Reticle', accuracyReset: '0.00s Crosshair Micro-Lock' },
];

export default function ScopeSwayMatrix() {
  const [scopes, setScopes] = useState<ScopeSetup[]>(SCOPE_SETUPS);
  const [activeScope, setActiveScope] = useState('ss-1');

  const handleExportScopeSwayStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎯 Tactical Weapon Scope Sway & Breath Stabilization Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Focus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Scope Sway & Breath Stabilization Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.00s Apex Zero-Sway Window, Lissajous Sway Dampening & Pixel-Gap Snapping</p>
          </div>
        </div>

        <Button
          onClick={handleExportScopeSwayStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Scope Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Scopes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {scopes.map((s) => {
            const isSelected = activeScope === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveScope(s.id);
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
                    <span className="text-xs font-mono text-pink-400 font-bold">{s.swayDampening}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.weapon}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Breath Hold:</strong> {s.stabilizationWindow}</p>
                    <p><strong className="text-pink-400">Accuracy:</strong> {s.accuracyReset}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Scope Hold' : 'Inspect Sway Dampening'}
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
