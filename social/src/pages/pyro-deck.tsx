import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Sparkles, ShieldCheck, CheckCircle2, 
  Send, Zap, AlertTriangle, Key, Radio, Trophy, Wind 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PyroCue {
  id: string;
  name: string;
  type: string;
  dmxAddress: string;
  triggered: boolean;
}

const CUES: PyroCue[] = [
  { id: 'fx-1', name: '🔥 5-Meter Cold Spark Fountain Cascade', type: 'Pyrotechnic Cold Spark', dmxAddress: 'Univ 2 / Ch 1-8', triggered: false },
  { id: 'fx-2', name: '💨 Cryo CO2 Jet Quad Blast (Match Point)', type: 'Cryogenic Plume', dmxAddress: 'Univ 2 / Ch 9-12', triggered: false },
  { id: 'fx-3', name: '🇮🇳 Tricolor Gold & Silver Confetti Cannon', type: 'Compressed Air Swirl', dmxAddress: 'Univ 2 / Ch 13-16', triggered: false },
  { id: 'fx-4', name: '🌫️ Low-Lying Dry Ice Floor Foggers', type: 'Atmospheric Fog', dmxAddress: 'Univ 2 / Ch 17-20', triggered: false },
];

export default function PyroDeck() {
  const [isArmed, setIsArmed] = useState(false);
  const [cues, setCues] = useState<PyroCue[]>(CUES);

  const handleToggleArm = () => {
    sounds.playPop();
    setIsArmed(!isArmed);
    if (!isArmed) {
      toast.warning('⚠️ PYRO SYSTEM ARMED! Safety interlock released for live stage triggers.');
    } else {
      toast.info('🛡️ Pyro system disarmed and locked.');
    }
  };

  const handleTriggerCue = (id: string, name: string) => {
    if (!isArmed) {
      toast.error('❌ Arm the safety master key first before triggering pyros!');
      return;
    }
    sounds.playChime();
    triggerConfetti();
    setCues(prev => prev.map(c => c.id === id ? { ...c, triggered: true } : c));
    toast.success(`⚡ CUE FIRED: ${name} detonated on stage!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">LAN Stage Pyro & Special FX Deck</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Cold Spark Fountains, Cryo CO2 Jets, Tricolor Confetti & DMX Triggers</p>
          </div>
        </div>

        <Button
          onClick={handleToggleArm}
          className={cn(
            "rounded-2xl font-bold text-xs shadow-lg transition-all",
            isArmed ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" : "bg-emerald-600 hover:bg-emerald-700 text-white"
          )}
        >
          <Key className="w-3.5 h-3.5 mr-1" /> {isArmed ? '🔴 ARMED (Safety OFF)' : '🛡️ DISARMED (Safety ON)'}
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-4 font-sans">
          {cues.map((c) => (
            <div
              key={c.id}
              className={cn(
                "surface-1 p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between shadow-xl gap-4 transition-all",
                c.triggered ? "border-amber-500/40 bg-amber-500/5" : "border-border/40"
              )}
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-amber-400 block">{c.dmxAddress}</span>
                <h3 className="font-display font-black text-lg text-foreground">{c.name}</h3>
                <p className="text-xs font-mono text-muted-foreground">{c.type}</p>
              </div>

              <Button
                onClick={() => handleTriggerCue(c.id, c.name)}
                className="rounded-xl font-bold text-xs h-10 px-5 bg-primary text-primary-foreground glow-neon-primary shadow-md"
              >
                <Zap className="w-3.5 h-3.5 mr-1" /> FIRE CUE
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
