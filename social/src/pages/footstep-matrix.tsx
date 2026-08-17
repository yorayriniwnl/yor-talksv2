import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, Sparkles, Copy, 
  Headphones, Download, CheckCircle2, Zap, Radio, Activity, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SoundProp {
  id: string;
  movement: string;
  game: string;
  audibleRadius: string;
  surfacePitch: string;
  tacticalTip: string;
}

const SOUND_PROPS: SoundProp[] = [
  { id: 'snd-1', movement: 'Full Sprint / Tactical Run', game: 'Valorant / CS2', audibleRadius: '35.0m Maximum Radius', surfacePitch: 'Sharp High-Frequency Echo on Metal', tacticalTip: 'Enemies on A-Site can hear rotations from Mid Courtyard' },
  { id: 'snd-2', movement: 'Shift-Walk Movement', game: 'Valorant Tier-1', audibleRadius: '0.0m Complete Silence', surfacePitch: 'Zero Propagation Sound Profile', tacticalTip: 'Use for silent flank execution and site post-plant retakes' },
  { id: 'snd-3', movement: 'Hard Drop / Jump Landing', game: 'BGMI / CS2 Scrims', audibleRadius: '22.5m Heavy Thud', surfacePitch: 'Low-Frequency Bass Resonance', tacticalTip: 'Silent drop by crouching before hitting ground geometry' },
];

export default function FootstepMatrix() {
  const [props, setProps] = useState<SoundProp[]>(SOUND_PROPS);
  const [activeProp, setActiveProp] = useState('snd-1');

  const handleExportSoundStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎧 Tactical Footstep Audio Propagation Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Tactical Sound Distance & Audio Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Binaural Footstep Radii, Surface Acoustics, Shift-Walk Silence & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportSoundStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Audio Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Audio Props Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {props.map((p) => {
            const isSelected = activeProp === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveProp(p.id);
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
                    <span className="text-xs font-mono text-cyan-400 font-bold">{p.audibleRadius}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{p.movement}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Surface:</strong> {p.surfacePitch}</p>
                    <p><strong className="text-amber-400">Tactics:</strong> {p.tacticalTip}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Audio Profile' : 'Inspect Acoustics'}
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
