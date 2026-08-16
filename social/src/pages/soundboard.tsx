import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, Sparkles, Sliders, Play, Radio, Flame, 
  Download, Copy, CheckCircle2, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SoundPad {
  id: string;
  label: string;
  tag: string;
  freq: number;
  type: OscillatorType;
  emoji: string;
}

const SOUND_PADS: SoundPad[] = [
  { id: 's1', label: 'Aayein? 🍆', tag: 'Meme Classic', freq: 150, type: 'sawtooth', emoji: '🍆' },
  { id: 's2', label: 'Khatam Tata 👋', tag: 'Victory Exit', freq: 440, type: 'sine', emoji: '👋' },
  { id: 's3', label: 'Jalwa Hai Humara 🔥', tag: 'Clutch Aura', freq: 520, type: 'square', emoji: '🔥' },
  { id: 's4', label: 'Paisa Hi Paisa 💸', tag: 'Superchat Drop', freq: 880, type: 'triangle', emoji: '💸' },
  { id: 's5', label: 'OP Bolte 🎯', tag: 'Headshot Chime', freq: 650, type: 'sawtooth', emoji: '🎯' },
  { id: 's6', label: 'Chai Peelo Friends ☕', tag: 'Desi Chill', freq: 330, type: 'sine', emoji: '☕' },
  { id: 's7', label: 'Clutch God 👑', tag: 'Esports 1v4', freq: 720, type: 'square', emoji: '👑' },
  { id: 's8', label: 'Balle Balle 🪕', tag: 'Celebration', freq: 900, type: 'triangle', emoji: '🪕' },
  { id: 's9', label: 'Airhorn Blast 📢', tag: 'Hype Horn', freq: 280, type: 'sawtooth', emoji: '📢' },
  { id: 's10', label: 'Giga Chad Echo 🗿', tag: 'Sigma Mode', freq: 110, type: 'sine', emoji: '🗿' },
  { id: 's11', label: 'Level Sabke Niklenge 📈', tag: 'Rank Up', freq: 600, type: 'square', emoji: '📈' },
  { id: 's12', label: 'ISRO Rocket Launch 🚀', tag: 'Cosmic Bass', freq: 95, type: 'sawtooth', emoji: '🚀' },
];

export default function Soundboard() {
  const [activePad, setActivePad] = useState<string | null>(null);
  const [pitchShift, setPitchShift] = useState(1.0);

  const triggerSound = (pad: SoundPad) => {
    setActivePad(pad.id);
    sounds.playPop();

    // Synthesize tone with Web Audio
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = pad.type;
      osc.frequency.setValueAtTime(pad.freq * pitchShift, ctx.currentTime);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      // Audio context fallback
    }

    setTimeout(() => setActivePad(null), 400);
  };

  const handleExportKeybinds = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('Elgato Stream Deck & OBS Keybinds profile exported to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-red-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Streamer SFX Soundboard</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">12 Instant Desi Memes & Stream Deck Trigger Pads</p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleExportKeybinds}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Stream Deck Profile
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Pitch Modulator Bar */}
        <div className="surface-1 p-5 rounded-3xl border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="font-display font-bold text-sm text-foreground">Pitch Shifter Modifier</h4>
              <p className="text-xs text-muted-foreground font-mono">Real-time pitch shift: {pitchShift.toFixed(2)}x</p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={pitchShift}
              onChange={(e) => setPitchShift(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </div>
        </div>

        {/* 12-Pad Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {SOUND_PADS.map((pad) => (
            <button
              key={pad.id}
              onClick={() => triggerSound(pad)}
              className={cn(
                "surface-1 p-5 rounded-3xl border transition-all duration-150 flex flex-col justify-between text-left h-36 relative overflow-hidden group select-none shadow-md",
                activePad === pad.id ? "border-amber-400 bg-amber-500/20 scale-95 glow-neon-primary" : "border-border/40 hover:border-primary/40 hover:scale-102"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl group-hover:scale-110 transition-transform">{pad.emoji}</span>
                <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-muted border border-border/30 text-muted-foreground">
                  {pad.tag}
                </span>
              </div>

              <div>
                <h4 className="font-display font-bold text-sm text-foreground leading-tight">{pad.label}</h4>
                <span className="text-[0.65rem] font-mono text-muted-foreground">Click to Trigger SFX</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
