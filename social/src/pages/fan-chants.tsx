import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, Volume2, Sparkles, CheckCircle2, 
  Flame, Music, Radio, ShieldCheck, Play 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface FanChant {
  id: string;
  chant: string;
  theme: string;
  reverb: string;
}

const CHANTS: FanChant[] = [
  { id: 'c-1', chant: '🇮🇳 JEETEGA BHAI JEETEGA, BHARAT JEETEGA!', theme: 'National Pride', reverb: '95,000 Seater Arena' },
  { id: 'c-2', chant: '🔥 GOD-LIKE! GOD-LIKE! *CLAP CLAP CLAP*', theme: 'Squad Hype', reverb: 'Indoor Esports Dome' },
  { id: 'c-3', chant: '👑 SOUL ARMY! SOUL ARMY! *DHOL BEAT*', theme: 'Clan Stadium', reverb: 'Wankhede Acoustics' },
  { id: 'c-4', chant: '⚡ CLUTCH GOD JONATHAN! *STADIUM ROAR*', theme: 'Player Anthem', reverb: 'Grand Arena Reverb' },
];

export default function FanChantsStudio() {
  const [activeChant, setActiveChant] = useState<string | null>(null);

  const handleTriggerChant = (id: string, chant: string) => {
    sounds.playChime();
    triggerConfetti();
    setActiveChant(id);
    toast.success(`📢 Stadium crowd chant roaring: "${chant}"`);
    setTimeout(() => {
      setActiveChant(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Fan Chant & Cheer Synthesizer</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live Stadium Acoustics, Dhol Beats, Crowd Claps & Squad Anthems</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Stadium Feed: LIVE
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {CHANTS.map((c) => (
            <div
              key={c.id}
              className={cn(
                "surface-1 p-6 rounded-3xl border flex flex-col justify-between shadow-xl space-y-4 transition-all",
                activeChant === c.id ? "border-amber-500 bg-amber-500/10 scale-105" : "border-border/40"
              )}
            >
              <div className="space-y-1">
                <span className="text-[0.65rem] font-mono text-muted-foreground uppercase">{c.theme} • {c.reverb}</span>
                <h3 className="font-display font-black text-lg text-foreground">{c.chant}</h3>
              </div>

              <Button
                onClick={() => handleTriggerChant(c.id, c.chant)}
                className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary shadow-md"
              >
                <Play className="w-4 h-4 mr-1.5 fill-white" /> Synthesize & Broadcast Chant
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
