import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Music, Volume2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteDholakBeatStudio() {
  const [wavesEmitted, setWavesEmitted] = useState(28);

  const handleCopyOBSDholakBeat = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-dholak-beat?fps=60&sonic=gold-rings&bpm=128`);
    toast.success('📋 OBS Studio Transparent 60FPS Dholak Beat Soundwave URL copied!');
  };

  const handleEmitDholakWave = (waveMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setWavesEmitted(w => w + (waveMulti * 6));
    toast.success(`🥁 ${waveMulti * 6}x 3D GOLDEN SONIC DHOLAK WAVE RINGS PULSED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Dholak Wave Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 3D Sonic Resonance Rings, Desi Percussion Beats & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSDholakBeat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Dholak Beat URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Dholak Wave HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS 3D SONIC DHOLAK WAVE RING EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-amber-400">🥁 {wavesEmitted} Sonic Rings</h2>
            <p className="font-mono text-xs text-muted-foreground">Pulsating Golden Soundwave Shockwaves Triggered on Superchats & Sub Trains</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleEmitDholakWave(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Pulse 6x Dholak Waves
            </Button>
            <Button onClick={() => handleEmitDholakWave(4)} className="rounded-2xl font-bold text-xs bg-amber-500 text-black shadow-md">
              🥁 24x Bhangra Energy Blast
            </Button>
            <Button onClick={() => setWavesEmitted(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Waves
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
