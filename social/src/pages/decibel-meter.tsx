import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, Sparkles, Copy, 
  Flame, Zap, AlertTriangle, ShieldAlert, Radio, Activity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function DecibelMeterStudio() {
  const [decibels, setDecibels] = useState(104);
  const [isClipped, setIsClipped] = useState(false);

  const handleCopyOBSDecibel = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/decibel-meter?fps=60&peakLimit=115&theme=neon-red`);
    toast.success('📋 OBS Studio Transparent 60FPS Chat Decibel Meter URL copied!');
  };

  const handleSpamSpike = (db: number) => {
    sounds.playPop();
    setDecibels((d) => {
      const next = Math.min(130, d + db);
      if (next >= 115) {
        setIsClipped(true);
        sounds.playChime();
        triggerConfetti();
        toast.warning('🚨 REDLINE AUDIO CLIP! 115+ dB JET ENGINE CHAT ROAR!');
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Live Chat Decibel Meter</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Chat Velocity SPL Decibels, Redline Limiters, Audio Clip Alerts & OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSDecibel}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Decibel URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Decibel HUD */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 font-mono text-xs font-bold">
            <Activity className="w-3.5 h-3.5" /> STADIUM CROWD NOISE LEVEL • {isClipped ? 'PEAK REDLINE' : 'BALANCED'}
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-6xl md:text-7xl text-rose-400">{decibels} dB</h2>
            <p className="font-mono text-xs text-muted-foreground">Sound Pressure Level (SPL) • Peak Limiter Threshold: 115 dB</p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button onClick={() => handleSpamSpike(5)} className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-md">
              +5 dB Chat Spam
            </Button>
            <Button onClick={() => handleSpamSpike(15)} className="rounded-2xl font-bold text-xs bg-rose-600 text-white shadow-md">
              +15 dB Stadium Scream
            </Button>
            <Button onClick={() => { setDecibels(65); setIsClipped(false); }} variant="outline" className="rounded-2xl font-mono text-xs">
              Reset Limiter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
