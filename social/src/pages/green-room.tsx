import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Mic, Radio, Sparkles, CheckCircle2, 
  Tv, Play, ShieldCheck, BatteryCharging, Send 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PreFlightCheck {
  id: string;
  item: string;
  status: string;
  ready: boolean;
}

const CHECKS: PreFlightCheck[] = [
  { id: 'pf-1', item: '📷 4K60 CamLink Main Camera Feed', status: 'Crystal Clear (60.00 FPS)', ready: true },
  { id: 'pf-2', item: '🎙️ Wireless Lavalier & SM7B Audio Levels', status: '-6.2 dBFS Peak Margin', ready: true },
  { id: 'pf-3', item: '🔋 Wireless Battery Telemetry', status: '100% Fully Charged', ready: true },
  { id: 'pf-4', item: '📜 Hinglish Teleprompter Run-Down', status: 'Loaded & Synced', ready: true },
];

export default function GreenRoom() {
  const [isLive, setIsLive] = useState(false);

  const handleGoLive = () => {
    sounds.playChime();
    triggerConfetti();
    setIsLive(true);
    toast.success('🚀 BROADCAST SWITCHED TO LIVE ON OBS STUDIO across YouTube & Kick!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Backstage Green Room</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Camera Pre-Flight, Wireless Audio Checks & OBS Stream Switcher</p>
          </div>
        </div>

        <Button
          onClick={handleGoLive}
          disabled={isLive}
          className="rounded-2xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white glow-neon-primary shadow-lg"
        >
          <Play className="w-3.5 h-3.5 mr-1 fill-white" /> {isLive ? '🔴 ON AIR LIVE' : '🚀 Switch OBS to Live'}
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {CHECKS.map((c) => (
            <div
              key={c.id}
              className="surface-1 p-6 rounded-3xl border border-border/40 flex items-center justify-between shadow-xl"
            >
              <div className="space-y-1">
                <h4 className="font-display font-bold text-base text-foreground">{c.item}</h4>
                <p className="text-xs font-mono text-emerald-400 font-bold">{c.status}</p>
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
