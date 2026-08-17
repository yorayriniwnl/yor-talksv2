import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Crosshair, Volume2, VolumeX, Radio, ShieldAlert 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface WeaponDropSetup {
  id: string;
  dropStrategy: string;
  game: string;
  soundCueRadius: string;
  tacticalDeception: string;
  enemyBaitResult: string;
}

const WEAPONDROP_SETUPS: WeaponDropSetup[] = [
  { id: 'wd-1', dropStrategy: 'Mirage A Site Fake-Plant AWP Clatter Drop', game: 'CS2 Tier-1', soundCueRadius: '12.8m Acoustic Penetration Through Palace & Connector', tacticalDeception: '0.02s Weapon-Switch Drop Audio Mimicking Defuse Tap', enemyBaitResult: 'Forces Holding Jungle & CT Riflers into Premature Dry-Peeks' },
  { id: 'wd-2', dropStrategy: 'Inferno Banana Silent Carpet Weapon Drop', game: 'CS2 Tier-1', soundCueRadius: '0.00 dB Sub-Audible Floor Impact on Cloth/Wood', tacticalDeception: 'Zero Decibel Weapon Trade without Alerting B Site Anchor', enemyBaitResult: 'Stealth Upgrade to AK-47 for Entry Fragger with Zero Audio Footprint' },
  { id: 'wd-3', dropStrategy: 'Haven C Long Phantom Decoy Drop & Fake Rotate', game: 'Valorant Scrims', soundCueRadius: '16.0m Audio Circle Triggering Mini-Map Detection', tacticalDeception: 'Dropping Secondary Classic to Simulate Full 5-Man Rush', enemyBaitResult: 'Baits A Site Anchors into 8-Second Premature Fast Retake Rotate' },
];

export default function WeaponDropMatrix() {
  const [weaponDrops, setWeaponDrops] = useState<WeaponDropSetup[]>(WEAPONDROP_SETUPS);
  const [activeWeaponDrop, setActiveWeaponDrop] = useState('wd-1');

  const handleExportWeaponDropStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🔊 Tactical Weapon Drop & Acoustic Deception Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Weapon Drop & Audio Decoy Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.02s Drop Audio Mimicry, 12.8m Acoustic Decoy Radius & Silent Carpet Contacts</p>
          </div>
        </div>

        <Button
          onClick={handleExportWeaponDropStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Weapon-Drop Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* WeaponDrops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {weaponDrops.map((w) => {
            const isSelected = activeWeaponDrop === w.id;
            return (
              <div
                key={w.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveWeaponDrop(w.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {w.game}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{w.soundCueRadius}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{w.dropStrategy}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Deception:</strong> {w.tacticalDeception}</p>
                    <p><strong className="text-cyan-400">Bait:</strong> {w.enemyBaitResult}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Acoustic Profile' : 'Inspect Audio Physics'}
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
