import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Sliders, Sparkles, CheckCircle2, 
  Download, Eye, Palette, Sun, Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface LUTPreset {
  id: string;
  name: string;
  description: string;
  color: string;
}

const PRESETS: LUTPreset[] = [
  { id: 'lut-1', name: 'Desi Warm Velvet', description: 'Enhances warm Indian skin tones with golden glow', color: 'from-amber-500 to-orange-500' },
  { id: 'lut-2', name: 'Cyber Neon Indigo', description: 'High contrast esports arena look with cyan highlights', color: 'from-cyan-400 to-indigo-600' },
  { id: 'lut-3', name: 'Bollywood Gold Blockbuster', description: 'Rich teal and orange cinematic blockbuster color palette', color: 'from-yellow-400 to-rose-500' },
  { id: 'lut-4', name: 'LAN Arena Moody Noir', description: 'Deep blacks and sharp LED badge highlights', color: 'from-zinc-400 to-zinc-900' },
];

export default function LUTGraderStudio() {
  const [activePreset, setActivePreset] = useState<string>('lut-1');

  const handleExportLUT = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('💾 3D .CUBE LUT Color Profile exported for OBS Studio Color Correction Filter!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer 3D LUT & Webcam Color Grader</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Desi Warm Skin Tones, Cinematic LUTs & OBS .CUBE Profile Exporter</p>
          </div>
        </div>

        <Button
          onClick={handleExportLUT}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export .CUBE LUT
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {PRESETS.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                sounds.playPop();
                setActivePreset(p.id);
              }}
              className={cn(
                "surface-1 p-6 rounded-3xl border cursor-pointer flex flex-col justify-between shadow-xl space-y-4 transition-all",
                activePreset === p.id ? "border-primary bg-primary/10 scale-[1.02]" : "border-border/40 hover:border-border"
              )}
            >
              <div className="space-y-1">
                <div className={cn("w-full h-12 rounded-2xl bg-gradient-to-r mb-3 shadow-md", p.color)} />
                <h3 className="font-display font-black text-lg text-foreground">{p.name}</h3>
                <p className="text-xs font-mono text-muted-foreground">{p.description}</p>
              </div>

              {activePreset === p.id ? (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1 w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Live Filter
                </span>
              ) : (
                <span className="text-xs font-mono text-muted-foreground">Click to preview</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
