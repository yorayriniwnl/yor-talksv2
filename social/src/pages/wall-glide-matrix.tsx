import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Waves, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Wind, Compass, Mountain 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface GlideSetup {
  id: string;
  glideZone: string;
  game: string;
  glideVelocity: string;
  rampAngleAlignment: string;
  momentumRetention: string;
}

const GLIDE_SETUPS: GlideSetup[] = [
  { id: 'wg-1', glideZone: 'CS2 Nuke Ramp Downward Slope to Lower B-Site', game: 'CS2 Tier-1', glideVelocity: '320 u/s Extreme Surfing Acceleration', rampAngleAlignment: '14.5° Sub-Pixel Tangential Angle Strike', momentumRetention: '100% Zero Friction Speed Loss Entry' },
  { id: 'wg-2', glideZone: 'CS2 Overpass Monster Pipe Edge Slide to B Short', game: 'CS2 Tier-1', glideVelocity: '305 u/s Fast Pipe Wall-Glide', rampAngleAlignment: '18.0° Silent Edge Skate Window', momentumRetention: '0.00s Zero Footstep Audio tell' },
  { id: 'wg-3', glideZone: 'Valorant Fracture A-Drop Sloped Wall Surfing', game: 'Valorant Scrims', glideVelocity: '280 u/s Diagonal Momentum Glide', rampAngleAlignment: '22.4° Slanted Wall Contact Arc', momentumRetention: '0.06s Air-Strafe Accuracy Pre-Aim Reset' },
];

export default function WallGlideMatrix() {
  const [glides, setGlides] = useState<GlideSetup[]>(GLIDE_SETUPS);
  const [activeGlide, setActiveGlide] = useState('wg-1');

  const handleExportWallGlideStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🌊 Tactical Wall-Glide Momentum & Surfing Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-400 via-emerald-500 to-cyan-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Wall-Glide & Surfing Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">320 u/s Surfing Acceleration, 14.5° Sub-Pixel Tangential Arcs & Silent Slides</p>
          </div>
        </div>

        <Button
          onClick={handleExportWallGlideStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Glide Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Glides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {glides.map((g) => {
            const isSelected = activeGlide === g.id;
            return (
              <div
                key={g.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveGlide(g.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {g.game}
                    </span>
                    <span className="text-xs font-mono text-teal-400 font-bold">{g.glideVelocity}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{g.glideZone}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Ramp Angle:</strong> {g.rampAngleAlignment}</p>
                    <p><strong className="text-teal-400">Momentum:</strong> {g.momentumRetention}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Wall-Glide' : 'Inspect Surfing Vector'}
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
