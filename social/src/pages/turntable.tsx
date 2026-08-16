import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Disc, Sliders, Play, Pause, Volume2, Sparkles, 
  Flame, Radio, RotateCcw, Zap, Music 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function TurntableStudio() {
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [crossfader, setCrossfader] = useState(50);
  const [bpm, setBpm] = useState(132);
  const [activeCue, setActiveCue] = useState<string | null>(null);

  const triggerCue = (name: string, freq: number) => {
    setActiveCue(name);
    sounds.playPop();

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio context fallback
    }

    setTimeout(() => setActiveCue(null), 300);
  };

  const handleScratch = (deck: 'A' | 'B') => {
    sounds.playGlitch();
    toast.success(`Deck ${deck} Vinyl Scratched!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Disc className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi DJ Turntable & Scratch Mixer</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Dual-Vinyl Scratch Physics, Crossfader & Hot Cues</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Music className="w-3.5 h-3.5 text-primary" /> Master BPM: {bpm}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Dual Turntable Decks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Deck A (Bengaluru Cyber Beats) */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                DECK A · BENGALURU SYNTH
              </span>
              <span className="text-xs font-mono text-muted-foreground">132 BPM · 24-Bit</span>
            </div>

            {/* Vinyl Record Wheel */}
            <div
              onClick={() => handleScratch('A')}
              className={cn(
                "w-56 h-56 rounded-full bg-zinc-950 border-4 border-zinc-800 shadow-2xl relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-transform",
                isPlayingA && "animate-spin [animation-duration:3s]"
              )}
            >
              {/* Vinyl Grooves */}
              <div className="w-44 h-44 rounded-full border border-zinc-800/80 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border border-zinc-800/80 flex items-center justify-center">
                  {/* Center Label */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white text-xs font-mono font-bold shadow-inner">
                    YOR A
                  </div>
                </div>
              </div>
            </div>

            {/* Deck A Play Button */}
            <Button
              onClick={() => {
                sounds.playPop();
                setIsPlayingA(!isPlayingA);
              }}
              className={cn("w-full rounded-2xl font-bold text-xs h-11 transition-all", isPlayingA ? "bg-rose-500 text-white" : "bg-cyan-500 hover:bg-cyan-600 text-black glow-neon-primary")}
            >
              {isPlayingA ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5 fill-black" />}
              {isPlayingA ? 'Pause Deck A' : 'Play Deck A (Bengaluru Beat)'}
            </Button>
          </div>

          {/* Deck B (Mumbai Dholak Electro) */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                DECK B · MUMBAI DHOLAK
              </span>
              <span className="text-xs font-mono text-muted-foreground">132 BPM · 24-Bit</span>
            </div>

            {/* Vinyl Record Wheel */}
            <div
              onClick={() => handleScratch('B')}
              className={cn(
                "w-56 h-56 rounded-full bg-zinc-950 border-4 border-zinc-800 shadow-2xl relative flex items-center justify-center cursor-grab active:cursor-grabbing select-none transition-transform",
                isPlayingB && "animate-spin [animation-duration:3s]"
              )}
            >
              {/* Vinyl Grooves */}
              <div className="w-44 h-44 rounded-full border border-zinc-800/80 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border border-zinc-800/80 flex items-center justify-center">
                  {/* Center Label */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-red-500 flex items-center justify-center text-black text-xs font-mono font-bold shadow-inner">
                    YOR B
                  </div>
                </div>
              </div>
            </div>

            {/* Deck B Play Button */}
            <Button
              onClick={() => {
                sounds.playPop();
                setIsPlayingB(!isPlayingB);
              }}
              className={cn("w-full rounded-2xl font-bold text-xs h-11 transition-all", isPlayingB ? "bg-rose-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-black glow-neon-primary")}
            >
              {isPlayingB ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5 fill-black" />}
              {isPlayingB ? 'Pause Deck B' : 'Play Deck B (Mumbai Dholak)'}
            </Button>
          </div>
        </div>

        {/* Mixer & Crossfader Controls */}
        <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-6">
          <div className="showcase-section-title">
            <Sliders className="w-4 h-4 text-primary" />
            <h3>Master Crossfader & DJ Controls</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-bold">DECK A (100%)</span>
              <span className="text-muted-foreground">Crossfader ({crossfader}%)</span>
              <span className="text-amber-400 font-bold">DECK B (100%)</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={crossfader}
              onChange={(e) => setCrossfader(Number(e.target.value))}
              className="w-full accent-primary h-3 bg-zinc-900 rounded-lg cursor-pointer"
            />
          </div>

          {/* Hot Cue Pads */}
          <div className="space-y-2 pt-4 border-t border-border/30">
            <Label className="text-xs font-mono uppercase text-muted-foreground">Instant Hot Cue Pads</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Sitar Riff 🪕', freq: 440 },
                { name: 'Tabla Drop 🥁', freq: 180 },
                { name: 'Cyber Laser ⚡', freq: 880 },
                { name: 'Airhorn 📢', freq: 280 },
              ].map((cue) => (
                <button
                  key={cue.name}
                  onClick={() => triggerCue(cue.name, cue.freq)}
                  className={cn(
                    "p-3 rounded-2xl border text-xs font-mono font-bold transition-all text-center",
                    activeCue === cue.name ? "bg-primary text-primary-foreground scale-95 glow-neon-primary" : "bg-muted/30 border-border/40 hover:bg-muted/60 text-foreground"
                  )}
                >
                  {cue.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
