import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Sliders, Sparkles, CheckCircle2, 
  Layers, Copy, Monitor, ShieldCheck, Play, RotateCcw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface VirtualSet {
  id: string;
  name: string;
  location: string;
  bgGradient: string;
  previewEmoji: string;
}

const VIRTUAL_SETS: VirtualSet[] = [
  { id: 'vs-1', name: 'Cyber Varanasi Ghats', location: 'Uttar Pradesh', bgGradient: 'from-amber-600/30 via-purple-900/30 to-black', previewEmoji: '🪔' },
  { id: 'vs-2', name: 'Neo Mumbai Cyber Studio', location: 'Maharashtra', bgGradient: 'from-cyan-600/30 via-blue-900/30 to-black', previewEmoji: '🏙️' },
  { id: 'vs-3', name: 'Himalayan Esports Fortress', location: 'Himachal', bgGradient: 'from-emerald-600/30 via-teal-900/30 to-black', previewEmoji: '🏔️' },
  { id: 'vs-4', name: 'ISRO Space Command HQ', location: 'Bengaluru', bgGradient: 'from-indigo-600/30 via-violet-900/30 to-black', previewEmoji: '🚀' },
];

export default function ChromaStudio() {
  const [selectedSet, setSelectedSet] = useState<VirtualSet>(VIRTUAL_SETS[0]);
  const [greenTolerance, setGreenTolerance] = useState([45]);
  const [edgeSmoothness, setEdgeSmoothness] = useState([60]);

  const handleCopyOBSUrl = () => {
    sounds.playPop();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor.talks/obs/chroma/${selectedSet.id}?alpha=true&tol=${greenTolerance[0]}`);
    toast.success('📋 OBS Studio Transparent Browser Source URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Chroma Studio & Virtual Sets</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Green Screen Keying & Cyber Virtual Broadcast Backgrounds</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSUrl}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Browser URL
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Virtual Set Stage Preview */}
        <div className={cn(
          "rounded-3xl p-8 border border-border/40 shadow-2xl relative overflow-hidden bg-gradient-to-b flex flex-col items-center justify-center min-h-[320px] text-center",
          selectedSet.bgGradient
        )}>
          <span className="text-6xl mb-3 animate-pulse">{selectedSet.previewEmoji}</span>
          <h3 className="font-display font-black text-2xl text-foreground mb-1">{selectedSet.name}</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">{selectedSet.location} • Alpha Transparency Ready</p>

          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs border border-emerald-500/30">
              Tolerance: {greenTolerance[0]}%
            </span>
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs border border-cyan-500/30">
              Smoothness: {edgeSmoothness[0]}%
            </span>
          </div>
        </div>

        {/* Set Selector & Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Virtual Sets Selector */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl font-sans">
            <div className="showcase-section-title">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h3>Choose 3D Virtual Broadcast Set</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {VIRTUAL_SETS.map((set) => (
                <button
                  key={set.id}
                  onClick={() => {
                    sounds.playPop();
                    setSelectedSet(set);
                  }}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all",
                    selectedSet.id === set.id ? "border-primary bg-primary/10 shadow-md" : "border-border/40 hover:border-border"
                  )}
                >
                  <span className="text-2xl block mb-1">{set.previewEmoji}</span>
                  <h4 className="font-display font-bold text-xs text-foreground">{set.name}</h4>
                  <p className="text-[0.65rem] text-muted-foreground font-mono">{set.location}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Chroma Sliders */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-6 shadow-xl font-sans">
            <div className="showcase-section-title">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3>Chroma Key Calibration</h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-muted-foreground">Green Color Tolerance</span>
                  <span className="text-emerald-400 font-bold">{greenTolerance[0]}%</span>
                </div>
                <Slider
                  value={greenTolerance}
                  onValueChange={setGreenTolerance}
                  min={10}
                  max={90}
                  step={1}
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-muted-foreground">Edge Spill Suppression & Smoothness</span>
                  <span className="text-cyan-400 font-bold">{edgeSmoothness[0]}%</span>
                </div>
                <Slider
                  value={edgeSmoothness}
                  onValueChange={setEdgeSmoothness}
                  min={10}
                  max={90}
                  step={1}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
