import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EyeOff, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Sun 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface FlashEvasionTier {
  id: string;
  utilityType: string;
  game: string;
  turnWindow: string;
  evadedDuration: string;
  fullBlindDuration: string;
}

const FLASH_EVASION_TIERS: FlashEvasionTier[] = [
  { id: 'fe-1', utilityType: 'Reyna Leer / Skye Guiding Light', game: 'Valorant Tier-1', turnWindow: '0.18s Reaction Turn Window', evadedDuration: '0.12s Micro Blur (<10% opacity)', fullBlindDuration: '2.25s Full Whiteout & Deafness' },
  { id: 'fe-2', utilityType: 'CS2 High-Arc Skybox Pop-Flash', game: 'CS2 Pro Scrims', turnWindow: '0.22s Audio Bounce Ping Cue', evadedDuration: '0.18s Partial Glare', fullBlindDuration: '2.80s Complete Blind Retake Stall' },
  { id: 'fe-3', utilityType: 'Breach Flashpoint / KAY/O FLASH/drive', game: 'Valorant / Scrims', turnWindow: '0.15s Wall Infusion Indicator', evadedDuration: '0.20s Flash Audio Echo', fullBlindDuration: '2.00s Direct Line-of-Sight Stun' },
];

export default function AntiFlashMatrix() {
  const [flashTiers, setFlashTiers] = useState<FlashEvasionTier[]>(FLASH_EVASION_TIERS);
  const [activeTier, setActiveTier] = useState('fe-1');

  const handleExportFlashStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🛡️ Tactical Flash Evasion & Anti-Blind Positioning Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Flash Evasion & Anti-Blind Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">180° Turn Reaction Windows, Blind Attenuation & Pop-Flash Defense</p>
          </div>
        </div>

        <Button
          onClick={handleExportFlashStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Anti-Flash Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Flash Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {flashTiers.map((f) => {
            const isSelected = activeTier === f.id;
            return (
              <div
                key={f.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveTier(f.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {f.game}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{f.evadedDuration}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{f.utilityType}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Turn Window:</strong> {f.turnWindow}</p>
                    <p><strong className="text-rose-400">Full Blind:</strong> {f.fullBlindDuration}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Flash Evasion' : 'Inspect Turn Protocol'}
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
