import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Copy, 
  Flame, Zap, Trophy, Plus, Crown, Activity, Sun, Orbit, Radio, Disc3, Infinity, Atom, Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function EmoteCalabiYauStudio() {
  const [kahlerMetric, setKahlerMetric] = useState(6.0);

  const handleCopyOBSCalabiYau = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/emote-calabi-yau?fps=60&dim=6&kahler=6.0&stringHarmonics=true&glow=true`);
    toast.success('📋 OBS Studio Transparent 60FPS 6D Calabi-Yau Manifold URL copied!');
  };

  const handleCompactifyCalabiYau = (dimBoost: number) => {
    sounds.playChime();
    triggerConfetti();
    setKahlerMetric(k => parseFloat((k + dimBoost).toFixed(1)));
    toast.success(`🌌 6D STRING THEORY CALABI-YAU MANIFOLD COMPACTIFIED TO ${(kahlerMetric + dimBoost).toFixed(1)} KÄHLER METRIC ON STREAM!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-500 to-emerald-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Atom className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Chat Emote Calabi-Yau Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">60FPS 6D String Theory Calabi-Yau Manifold Cross-Section Emitter & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSCalabiYau}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Calabi-Yau URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Calabi-Yau HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Layers className="w-3.5 h-3.5" /> 60FPS 6D COMPACTIFIED KÄHLER MANIFOLD STRING HARMONIC EMITTER
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              🌌 k = {kahlerMetric} Kähler Metric
            </h2>
            <p className="font-mono text-xs text-muted-foreground">6-Dimensional Compactified String Cross-Sections & Glowing Chat Emote Vibrations on Subs</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleCompactifyCalabiYau(1.0)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              Compactify +1.0 k
            </Button>
            <Button onClick={() => handleCompactifyCalabiYau(4.0)} className="rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-400 via-teal-500 to-emerald-600 text-black shadow-md">
              🌌 6D String Resonance Surge (+4.0 k)
            </Button>
            <Button onClick={() => setKahlerMetric(6.0)} variant="outline" className="rounded-2xl font-mono text-xs">
              Calabi-Yau Ground State
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
