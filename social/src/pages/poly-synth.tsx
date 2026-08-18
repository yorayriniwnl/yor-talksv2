import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, Sliders, Play, Pause, RotateCcw, Zap, 
  Sparkles, Radio, Disc, Volume2, Layers, Activity
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const KEYS_LAYOUT = [
  { note: 'C4', freq: 261.63, isBlack: false, keyBind: 'a' },
  { note: 'C#4', freq: 277.18, isBlack: true, keyBind: 'w' },
  { note: 'D4', freq: 293.66, isBlack: false, keyBind: 's' },
  { note: 'D#4', freq: 311.13, isBlack: true, keyBind: 'e' },
  { note: 'E4', freq: 329.63, isBlack: false, keyBind: 'd' },
  { note: 'F4', freq: 349.23, isBlack: false, keyBind: 'f' },
  { note: 'F#4', freq: 369.99, isBlack: true, keyBind: 't' },
  { note: 'G4', freq: 392.00, isBlack: false, keyBind: 'g' },
  { note: 'G#4', freq: 415.30, isBlack: true, keyBind: 'y' },
  { note: 'A4', freq: 440.00, isBlack: false, keyBind: 'h' },
  { note: 'A#4', freq: 466.16, isBlack: true, keyBind: 'u' },
  { note: 'B4', freq: 493.88, isBlack: false, keyBind: 'j' },
  { note: 'C5', freq: 523.25, isBlack: false, keyBind: 'k' },
];

export default function PolySynth() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [waveType, setWaveType] = useState<OscillatorType>('sawtooth');
  const [filterCutoff, setFilterCutoff] = useState(2500);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [octaveShift, setOctaveShift] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
  };

  const playNote = (freq: number, note: string) => {
    initAudio();
    setActiveNote(note);

    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const actualFreq = freq * Math.pow(2, octaveShift);

    osc.type = waveType;
    osc.frequency.setValueAtTime(actualFreq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterCutoff, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.55);

    setTimeout(() => setActiveNote(null), 250);
  };

  // Keyboard Mapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = KEYS_LAYOUT.find(k => k.keyBind === e.key.toLowerCase());
      if (target) {
        playNote(target.freq, target.note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [waveType, filterCutoff, octaveShift]);

  // Audio-reactive visualizer ribbon
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

      // Draw Ribbon Waves
      for (let w = 0; w < 3; w++) {
        ctx.strokeStyle = w === 0 ? '#06b6d4' : (w === 1 ? '#ec4899' : '#8b5cf6');
        ctx.lineWidth = 2.5;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x += 3) {
          const y = canvas.height / 2 + Math.sin(x * 0.02 + time + w * 1.5) * (activeNote ? 60 : 20);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeNote]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Music className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-300 to-pink-400">
              POLY SYNTH // 25-KEY CYBER KEYBOARD
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Live polyphonic synthesizer with 3D audio-reactive ribbon for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Octave Controls */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-zinc-400">OCTAVE:</span>
          {[-1, 0, 1].map((oct) => (
            <button
              key={oct}
              onClick={() => { uiaudio.hover(); setOctaveShift(oct); }}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all",
                octaveShift === oct ? "bg-cyan-500 text-black" : "bg-zinc-800 text-zinc-400"
              )}
            >
              {oct > 0 ? `+${oct}` : oct}
            </button>
          ))}
        </div>
      </div>

      {/* Visualizer Canvas */}
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={700}
          height={160}
          className="w-full h-auto block"
        />
      </div>

      {/* Piano Keyboard */}
      <div className="w-full max-w-4xl bg-zinc-900/60 p-6 rounded-2xl border border-white/10 shadow-2xl flex justify-center relative font-mono">
        <div className="flex relative select-none">
          {KEYS_LAYOUT.filter(k => !k.isBlack).map((whiteKey) => (
            <button
              key={whiteKey.note}
              onClick={() => playNote(whiteKey.freq, whiteKey.note)}
              className={cn(
                "w-12 h-44 md:w-16 md:h-52 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-b-xl border border-zinc-300 flex flex-col justify-end pb-3 items-center font-bold text-xs transition-all shadow-md active:translate-y-1",
                activeNote === whiteKey.note && "bg-cyan-300 shadow-[0_0_20px_#06b6d4]"
              )}
            >
              <span className="text-[10px] text-zinc-400">[{whiteKey.keyBind.toUpperCase()}]</span>
              <span>{whiteKey.note}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
