import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, Mic, Sliders, Play, RotateCcw, Zap, 
  Sparkles, Radio, Disc, Activity
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Phoneme {
  symbol: string;
  name: string;
  f1: number; // First formant (Hz)
  f2: number; // Second formant (Hz)
  f3: number; // Third formant (Hz)
}

const PHONEMES: Phoneme[] = [
  { symbol: '/i:/', name: 'EE (See)', f1: 270, f2: 2290, f3: 3010 },
  { symbol: '/æ/', name: 'AA (Cat)', f1: 660, f2: 1720, f3: 2410 },
  { symbol: '/u:/', name: 'OO (Boot)', f1: 300, f2: 870, f3: 2240 },
  { symbol: '/ɑ:/', name: 'AH (Father)', f1: 730, f2: 1090, f3: 2440 },
  { symbol: '/ə/', name: 'UH (Schwa)', f1: 500, f2: 1500, f3: 2500 },
];

export default function SpeechSynth() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activePhoneme, setActivePhoneme] = useState<Phoneme>(PHONEMES[0]);
  const [pitchHz, setPitchHz] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const playPhoneme = (phoneme: Phoneme) => {
    try {
      setActivePhoneme(phoneme);
      uiaudio.click();

      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }

      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Glottal source oscillator
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pitchHz, now);

      // Formant Bandpass Filters F1, F2, F3
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(phoneme.f1, now);
      f1.Q.setValueAtTime(5, now);

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(phoneme.f2, now);
      f2.Q.setValueAtTime(5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      console.error(e);
    }
  };

  // Acoustic Vocal Tract Spectrogram Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Formant Resonances Spectrum Curve
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();

      for (let x = 0; x < canvas.width; x += 3) {
        const freq = (x / canvas.width) * 4000; // 0 to 4000 Hz
        // Formant peaks Lorentzian curve
        const peak1 = 1 / (1 + Math.pow((freq - activePhoneme.f1) / 80, 2));
        const peak2 = 1 / (1 + Math.pow((freq - activePhoneme.f2) / 120, 2));
        const peak3 = 1 / (1 + Math.pow((freq - activePhoneme.f3) / 160, 2));

        const amplitude = (peak1 * 1.0 + peak2 * 0.7 + peak3 * 0.4) * 120;
        const y = canvas.height - 40 - amplitude;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activePhoneme]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-teal-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-400/40">
            <Volume2 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-400">
                SPEECH SYNTH // FORMANT VOCAL TRACT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                F1/F2 RESONANCES
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Glottal pulse & acoustic vocal tract formant modeling for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Selected Phoneme Info */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">ACTIVE PHONEME</div>
            <div className="text-base font-bold text-teal-400">{activePhoneme.symbol} - {activePhoneme.name}</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={740}
            height={480}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-teal-400 font-bold">F1: {activePhoneme.f1} Hz</span>
              <span className="text-cyan-400 font-bold">F2: {activePhoneme.f2} Hz</span>
              <span className="text-purple-400 font-bold">F3: {activePhoneme.f3} Hz</span>
            </div>
            <div>ACOUSTIC SPECTRUM: 0 - 4000 HZ</div>
          </div>
        </div>

        {/* Phoneme Selector (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PHONETIC VOWELS
          </h3>

          <div className="space-y-2">
            {PHONEMES.map((p) => (
              <button
                key={p.symbol}
                onClick={() => playPhoneme(p)}
                className={cn(
                  "w-full text-left p-3 rounded-xl font-bold transition-all border flex items-center justify-between",
                  activePhoneme.symbol === p.symbol 
                    ? "bg-teal-500 text-black border-teal-400 shadow-md" 
                    : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/15"
                )}
              >
                <span>{p.symbol} {p.name}</span>
                <span className="text-[10px] opacity-75">{p.f1} / {p.f2} Hz</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
