import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Activity, Zap, Compass, Mountain, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface OcclusionSetup {
  id: string;
  wallObstacle: string;
  game: string;
  materialTransmissionLoss: string;
  hrtfDirectionalDelay: string;
  tacticalAudioClarity: string;
}

const OCCLUSION_SETUPS: OcclusionSetup[] = [
  { id: 'ao-1', wallObstacle: 'CS2 Mirage Connector 18-inch Reinforced Concrete Wall', game: 'CS2 Tier-1', materialTransmissionLoss: '-12.5 dB Dense Concrete Sound Dampening', hrtfDirectionalDelay: '0.04s Precise Elevation Audio Intercept', tacticalAudioClarity: 'Isolates Footsteps on Catwalk vs Underpass' },
  { id: 'ao-2', wallObstacle: 'CS2 Inferno A-Apartments Double Plywood Wall', game: 'CS2 Tier-1', materialTransmissionLoss: '-3.2 dB High-Frequency Audio Leakage', hrtfDirectionalDelay: '0.02s Instant Gun-Cock Audio Detection', tacticalAudioClarity: 'Identifies Weapon Draw Type (AWP vs Flash)' },
  { id: 'ao-3', wallObstacle: 'Valorant Ascent B-Main Metal Shutter Box', game: 'Valorant Scrims', materialTransmissionLoss: '-8.0 dB Sheet Metal Resonant Reflection', hrtfDirectionalDelay: '0.03s Spatial Reverb Angle Isolation', tacticalAudioClarity: 'Pinpoints Exact Spike Defusal Contact' },
];

export default function AudioOcclusionMatrix() {
  const [occlusions, setOcclusions] = useState<OcclusionSetup[]>(OCCLUSION_SETUPS);
  const [activeOcclusion, setActiveOcclusion] = useState('ao-1');

  const handleExportAudioOcclusionStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🔊 Tactical Audio Occlusion & Material Transmission Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Audio Occlusion & Sonic Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">-12.5 dB Concrete Dampening, HRTF Elevation Delay & Material Transmission</p>
          </div>
        </div>

        <Button
          onClick={handleExportAudioOcclusionStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Audio Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Occlusions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {occlusions.map((o) => {
            const isSelected = activeOcclusion === o.id;
            return (
              <div
                key={o.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveOcclusion(o.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {o.game}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{o.materialTransmissionLoss}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{o.wallObstacle}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">HRTF Delay:</strong> {o.hrtfDirectionalDelay}</p>
                    <p><strong className="text-cyan-400">Clarity:</strong> {o.tacticalAudioClarity}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Audio Profile' : 'Inspect Transmission Loss'}
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
