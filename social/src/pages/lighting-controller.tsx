import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, Sliders, Zap, Sparkles, CheckCircle2, 
  Flame, Radio, ShieldCheck, Play, Send 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface StageCue {
  id: string;
  name: string;
  colors: string;
  description: string;
}

const CUES: StageCue[] = [
  { id: 'cue-1', name: '🇮🇳 Tricolor Bharat Pride', colors: 'from-amber-500 via-white to-emerald-500', description: 'National anthem intro & trophy presentation' },
  { id: 'cue-2', name: '🚨 1v4 Clutch Ace Alert', colors: 'from-red-600 via-rose-500 to-red-900', description: 'Rapid red strobe pulses during clutch kills' },
  { id: 'cue-3', name: '🏆 Champions Gold Pyro Blast', colors: 'from-amber-400 via-yellow-300 to-amber-600', description: 'CO2 smoke jets & gold blinders' },
  { id: 'cue-4', name: '⚡ Cyber Neon Cyan Vortex', colors: 'from-cyan-400 via-blue-500 to-indigo-600', description: 'Team walkouts & map veto phase' },
];

export default function LightingController() {
  const [activeCue, setActiveCue] = useState<string>('cue-1');

  const handleTriggerCue = (id: string, name: string) => {
    sounds.playChime();
    triggerConfetti();
    setActiveCue(id);
    toast.success(`💡 Stage DMX512 Lighting Cue fired: "${name}" across 64 moving heads & CO2 pyros!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">LAN Stage Lighting & DMX512 Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Art-Net Fixtures, Moving Heads, CO2 Pyros & Live Match Cues</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> DMX Link: CONNECTED (Universe 1-4)
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {CUES.map((c) => (
            <div
              key={c.id}
              className={cn(
                "surface-1 p-6 rounded-3xl border flex flex-col justify-between shadow-xl space-y-4 transition-all relative overflow-hidden",
                activeCue === c.id ? "border-amber-400 bg-amber-500/10 shadow-amber-500/20" : "border-border/40"
              )}
            >
              <div className="space-y-1">
                <div className={`h-2.5 w-full rounded-full bg-gradient-to-r ${c.colors} mb-3 shadow-md`} />
                <h3 className="font-display font-black text-lg text-foreground">{c.name}</h3>
                <p className="text-xs font-mono text-muted-foreground">{c.description}</p>
              </div>

              <Button
                onClick={() => handleTriggerCue(c.id, c.name)}
                className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary shadow-md"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" /> Trigger DMX Stage Preset
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
