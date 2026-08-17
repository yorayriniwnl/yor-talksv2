import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Sparkles, Copy, 
  Flame, Radio, Trophy, Plus, Crown, Activity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function LaserShowStudio() {
  const [beamsActive, setBeamsActive] = useState(16);

  const handleCopyOBSLaser = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/laser-show?fps=60&beams=32&theme=cyber-neon`);
    toast.success('📋 OBS Studio Transparent 60FPS Laser Show Studio URL copied!');
  };

  const handleFireLaserPulse = (count: number) => {
    sounds.playPop();
    triggerConfetti();
    setBeamsActive(b => b + count);
    toast.success(`⚡ ${count}x RGB CYBER LASER BEAMS EMITTED ON BROADCAST STAGE!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Chat Emote Laser Beam Show Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Arena Multi-Axis RGB Lasers, Stroboscopic Scanning & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSLaser}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Laser URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Laser HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS MULTI-AXIS SCANNING LASER EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-cyan-400">⚡ {beamsActive} Laser Beams</h2>
            <p className="font-mono text-xs text-muted-foreground">Synchronized to Audio Beats, Superchats & Scrims Clutch Moments</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleFireLaserPulse(4)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              +4 Laser Beams
            </Button>
            <Button onClick={() => handleFireLaserPulse(12)} className="rounded-2xl font-bold text-xs bg-cyan-500 text-black shadow-md">
              ⚡ 12x Stadium Grid Sweep
            </Button>
            <Button onClick={() => setBeamsActive(4)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Beams
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
