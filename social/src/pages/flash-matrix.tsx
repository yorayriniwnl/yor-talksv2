import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, Sparkles, Copy, 
  EyeOff, Shield, Swords, Download, CheckCircle2, Zap, Sun 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface FlashUtility {
  id: string;
  name: string;
  game: string;
  maxBlindDuration: string;
  turnEvasionDuration: string;
  bestAngle: string;
}

const FLASHES: FlashUtility[] = [
  { id: 'fl-1', name: 'Skye Guiding Light (Bird Flash)', game: 'Valorant Tier-1', maxBlindDuration: '2.00s Full Blind', turnEvasionDuration: '0.60s (Look Away)', bestAngle: 'Ascent B-Main High Sky Detonation' },
  { id: 'fl-2', name: 'Breach Flashpoint (Wall Pierce)', game: 'Valorant Tier-1', maxBlindDuration: '2.25s Max Blind', turnEvasionDuration: '0.75s (Wall Turn)', bestAngle: 'Haven A-Long Wall Deep Flash' },
  { id: 'fl-3', name: 'CS2 High-Pop Flashbang', game: 'Counter-Strike 2', maxBlindDuration: '3.10s Complete Whiteout', turnEvasionDuration: '0.40s (180 Turn)', bestAngle: 'Mirage A-Site Palace Roof Airburst' },
];

export default function FlashMatrix() {
  const [flashes, setFlashes] = useState<FlashUtility[]>(FLASHES);
  const [activeFlash, setActiveFlash] = useState('fl-1');

  const handleExportFlashGuide = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Pop-Flash & Blind Duration Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-400 via-amber-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Flashbang Duration & Blind Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Full Blind Durations, 180° Evasion Physics, Airburst Angles & Strat Book</p>
          </div>
        </div>

        <Button
          onClick={handleExportFlashGuide}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Flash Strat
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Flash Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {flashes.map((f) => {
            const isSelected = activeFlash === f.id;
            return (
              <div
                key={f.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveFlash(f.id);
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
                    <span className="text-xs font-mono text-amber-400 font-bold">{f.maxBlindDuration}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{f.name}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Turn Evasion:</strong> {f.turnEvasionDuration}</p>
                    <p><strong className="text-amber-400">Pop Angle:</strong> {f.bestAngle}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Flash Lineup' : 'Inspect Lineup'}
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
