import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, Sliders, Play, Pause, RotateCcw, Zap, 
  Sparkles, Radio, Disc, Volume2, Layers, Activity
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface DrumPad {
  id: string;
  name: string;
  key: string;
  color: string;
  freq: number;
  type: OscillatorType;
  decay: number;
}

const DRUM_PADS: DrumPad[] = [
  { id: '1', name: 'Sub 808', key: 'Q', color: '#ef4444', freq: 45, type: 'sawtooth', decay: 0.6 },
  { id: '2', name: 'Punch Kick', key: 'W', color: '#f97316', freq: 110, type: 'sine', decay: 0.2 },
  { id: '3', name: 'Laser Snare', key: 'E', color: '#eab308', freq: 280, type: 'triangle', decay: 0.15 },
  { id: '4', name: 'Cyber Clap', key: 'R', color: '#10b981', freq: 650, type: 'square', decay: 0.12 },
  { id: '5', name: 'Closed Hat', key: 'A', color: '#06b6d4', freq: 4000, type: 'square', decay: 0.04 },
  { id: '6', name: 'Open Hat', key: 'S', color: '#3b82f6', freq: 3500, type: 'square', decay: 0.25 },
  { id: '7', name: 'Dholak Bass', key: 'D', color: '#8b5cf6', freq: 75, type: 'sine', decay: 0.4 },
  { id: '8', name: 'Tabla Dha', key: 'F', color: '#ec4899', freq: 140, type: 'sine', decay: 0.3 },
  { id: '9', name: 'Synth Pluck', key: 'Z', color: '#14b8a6', freq: 523.25, type: 'sawtooth', decay: 0.2 },
  { id: '10', name: 'Glitch Perc', key: 'X', color: '#f43f5e', freq: 1800, type: 'square', decay: 0.06 },
  { id: '11', name: 'Vocal Chant', key: 'C', color: '#a855f7', freq: 330, type: 'triangle', decay: 0.35 },
  { id: '12', name: 'Crash Cymbal', key: 'V', color: '#fbbf24', freq: 5000, type: 'square', decay: 0.8 },
];

export default function NeuralBeatmaker() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [activePadId, setActivePadId] = useState<string | null>(null);
  const [euclideanSteps, setEuclideanSteps] = useState(16);
  const [euclideanPulses, setEuclideanPulses] = useState(5);
  const [humanizeVariance, setHumanizeVariance] = useState(12);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const triggerPad = (pad: DrumPad) => {
    initAudio();
    setActivePadId(pad.id);
    setTimeout(() => setActivePadId(null), 120);

    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = pad.type;
    osc.frequency.setValueAtTime(pad.freq, now);

    // Dynamic pitch bend on low freq drums
    if (pad.freq < 150) {
      osc.frequency.exponentialRampToValueAtTime(30, now + pad.decay);
    }

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + pad.decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + pad.decay + 0.05);
  };

  // Keyboard mapping listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const pad = DRUM_PADS.find(p => p.key.toLowerCase() === e.key.toLowerCase());
      if (pad) {
        triggerPad(pad);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Music className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
                NEURAL BEATMAKER // 12-PAD MPC MATRIX
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                EUCLIDEAN ALGORITHM
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Live hardware-responsive MPC pads & algorithmic rhythm generator for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Keybind Helper */}
        <div className="flex items-center space-x-2 font-mono text-xs text-zinc-400 bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10">
          <Zap className="w-4 h-4 text-pink-400" />
          <span>KEYBOARD MAPPED: [Q-W-E-R, A-S-D-F, Z-X-C-V]</span>
        </div>
      </div>

      {/* 12-Pad MPC Drum Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {DRUM_PADS.map((pad) => {
          const isActive = activePadId === pad.id;

          return (
            <button
              key={pad.id}
              onClick={() => triggerPad(pad)}
              className={cn(
                "h-36 rounded-2xl p-4 flex flex-col justify-between items-start font-mono transition-all relative overflow-hidden border select-none",
                isActive 
                  ? "scale-95 shadow-2xl brightness-125" 
                  : "bg-zinc-900/60 border-white/5 hover:border-white/20 hover:scale-[1.02]"
              )}
              style={{
                borderColor: isActive ? pad.color : undefined,
                boxShadow: isActive ? `0 0 35px ${pad.color}88` : undefined,
              }}
            >
              {/* Trigger Highlight */}
              <div 
                className="w-3 h-3 rounded-full shadow-md"
                style={{ backgroundColor: pad.color }}
              />

              <div className="text-left">
                <div className="text-lg font-black text-white">{pad.name}</div>
                <div className="text-[10px] text-zinc-400 font-bold">{pad.freq} Hz ({pad.type})</div>
              </div>

              {/* Key Badge */}
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-white/10 font-black text-xs text-cyan-300">
                {pad.key}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
