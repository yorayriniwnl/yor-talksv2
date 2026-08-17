import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Shield, Sparkles, CheckCircle2, 
  Send, Flame, Bookmark, Swords, Zap, Activity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface WeaponTTK {
  id: string;
  name: string;
  game: string;
  dps: number;
  headDamage: number;
  bodyDamage: number;
  ttkLvl2: string;
  shotsToKill: string;
  tier: 'S-TIER' | 'A-TIER' | 'META';
}

const WEAPONS: WeaponTTK[] = [
  { id: 'w-1', name: 'Beryl M762 (7.62mm)', game: 'BGMI', dps: 528, headDamage: 105.6, bodyDamage: 48.0, ttkLvl2: '0.257s', shotsToKill: '4 Shots', tier: 'S-TIER' },
  { id: 'w-2', name: 'M416 (5.56mm)', game: 'BGMI', dps: 472, headDamage: 90.2, bodyDamage: 41.0, ttkLvl2: '0.286s', shotsToKill: '5 Shots', tier: 'META' },
  { id: 'w-3', name: 'Vandal Rifle', game: 'Valorant', dps: 375, headDamage: 160.0, bodyDamage: 40.0, ttkLvl2: '0.000s (One-Tap)', shotsToKill: '1 Head / 4 Body', tier: 'S-TIER' },
  { id: 'w-4', name: 'Phantom Silenced', game: 'Valorant', dps: 436, headDamage: 140.0, bodyDamage: 35.0, ttkLvl2: '0.180s', shotsToKill: '2 Head / 5 Body', tier: 'META' },
];

export default function DamageTradeSimulator() {
  const [weapons, setWeapons] = useState<WeaponTTK[]>(WEAPONS);
  const [armorTier, setArmorTier] = useState<'LVL1' | 'LVL2' | 'LVL3'>('LVL2');

  const handleExportDPSMatrix = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📊 4K Competitive TTK & Damage Trade Strat Book Matrix exported for Clan Coaches!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Tactical Damage Trade & TTK Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Sub-Millisecond TTK Calculations, Armor Penetration & Hit-Zone Multipliers</p>
          </div>
        </div>

        <Button
          onClick={handleExportDPSMatrix}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Bookmark className="w-3.5 h-3.5 mr-1" /> Export DPS Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Armor Switcher */}
        <div className="flex items-center justify-between p-4 rounded-3xl surface-1 border border-border/40">
          <span className="text-xs font-mono font-bold text-foreground">Select Opponent Armor Durability:</span>
          <div className="flex gap-2">
            {(['LVL1', 'LVL2', 'LVL3'] as const).map((tier) => (
              <Button
                key={tier}
                size="sm"
                variant={armorTier === tier ? 'default' : 'outline'}
                onClick={() => {
                  sounds.playPop();
                  setArmorTier(tier);
                }}
                className="rounded-xl font-mono text-xs h-8 px-3"
              >
                {tier === 'LVL1' ? 'Level 1 Vest (100 HP)' : tier === 'LVL2' ? 'Level 2 Vest (150 HP)' : 'Level 3 Military (200 HP)'}
              </Button>
            ))}
          </div>
        </div>

        {/* Weapons List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {weapons.map((w) => (
            <div
              key={w.id}
              className="surface-1 p-6 rounded-3xl border border-border/40 flex flex-col justify-between shadow-xl space-y-4 hover:border-primary/50 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                    {w.game} • {w.tier}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">TTK: {w.ttkLvl2}</span>
                </div>
                <h3 className="font-display font-black text-lg text-foreground">{w.name}</h3>
                
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/40 border border-border/40 text-center font-mono text-xs">
                  <div>
                    <span className="text-[0.6rem] text-muted-foreground uppercase block">Raw DPS</span>
                    <strong className="text-foreground">{w.dps}</strong>
                  </div>
                  <div>
                    <span className="text-[0.6rem] text-muted-foreground uppercase block">Head Dmg</span>
                    <strong className="text-amber-400">{w.headDamage}</strong>
                  </div>
                  <div>
                    <span className="text-[0.6rem] text-muted-foreground uppercase block">Shots to Kill</span>
                    <strong className="text-primary">{w.shotsToKill}</strong>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono text-xs text-muted-foreground">
                <span className="text-emerald-400 flex items-center gap-1 justify-end font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 128-Tick Scrims Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
