import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Headphones, EyeOff, Wind 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface FlashBaitSetup {
  id: string;
  fakeSetup: string;
  game: string;
  rotationDrawTime: string;
  baitWindow: string;
  executionSplit: string;
}

const FLASH_BAIT_SETUPS: FlashBaitSetup[] = [
  { id: 'fb-1', fakeSetup: 'CS2 Mirage B-Apartments Skybox Flash Bait + Fast A-Split', game: 'CS2 Tier-1', rotationDrawTime: '4.2s Anchor Pull from A-Site Ticket', baitWindow: '0.14s High-Arc Airburst Blind Sound Bait', executionSplit: '1-Man Fake B Smoke/Flash + 4-Man Silent A Ramp Sprint' },
  { id: 'fb-2', fakeSetup: 'Valorant Ascent B-Main Wingman Audio Decoy + A-Tree Hit', game: 'Valorant Scrims', rotationDrawTime: '3.8s Market Defender Over-Rotate Delay', baitWindow: '0.18s Gekko Dizzy High Flash Flare Sound Bait', executionSplit: '1 Gekko Ult Cue Fake B + 4-Man A Garden Blitz' },
  { id: 'fb-3', fakeSetup: 'Bind B-Long Teleporter Sound Bait + Hookah Push', game: 'Tier-1 Scrims', rotationDrawTime: '5.1s A-Site Defender Cross-Map Sprint', baitWindow: '0.12s Instant Teleporter Audio Masking', executionSplit: 'Decoy Drone Sound Teleport + 4-Man Hookah Breach' },
];

export default function FlashBaitMatrix() {
  const [baits, setBaits] = useState<FlashBaitSetup[]>(FLASH_BAIT_SETUPS);
  const [activeBait, setActiveBait] = useState('fb-1');

  const handleExportFlashBaitStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Flash-Bait Decoy & Audio-Fake Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-red-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Flash-Bait & Audio-Fake Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.14s High-Arc Audio Deception, 4.2s Anchor Rotations & 4-Man Silent Splits</p>
          </div>
        </div>

        <Button
          onClick={handleExportFlashBaitStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Bait Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Baits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {baits.map((b) => {
            const isSelected = activeBait === b.id;
            return (
              <div
                key={b.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveBait(b.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {b.game}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{b.rotationDrawTime}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{b.fakeSetup}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Audio Bait:</strong> {b.baitWindow}</p>
                    <p><strong className="text-amber-400">Execution Split:</strong> {b.executionSplit}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Flash Bait' : 'Inspect Fake Routine'}
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
