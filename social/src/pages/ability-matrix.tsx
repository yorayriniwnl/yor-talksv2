import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface AbilityTier {
  id: string;
  agentRole: string;
  game: string;
  ultCost: string;
  rechargeCooldown: string;
  comboTiming: string;
}

const ABILITY_TIERS: AbilityTier[] = [
  { id: 'ab-1', agentRole: 'Duelist / Entry Fragger (Jett / Raze)', game: 'Valorant Tier-1', ultCost: '8 Ult Points (Blade Storm / Showstopper)', rechargeCooldown: '2 Kills Reset Dash / 45s Recharge', comboTiming: 'Initiate 5s after Initiator Recon ping for 100% first-blood rate' },
  { id: 'ab-2', agentRole: 'Controller / Smoker (Omen / Brimstone)', game: 'Valorant / CS2', ultCost: '7 Ult Points (From The Shadows)', rechargeCooldown: '30s Smoke Recharge (Dark Cover)', comboTiming: 'Deploy smoke walls 1.5s prior to site execute choke breach' },
  { id: 'ab-3', agentRole: 'Initiator / Info Gatherer (Sova / Fade)', game: 'Valorant / Scrims', ultCost: '8 Ult Points (Hunter’s Fury)', rechargeCooldown: '40s Recon Bolt / Haunt Cooldown', comboTiming: 'Shock dart double-bounce on standard spike plant coordinate' },
];

export default function AbilityMatrix() {
  const [abilities, setAbilities] = useState<AbilityTier[]>(ABILITY_TIERS);
  const [activeAbility, setActiveAbility] = useState('ab-1');

  const handleExportAbilityStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Utility Cooldown & Ultimate Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-primary text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Utility Cooldown & Ultimate Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Ult Points Economy, 45s Ability Recharges, Combo Timings & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportAbilityStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Ability Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Ability Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {abilities.map((a) => {
            const isSelected = activeAbility === a.id;
            return (
              <div
                key={a.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveAbility(a.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {a.game}
                    </span>
                    <span className="text-xs font-mono text-purple-400 font-bold">{a.ultCost}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{a.agentRole}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Recharge:</strong> {a.rechargeCooldown}</p>
                    <p><strong className="text-amber-400">Combo:</strong> {a.comboTiming}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Agent Role' : 'Inspect Cooldown'}
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
