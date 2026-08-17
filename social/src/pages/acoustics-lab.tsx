import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, Sliders, Sparkles, CheckCircle2, 
  Activity, Shield, Waves, RotateCcw, Play 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function AcousticsLab() {
  const [length, setLength] = useState(3.5);
  const [width, setWidth] = useState(3.0);
  const [height, setHeight] = useState(2.8);
  const [foamPanels, setFoamPanels] = useState(12);

  const roomVolume = (length * width * height).toFixed(1);
  const calculatedRT60 = Math.max(0.18, 0.65 - (foamPanels * 0.03)).toFixed(2);
  const acousticScore = Math.min(100, Math.round(foamPanels * 7.5));

  const handleTestAcousticChime = () => {
    sounds.playChime();
    toast.success(`🔊 Acoustic impulse test reverberation decay measured: RT60 = ${calculatedRT60}s!`);
  };

  const handleAddPanels = () => {
    sounds.playPop();
    setFoamPanels(p => {
      const np = Math.min(16, p + 2);
      if (np === 16) {
        triggerConfetti();
        toast.success('🎯 Studio Acoustic Calibration Optimal! Studio-Grade Broadcast Standard achieved.');
      }
      return np;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Acoustic Room & Soundproofing Lab</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">RT60 Reverberation Decay, Standing Waves & Foam Placement Optimizer</p>
          </div>
        </div>

        <Button
          onClick={handleTestAcousticChime}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Play className="w-3.5 h-3.5 mr-1" /> Acoustic Impulse Sweep
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Room Dimensions Card */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col justify-between shadow-xl space-y-4 font-sans">
            <div className="space-y-4">
              <div className="showcase-section-title">
                <Sliders className="w-4 h-4 text-primary" />
                <h3>Room Dimensions (Meters)</h3>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-muted-foreground block mb-1">Room Length (m):</span>
                  <Input type="number" value={length} onChange={(e) => setLength(parseFloat(e.target.value) || 1)} className="rounded-xl font-bold text-xs" />
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Room Width (m):</span>
                  <Input type="number" value={width} onChange={(e) => setWidth(parseFloat(e.target.value) || 1)} className="rounded-xl font-bold text-xs" />
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Ceiling Height (m):</span>
                  <Input type="number" value={height} onChange={(e) => setHeight(parseFloat(e.target.value) || 1)} className="rounded-xl font-bold text-xs" />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-border/40 text-center font-mono text-xs">
              <span className="text-muted-foreground uppercase text-[0.6rem] block">Room Volume</span>
              <strong className="font-display font-black text-xl text-primary">{roomVolume} m³</strong>
            </div>
          </div>

          {/* RT60 Reverberation Telemetry */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col justify-between shadow-xl space-y-4 font-sans">
            <div className="space-y-4">
              <div className="showcase-section-title">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3>RT60 Decay Time</h3>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-950 border border-border/40 text-center font-mono space-y-2">
                <span className="text-[0.65rem] text-muted-foreground uppercase block">Calculated RT60 Echo</span>
                <strong className="font-display font-black text-4xl text-emerald-400">{calculatedRT60}s</strong>
                <span className="text-[0.68rem] text-emerald-400 font-bold block">
                  {parseFloat(calculatedRT60) < 0.35 ? '✅ Broadcast Podcasting Standard' : '⚠️ Mild Flutter Echo Detected'}
                </span>
              </div>
            </div>

            <Button
              onClick={handleTestAcousticChime}
              variant="outline"
              className="w-full rounded-2xl font-bold text-xs h-11"
            >
              <Volume2 className="w-4 h-4 mr-1.5" /> Test Clack Acoustics
            </Button>
          </div>

          {/* Foam Treatment Placement */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col justify-between shadow-xl space-y-4 font-sans">
            <div className="space-y-4">
              <div className="showcase-section-title">
                <Shield className="w-4 h-4 text-amber-400" />
                <h3>Foam Acoustic Panels</h3>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-border/40 font-mono text-center space-y-1">
                <span className="text-[0.65rem] text-muted-foreground uppercase block">Installed Panels</span>
                <strong className="font-display font-black text-3xl text-amber-400">{foamPanels} / 16 Panels</strong>
                <span className="text-[0.65rem] text-muted-foreground block">Noise Absorption Score: {acousticScore}%</span>
              </div>
            </div>

            <Button
              onClick={handleAddPanels}
              className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              +2 High-Density Foam Panels
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
