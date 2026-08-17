import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, Sparkles, Copy, 
  Swords, Download, CheckCircle2, Shield, Flame, Activity, Zap, Headphones, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SoundMaskTier {
  id: string;
  strat: string;
  game: string;
  maskingDecibels: string;
  drownedAudioCue: string;
  tacticalOutcome: string;
}

const SOUND_MASK_TIERS: SoundMaskTier[] = [
  { id: 'sm-1', strat: 'AWP / Operator Heavy Gunfire Decibel Cover', game: 'CS2 & Valorant Scrims', maskingDecibels: '108 dB Peak Sound Floor', drownedAudioCue: 'Drowns 55 dB Running Footsteps & Bomb Drop Audio', tacticalOutcome: 'Allows 2-Man Silent Vent/Ramp Wrap without Shift-Walking' },
  { id: 'sm-2', strat: 'High-RPM Odin / Negev Pre-Fire Audio Curtain', game: 'Valorant Tier-1', maskingDecibels: '96 dB Continuous Wallbang Acoustic Barrier', drownedAudioCue: 'Completely Masks Sova Drone / Skye Dog Audio Cues', tacticalOutcome: 'Guarantees Undetected Site Entry on Lotus & Ascent' },
  { id: 'sm-3', strat: 'Decoy Grenade / Fake Reload Cancellation Bait', game: 'Tier-1 Scrims', maskingDecibels: '72 dB Click Mechanical Audio Bait', drownedAudioCue: 'Simulates Vulnerable Magazine Ejection State', tacticalOutcome: 'Forces Impatient Enemy Swing into Pre-Aimed Crosshair' },
];

export default function SoundMaskingMatrix() {
  const [strats, setStrats] = useState<SoundMaskTier[]>(SOUND_MASK_TIERS);
  const [activeStrat, setActiveStrat] = useState('sm-1');

  const handleExportSoundMaskingStrat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎧 Tactical Sound Masking & Decoy Matrix exported as PDF!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Sound Masking & Decoy Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Decibel Acoustic Camouflage, Audio Cues Drowning, Reload Baits & Strat Guide</p>
          </div>
        </div>

        <Button
          onClick={handleExportSoundMaskingStrat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Sound Masking Matrix
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Strats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          {strats.map((s) => {
            const isSelected = activeStrat === s.id;
            return (
              <div
                key={s.id}
                onClick={() => {
                  sounds.playPop();
                  setActiveStrat(s.id);
                }}
                className={cn(
                  "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {s.game}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{s.maskingDecibels}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{s.strat}</h3>

                  <div className="space-y-1 font-mono text-xs text-muted-foreground pt-2">
                    <p><strong className="text-foreground">Drowns:</strong> {s.drownedAudioCue}</p>
                    <p><strong className="text-amber-400">Tactics:</strong> {s.tacticalOutcome}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className={cn(
                    "w-full block py-2 rounded-xl text-center font-mono text-xs font-bold",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isSelected ? 'Active Audio Camouflage' : 'Simulate Decibel Mask'}
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
