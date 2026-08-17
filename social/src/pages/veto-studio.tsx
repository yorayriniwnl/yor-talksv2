import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, ShieldCheck, CheckCircle2, Ban, 
  Sparkles, Trophy, Tv, Radio, Send, RotateCcw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface MapStatus {
  name: string;
  state: 'available' | 'banned' | 'picked' | 'decider';
}

const INITIAL_MAPS: MapStatus[] = [
  { name: 'Ascent', state: 'picked' },
  { name: 'Bind', state: 'banned' },
  { name: 'Haven', state: 'picked' },
  { name: 'Sunset', state: 'banned' },
  { name: 'Lotus', state: 'decider' },
  { name: 'Split', state: 'banned' },
];

export default function VetoStudio() {
  const [maps, setMaps] = useState<MapStatus[]>(INITIAL_MAPS);

  const handleBroadcastVeto = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📺 Official Tournament Bo3 Map Veto graphic dispatched to Stream Broadcast Overlay!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Map Veto & Pick/Ban Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Bo3 / Bo5 Coin Toss, Map Bans, Team Picks & Broadcast HUD Feeds</p>
          </div>
        </div>

        <Button
          onClick={handleBroadcastVeto}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Send className="w-3.5 h-3.5 mr-1" /> Broadcast Veto HUD
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-sans">
          {maps.map((m) => (
            <div
              key={m.name}
              className={cn(
                "surface-1 p-6 rounded-3xl border flex flex-col justify-between shadow-xl text-center space-y-3 transition-all",
                m.state === 'picked' ? "border-emerald-500 bg-emerald-500/10" :
                m.state === 'banned' ? "border-red-500/40 bg-red-500/5 opacity-60" :
                m.state === 'decider' ? "border-amber-400 bg-amber-400/10 shadow-amber-400/20" :
                "border-border/40"
              )}
            >
              <h3 className="font-display font-black text-xl text-foreground">{m.name}</h3>
              <span className={cn(
                "px-3 py-1.5 rounded-xl font-mono font-bold text-xs uppercase block",
                m.state === 'picked' ? "bg-emerald-500 text-black" :
                m.state === 'banned' ? "bg-red-500/20 text-red-400" :
                m.state === 'decider' ? "bg-amber-400 text-black" :
                "bg-muted text-muted-foreground"
              )}>
                {m.state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
