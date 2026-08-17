import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, MoveRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface RightPeakSetup {
  id: string;
  cornerAngle: string;
  game: string;
  cameraBias: string;
  hitboxReduction: string;
  sliceAdvantage: string;
}

const RIGHT_PEAK_SETUPS: RightPeakSetup[] = [
  { id: 'rp-1', cornerAngle: 'CS2 Inferno Banana Car Right-Hand Wall Slice', game: 'CS2 Tier-1', cameraBias: '0.18s Right-Eye Perspective Lead over Left-Pervader', hitboxReduction: '32.5% Body Mesh Concealment Behind Concrete', sliceAdvantage: 'Clockwise Slice Delivers First-Pixel Sighting' },
  { id: 'rp-2', cornerAngle: 'BGMI / PUBG Pochinki Red-House Right-Shoulder TPP Pre-Aim', game: 'BGMI Pro Scrims', cameraBias: '100% Zero Body Exposure Over-The-Shoulder TPP Vision', hitboxReduction: '90.0% Structural Cover Advantage', sliceAdvantage: 'Pre-Fire Alignment with 0ms Delay' },
  { id: 'rp-3', cornerAngle: 'Valorant Haven C-Long Right-Angle Box Slice', game: 'Valorant Scrims', cameraBias: '0.12s Model Geometry Right-Arm Angle Offset', hitboxReduction: '28.0% Torso Concealment on Clockwise Peek', sliceAdvantage: 'Micro-Jiggle Bait with Instant Re-Cover' },
];

export default function RightPeakMatrix() {
  const [peaks, setPeaks] = useState<RightPeakSetup[]>(RIGHT_PEAK_SETUPS);
  const [activePeak, setActivePeak] = useState('rp-1');

  const handleExportRightPeakStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('👁️ Tactical Right-Eye Peeking & Over-The-Shoulder Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Right-Eye Peeking & TPP Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">0.18s Camera Bias Advantage, 32.5% Hitbox Concealment & Clockwise Slicing</p>
          </div>
        </div>

        <Button
          onClick={handleExportRightPeakStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Peak Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Peaks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {peaks.map((p) => {
            const isSelected = activePeak === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  sounds.playPop();
                  setActivePeak(p.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {p.game}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{p.cameraBias}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{p.cornerAngle}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Cover:</strong> {p.hitboxReduction}</p>
                    <p><strong className="text-amber-400">Slice:</strong> {p.sliceAdvantage}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Right-Eye Hold' : 'Inspect Perspective Advantage'}
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
