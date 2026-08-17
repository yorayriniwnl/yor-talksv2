import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Volume2, Mic, Sparkles, CheckCircle2, 
  Flame, Tv, Sliders, Play, Share2, Layers 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface CasterStinger {
  id: string;
  name: string;
  hindiLine: string;
  hotkey: string;
  category: 'hype' | 'clutch' | 'meme';
}

const STINGERS: CasterStinger[] = [
  { id: 's-1', name: 'INSANE CLUTCH 🔥', hindiLine: 'Bhai yeh kya kar diya! Unbelievable 1v3 Clutch!', hotkey: 'NUM 1', category: 'clutch' },
  { id: 's-2', name: 'DIRECT LOBBY 🚀', hindiLine: 'Lafda khatam! Direct lobby bhej diya!', hotkey: 'NUM 2', category: 'hype' },
  { id: 's-3', name: 'SPRAY TRANSFER 🎯', hindiLine: 'God-tier spray transfer! Aim bot level reflex!', hotkey: 'NUM 3', category: 'hype' },
  { id: 's-4', name: 'DESI DHOL BEAT 🥁', hindiLine: 'Bhangra pao! Champions of Bharat!', hotkey: 'NUM 4', category: 'meme' },
];

export default function CasterDeck() {
  const [activeCam, setActiveCam] = useState<'cam-1' | 'cam-2' | 'cam-3'>('cam-1');
  const [isDucking, setIsDucking] = useState(true);

  const handlePlayStinger = (s: CasterStinger) => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`🎙️ Live Broadcast Caster SFX Fired: "${s.hindiLine}"`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Esports Caster & Broadcast Deck</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">1-Click Shoutcaster Stingers, Telestrator Spotlight & OBS Control</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Mic className="w-3.5 h-3.5 text-emerald-400" /> LIVE ON AIR (1080p 60FPS)
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Camera Feed Switcher */}
        <div className="surface-1 p-4 rounded-3xl border border-border/40 flex items-center justify-between shadow-xl font-mono text-xs">
          <span className="text-muted-foreground">OBS ACTIVE CAMERA SOURCE:</span>
          <div className="flex gap-2">
            {[
              { id: 'cam-1', label: 'CAM 1: Caster Desk 🎙️' },
              { id: 'cam-2', label: 'CAM 2: Player POV 🎯' },
              { id: 'cam-3', label: 'CAM 3: Drone Arena 🛸' },
            ].map((cam) => (
              <Button
                key={cam.id}
                size="sm"
                variant={activeCam === cam.id ? 'default' : 'outline'}
                onClick={() => {
                  sounds.playPop();
                  setActiveCam(cam.id as any);
                }}
                className={cn("rounded-xl text-xs font-bold", activeCam === cam.id && "bg-primary text-primary-foreground")}
              >
                {cam.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Shoutcaster Soundboard Matrix */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Volume2 className="w-4 h-4 text-primary" />
            <h3>Broadcast Stingers & Hype SFX</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STINGERS.map((s) => (
              <div
                key={s.id}
                className="surface-1 rounded-3xl p-5 border border-border/40 flex items-center justify-between shadow-lg hover:border-primary/50 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono text-[0.62rem] font-bold">
                      {s.hotkey}
                    </span>
                    <strong className="font-display font-black text-sm text-foreground">{s.name}</strong>
                  </div>
                  <p className="text-xs font-mono text-amber-300">"{s.hindiLine}"</p>
                </div>

                <Button
                  size="sm"
                  onClick={() => handlePlayStinger(s)}
                  className="rounded-xl font-bold text-xs h-10 px-4 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Fire SFX
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
