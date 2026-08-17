import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Zap, Target, Activity, ShieldAlert 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ArmorTier {
  id: string;
  name: string;
  game: string;
  durability: string;
  damageReduction: string;
  shotsToKill: string;
}

const ARMOR_TIERS: ArmorTier[] = [
  { id: 'ar-1', name: 'Heavy Shield (Full Armor 50HP)', game: 'Valorant Tier-1', durability: '150 Total HP', damageReduction: '66% Absorbed to Shield', shotsToKill: '4 Torso Shots (Vandal) / 1 Headshot' },
  { id: 'ar-2', name: 'Spetsnaz Level 3 Helmet + Military Vest', game: 'BGMI / PUBG Scrims', durability: '250 Vest HP / 230 Helm HP', damageReduction: '55% Torso / 55% Headshot Reduction', shotsToKill: '6 Chest Shots (M416) / 2 AWM Headshots' },
  { id: 'ar-3', name: 'Kevlar Body Armor + Tactical Helmet', game: 'Counter-Strike 2', durability: '100 Armor Points', damageReduction: '50% Aim Punch / 52% Bullet Dampening', shotsToKill: '4 Chest Hits (AK-47) / 1 Headshot (Dink)' },
];

export default function ArmorMatrix() {
  const [armors, setArmors] = useState<ArmorTier[]>(ARMOR_TIERS);
  const [activeArmor, setActiveArmor] = useState('ar-1');

  const handleExportArmorStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🛡️ Tactical Armor Penetration & TTK Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-slate-900 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Armor Penetration & TTK Multiplier Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Vest Absorption, Aim-Punch Dampening, Effective TTK & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportArmorStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Armor Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Armor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {armors.map((a) => {
            const isSelected = activeArmor === a.id;
            return (
              <div
                key={a.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveArmor(a.id);
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
                    <span className="text-xs font-mono text-cyan-400 font-bold">{a.durability}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{a.name}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Reduction:</strong> {a.damageReduction}</p>
                    <p><strong className="text-amber-400">Hits to Kill:</strong> {a.shotsToKill}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Armor Tier' : 'Inspect Armor'}
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
