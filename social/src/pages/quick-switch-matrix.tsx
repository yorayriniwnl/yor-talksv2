import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightLeft, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, MoveRight, Gauge, Crosshair 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SwitchSetup {
  id: string;
  weaponCombo: string;
  game: string;
  cancelTiming: string;
  velocityBurst: string;
  recoilResetTime: string;
}

const SWITCH_SETUPS: SwitchSetup[] = [
  { id: 'qs-1', weaponCombo: 'CS2 AWP Bolt-Action Q-Q Double Tap Quick-Switch', game: 'CS2 Tier-1', cancelTiming: '0.12s Bolt Cocking Animation Cancellation', velocityBurst: '+50 u/s Instant Karambit Sprint Reposition', recoilResetTime: '0.00s Zero Scope Re-Aim Blur' },
  { id: 'qs-2', weaponCombo: 'Valorant Operator + Ghost Secondary Snap Swap', game: 'Valorant Scrims', cancelTiming: '0.15s Post-Shot Recovery Frame Bypass', velocityBurst: '+40 u/s Knife Jump-Peek Velocity', recoilResetTime: '0.08s 100% First-Shot Secondary Accuracy' },
  { id: 'qs-3', weaponCombo: 'CS2 Desert Eagle + Flashbang Quick-Holster Peek', game: 'Tier-1 Scrims', cancelTiming: '0.10s Deagle Recoil Recovery Quick-Drop', velocityBurst: '+35 u/s Fast Micro-Jiggle Reset', recoilResetTime: '0.05s Instant Pinpoint Reset' },
];

export default function QuickSwitchMatrix() {
  const [switches, setSwitches] = useState<SwitchSetup[]>(SWITCH_SETUPS);
  const [activeSwitch, setActiveSwitch] = useState('qs-1');

  const handleExportQuickSwitchStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Weapon Quick-Switch & Holster Animation Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Quick-Switch & Holster Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.12s Bolt-Action Animation Cancel, +50 u/s Knife Reposition & Recoil Resets</p>
          </div>
        </div>

        <Button
          onClick={handleExportQuickSwitchStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Switch Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Switches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {switches.map((s) => {
            const isSelected = activeSwitch === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveSwitch(s.id);
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
                    <span className="text-xs font-mono text-amber-400 font-bold">{s.cancelTiming}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.weaponCombo}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Velocity Burst:</strong> {s.velocityBurst}</p>
                    <p><strong className="text-amber-400">Recoil Reset:</strong> {s.recoilResetTime}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Quick-Switch' : 'Inspect Animation Cancel'}
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
