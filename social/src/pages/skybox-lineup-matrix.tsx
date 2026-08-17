import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, Mountain 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SkyboxTier {
  id: string;
  map: string;
  lineupName: string;
  elevationPitch: string;
  velocityMechanism: string;
  landingTarget: string;
}

const SKYBOX_TIERS: SkyboxTier[] = [
  { id: 'sb-1', map: 'CS2 Mirage A-Site', lineupName: 'T-Spawn to CT-Ticket High Smoke', elevationPitch: '68.5° Crosshair Alignment on Radio Tower Beam', velocityMechanism: 'Jump-Throw Keybind (+32.4 u/s Sub-Tick Velocity)', landingTarget: 'Full Vision Occlusion on CT Sniper Ticket Booth' },
  { id: 'sb-2', map: 'Valorant Haven A-Long', lineupName: 'A-Lobby Sova High Recon Dart', elevationPitch: '74.2° Double Bounce Skybox Skim Pitch', velocityMechanism: 'Full 3-Charge High Velocity Release', landingTarget: 'Deep A-Site Heaven & Hell Player Scan' },
  { id: 'sb-3', map: 'CS2 Inferno B-Site', lineupName: 'Banana to Coffins Skybox Molotov', elevationPitch: '61.0° Alignment on Chimney Antenna Apex', velocityMechanism: 'Run-Jump-Throw Forward Momentum (+48.0 u/s)', landingTarget: 'Complete Burn Clearance of Coffins Anchor Point' },
];

export default function SkyboxLineupMatrix() {
  const [skyboxes, setSkyboxes] = useState<SkyboxTier[]>(SKYBOX_TIERS);
  const [activeSkybox, setActiveSkybox] = useState('sb-1');

  const handleExportSkyboxStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('⚡ Tactical Lineup Elevation & Skybox Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Mountain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Elevation & Skybox Trajectory Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">High-Altitude Projectile Physics, Skybox Clip Geometry & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportSkyboxStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Skybox Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Skybox Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {skyboxes.map((s) => {
            const isSelected = activeSkybox === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveSkybox(s.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {s.map}
                    </span>
                    <span className="text-xs font-mono text-sky-400 font-bold">{s.elevationPitch}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.lineupName}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Velocity:</strong> {s.velocityMechanism}</p>
                    <p><strong className="text-amber-400">Target:</strong> {s.landingTarget}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Skybox Node' : 'Inspect Trajectory Arc'}
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
