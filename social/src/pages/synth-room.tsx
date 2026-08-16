import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, Sliders, Sparkles, Volume2, Radio, Disc, 
  Play, Pause, Flame, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

const SYNTH_KEYS = [
  { note: 'C4', key: 'A', freq: 261.63, isBlack: false },
  { note: 'C#4', key: 'W', freq: 277.18, isBlack: true },
  { note: 'D4', key: 'S', freq: 293.66, isBlack: false },
  { note: 'D#4', key: 'E', freq: 311.13, isBlack: true },
  { note: 'E4', key: 'D', freq: 329.63, isBlack: false },
  { note: 'F4', key: 'F', freq: 349.23, isBlack: false },
  { note: 'F#4', key: 'T', freq: 369.99, isBlack: true },
  { note: 'G4', key: 'G', freq: 392.00, isBlack: false },
  { note: 'G#4', key: 'Y', freq: 415.30, isBlack: true },
  { note: 'A4', key: 'H', freq: 440.00, isBlack: false },
  { note: 'A#4', key: 'U', freq: 466.16, isBlack: true },
  { note: 'B4', key: 'J', freq: 493.88, isBlack: false },
  { note: 'C5', key: 'K', freq: 523.25, isBlack: false },
];

export default function SynthRoom() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveform, setWaveform] = useState<OscillatorType>('sawtooth');
  const [attack, setAttack] = useState(0.05);
  const [release, setRelease] = useState(0.4);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Web Audio Synth Engine
  const playNote = (freq: number, noteName: string) => {
    setActiveKey(noteName);
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // ADSR Envelope
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + attack + release);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + attack + release + 0.1);

    setTimeout(() => setActiveKey(null), (attack + release) * 1000);
  };

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetKey = SYNTH_KEYS.find(k => k.key.toLowerCase() === e.key.toLowerCase());
      if (targetKey) {
        playNote(targetKey.freq, targetKey.note);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [waveform, attack, release]);

  // 3D Synthwave Grid Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    let animId: number;

    const render = () => {
      ctx.fillStyle = '#05020c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const horizon = canvas.height * 0.45;

      // Sun
      const sunGradient = ctx.createLinearGradient(0, horizon - 90, 0, horizon);
      sunGradient.addColorStop(0, '#f43f5e');
      sunGradient.addColorStop(1, '#fbbf24');
      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, horizon - 10, 60, Math.PI, 0, false);
      ctx.fill();

      // Perspective Grid Lines
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;

      // Vertical rays
      const vCount = 14;
      for (let i = 0; i <= vCount; i++) {
        const xBottom = (canvas.width / vCount) * i;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, horizon);
        ctx.lineTo(xBottom, canvas.height);
        ctx.stroke();
      }

      // Horizontal moving lines
      const hCount = 8;
      for (let i = 0; i < hCount; i++) {
        const progress = ((i + offset) % hCount) / hCount;
        const y = horizon + Math.pow(progress, 2) * (canvas.height - horizon);
        ctx.strokeStyle = `rgba(6, 182, 212, ${progress})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      offset = (offset + 0.02) % hCount;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">3D Synthwave Matrix Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Web Audio Polyphonic FM Synthesizer & Canvas Grid</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Sparkles className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" /> Keyboard Playable (A-K)
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* 3D Synthwave Perspective Canvas */}
        <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-2xl relative">
          <canvas
            ref={canvasRef}
            width={720}
            height={260}
            className="w-full h-64 block bg-black"
          />
        </div>

        {/* Playable Piano Synth Keyboard */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="showcase-section-title">
              <Disc className="w-4 h-4 text-pink-500" />
              <h3>Polyphonic Synth Keys</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Click keys or press keyboard keys A through K</span>
          </div>

          {/* Interactive Keyboard Keys */}
          <div className="flex justify-center gap-1.5 p-4 rounded-2xl bg-black/60 border border-border/40 overflow-x-auto select-none">
            {SYNTH_KEYS.map((k) => (
              <button
                key={k.note}
                onClick={() => playNote(k.freq, k.note)}
                className={cn(
                  "flex flex-col items-center justify-between rounded-xl transition-all",
                  k.isBlack
                    ? "w-10 h-28 bg-zinc-900 text-pink-400 border border-border/60 -mx-3 z-10 p-2 shadow-lg"
                    : "w-14 h-40 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-border/60 p-3 shadow-md",
                  activeKey === k.note && "scale-95 bg-primary text-primary-foreground glow-neon-primary"
                )}
              >
                <span className="text-[0.62rem] font-mono font-bold">{k.key}</span>
                <span className="text-[0.68rem] font-mono font-black">{k.note}</span>
              </button>
            ))}
          </div>

          {/* ADSR & Waveform Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-border/30">
            {/* Waveform Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Oscillator Waveform</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['sawtooth', 'square', 'sine', 'triangle'] as OscillatorType[]).map((w) => (
                  <Button
                    key={w}
                    size="sm"
                    variant={waveform === w ? 'default' : 'outline'}
                    onClick={() => setWaveform(w)}
                    className={cn("rounded-xl font-mono text-xs uppercase", waveform === w && "bg-primary text-primary-foreground")}
                  >
                    {w}
                  </Button>
                ))}
              </div>
            </div>

            {/* Attack Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Attack Envelope</span>
                <span className="text-primary font-bold">{attack}s</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
                value={attack}
                onChange={(e) => setAttack(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {/* Release Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Release Decay</span>
                <span className="text-cyan-400 font-bold">{release}s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={release}
                onChange={(e) => setRelease(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
