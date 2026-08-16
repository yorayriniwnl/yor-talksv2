import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Mic, Play, Pause, Sparkles, Sliders, 
  Volume2, Radio, Zap, Music, Flame 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const AUDIO_PRESETS = [
  { id: 'sitar', name: 'Bengaluru Sitar Cyber Trap 🪕', freq: 440, type: 'sawtooth' as OscillatorType },
  { id: 'dholak', name: 'Mumbai Dholak Sub-Bass 🥁', freq: 110, type: 'sine' as OscillatorType },
  { id: 'isro', name: 'ISRO Deep Space Cosmic Synth 🌌', freq: 220, type: 'triangle' as OscillatorType },
];

export default function AudioSpectrumVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState(AUDIO_PRESETS[0]);
  const [visualMode, setVisualMode] = useState<'bars' | 'circle' | 'wave'>('bars');
  const [gainLevel, setGainLevel] = useState(70);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startAudio = () => {
    sounds.playPop();
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();

      analyser.fftSize = 128;

      osc.type = activePreset.type;
      osc.frequency.setValueAtTime(activePreset.freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainLevel / 100 * 0.2, ctx.currentTime);

      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      osc.start();

      audioCtxRef.current = ctx;
      oscRef.current = osc;
      gainRef.current = gain;
      analyserRef.current = analyser;
      setIsPlaying(true);
      toast.success(`Playing ${activePreset.name}!`);
    } catch (e) {
      toast.error('Web Audio not supported in this browser environment.');
    }
  };

  const stopAudio = () => {
    sounds.playPop();
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch (e) {}
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
    }
    setIsPlaying(false);
  };

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = '#05020d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let dataArray = new Uint8Array(64);
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray);
      } else {
        // Fallback ambient wave
        const t = Date.now() * 0.003;
        for (let i = 0; i < 64; i++) {
          dataArray[i] = Math.sin(t + i * 0.2) * 30 + 40;
        }
      }

      if (visualMode === 'bars') {
        const barWidth = (canvas.width / 40) - 2;
        for (let i = 0; i < 40; i++) {
          const barHeight = (dataArray[i] / 255) * (canvas.height - 40);
          const x = i * (barWidth + 2);
          const y = canvas.height - barHeight - 10;

          const grad = ctx.createLinearGradient(0, y, 0, canvas.height);
          grad.addColorStop(0, '#06b6d4');
          grad.addColorStop(0.5, '#a855f7');
          grad.addColorStop(1, '#ec4899');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else if (visualMode === 'circle') {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 50;

        for (let i = 0; i < 48; i++) {
          const val = (dataArray[i % 32] / 255) * 60;
          const rad = (Math.PI * 2 / 48) * i;

          const x1 = centerX + Math.cos(rad) * radius;
          const y1 = centerY + Math.sin(rad) * radius;
          const x2 = centerX + Math.cos(rad) * (radius + val);
          const y2 = centerY + Math.sin(rad) * (radius + val);

          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (visualMode === 'wave') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const sliceWidth = canvas.width / 64;
        let x = 0;

        for (let i = 0; i < 64; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, visualMode]);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">3D Audio Spectrum & FFT Visualizer</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-time Fourier Transform Audio Frequency Analyzer</p>
          </div>
        </div>

        <Button
          onClick={isPlaying ? stopAudio : startAudio}
          className={cn("rounded-2xl font-bold text-xs h-10 px-5 shadow-lg", isPlaying ? "bg-rose-500 text-white" : "bg-cyan-500 text-black glow-neon-primary")}
        >
          {isPlaying ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5 fill-black" />}
          {isPlaying ? 'Halt Spectrum' : 'Engage Audio Stream'}
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Visualizer Screen */}
        <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-2xl p-4 relative">
          <canvas
            ref={canvasRef}
            width={640}
            height={320}
            className="w-full h-80 block rounded-2xl bg-zinc-950 shadow-inner"
          />
        </div>

        {/* Studio Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Visual Mode Selector */}
          <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
            <div className="showcase-section-title">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3>Visual Rendering Geometry</h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bars', name: '📊 3D Bars' },
                { id: 'circle', name: '🌀 Mandala' },
                { id: 'wave', name: '⚡ Laser Wave' },
              ].map((m) => (
                <Button
                  key={m.id}
                  variant={visualMode === m.id ? 'default' : 'outline'}
                  onClick={() => {
                    sounds.playPop();
                    setVisualMode(m.id as any);
                  }}
                  className={cn("rounded-xl font-mono text-xs", visualMode === m.id && "bg-primary text-primary-foreground")}
                >
                  {m.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Audio Presets */}
          <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
            <div className="showcase-section-title">
              <Music className="w-4 h-4 text-amber-400" />
              <h3>Bharat Audio Frequency Source</h3>
            </div>

            <div className="space-y-2">
              {AUDIO_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    sounds.playPop();
                    setActivePreset(p);
                    if (isPlaying) {
                      stopAudio();
                      setTimeout(startAudio, 100);
                    }
                  }}
                  className={cn(
                    "w-full p-3 rounded-2xl border text-xs font-bold text-left transition-all flex items-center justify-between",
                    activePreset.id === p.id ? "border-cyan-400 bg-cyan-500/20 shadow-md" : "border-border/40 hover:bg-muted/40"
                  )}
                >
                  <span>{p.name}</span>
                  <span className="text-[0.62rem] font-mono text-muted-foreground">{p.freq} Hz</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
