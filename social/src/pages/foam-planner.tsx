import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid3X3, Waves, Sparkles, CheckCircle2, 
  Download, ShoppingBag, Volume2, ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function FoamPlanner() {
  const [panels, setPanels] = useState<boolean[]>(Array(16).fill(false));

  const togglePanel = (index: number) => {
    sounds.playPop();
    setPanels(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const panelCount = panels.filter(Boolean).length;
  const nrcRating = (0.25 + (panelCount / 16) * 0.65).toFixed(2);

  const handleExportShoppingList = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`🛒 Acoustic Foam Studio Bill exported (${panelCount} High-Density Pyramid Panels)!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Acoustic Foam Panel Studio Planner</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">2D Wall Treatment Grid, NRC Calculation & Echo Suppression</p>
          </div>
        </div>

        <Button
          onClick={handleExportShoppingList}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <ShoppingBag className="w-3.5 h-3.5 mr-1" /> Export Bill of Materials
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Telemetry Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Panels Placed</span>
            <strong className="font-display font-black text-3xl text-primary">{panelCount} / 16 Panels</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Calculated NRC Rating</span>
            <strong className="font-display font-black text-3xl text-emerald-400">{nrcRating} NRC</strong>
          </div>
        </div>

        {/* 4x4 Wall Grid Sandbox */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl max-w-md mx-auto font-sans">
          <div className="showcase-section-title justify-center">
            <Waves className="w-4 h-4 text-cyan-400" />
            <h3>Studio Broadcast Wall (4x4 Grid)</h3>
          </div>

          <div className="grid grid-cols-4 gap-2.5 p-4 rounded-2xl bg-zinc-950 border border-border/40">
            {panels.map((placed, i) => (
              <button
                key={i}
                onClick={() => togglePanel(i)}
                className={cn(
                  "h-16 rounded-xl border flex flex-col items-center justify-center font-mono text-[0.65rem] transition-all shadow-md active:scale-95",
                  placed 
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan-500/20" 
                    : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700"
                )}
              >
                {placed ? '⬛ FOAM' : '+ ADD'}
              </button>
            ))}
          </div>

          <p className="text-center font-mono text-xs text-muted-foreground">
            Click grid cells to add/remove high-density acoustic pyramid tiles.
          </p>
        </div>
      </div>
    </div>
  );
}
