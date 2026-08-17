import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Terminal, Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Cpu, Monitor 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteGlitchMatrixStudio() {
  const [glitchesDisplaced, setGlitchesDisplaced] = useState(32);

  const handleCopyOBSGlitchMatrix = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-glitch-matrix?fps=60&glitch=cyber-slice&vhs=true`);
    toast.success('📋 OBS Studio Transparent 60FPS Cyberpunk Glitch Matrix URL copied!');
  };

  const handleTriggerGlitchSlice = (glitchMulti: number) => {
    sounds.playChime();
    triggerConfetti();
    setGlitchesDisplaced(g => g + (glitchMulti * 8));
    toast.success(`⚡ ${glitchMulti * 8}x CYBERPUNK RGB CHROMATIC GLITCH SLICES TRIGGERED ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-600 to-cyan-400 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Glitch Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS CRT Scanlines, RGB Chromatic Slices & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSGlitchMatrix}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Glitch URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Glitch Matrix HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> 60FPS RGB CHROMATIC GLITCH SLICE EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-pink-400">⚡ {glitchesDisplaced} Glitch Slices</h2>
            <p className="font-mono text-xs text-muted-foreground">Cyberpunk RGB Scanline Displacements Triggered on Hype Spikes & Raids</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleTriggerGlitchSlice(1)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Trigger 8x Glitch Slices
            </Button>
            <Button onClick={() => handleTriggerGlitchSlice(4)} className="rounded-2xl font-bold text-xs bg-pink-600 text-white shadow-md">
              ⚡ 32x Cyber Anarchy Distortion
            </Button>
            <Button onClick={() => setGlitchesDisplaced(0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Glitches
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
