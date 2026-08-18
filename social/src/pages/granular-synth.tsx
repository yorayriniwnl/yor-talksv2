import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Music, Sliders, Play, RotateCcw, Zap, 
  Layers, Volume2, Radio, Disc
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Grain {
  x: number;
  y: number;
  size: number;
  color: string;
  life: number;
}

export default function GranularSynth() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [grainSizeMs, setGrainSizeMs] = useState(80);
  const [sprayRandomness, setSprayRandomness] = useState(0.45);
  const [pitchJitter, setPitchJitter] = useState(12); // Semitones
  const [density, setDensity] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);

  const grainsRef = useRef<Grain[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const triggerGrainCloud = () => {
    uiaudio.warp();
    setIsPlaying(true);

    const grains: Grain[] = [];
    const colors = ['#06b6d4', '#ec4899', '#8b5cf6', '#f59e0b'];

    for (let i = 0; i < density; i++) {
      grains.push({
        x: Math.random() * 700,
        y: Math.random() * 450,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: Math.random() * 100,
      });
    }
    grainsRef.current = grains;
  };

  // Granular Cloud Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      grainsRef.current.forEach((g) => {
        g.x += (Math.random() - 0.5) * sprayRandomness * 8;
        g.y += (Math.random() - 0.5) * sprayRandomness * 8;

        if (g.x < 20) g.x = 20;
        if (g.x > canvas.width - 20) g.x = canvas.width - 20;
        if (g.y < 20) g.y = 20;
        if (g.y > canvas.height - 20) g.y = canvas.height - 20;

        ctx.fillStyle = g.color;
        ctx.shadowColor = g.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sprayRandomness, density]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '15s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
                GRANULAR SYNTH // MICRO-SOUND CLOUD SCULPTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                DSP MICRO-GRAINS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Microsound buffer slicing & stochastic grain cloud synthesis for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerGrainCloud}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>SPAWN MICRO-GRAIN CLOUD</span>
          </button>
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
            <div>GRAIN DURATION: {grainSizeMs} MS | SPRAY SCATTER: {sprayRandomness}</div>
            <div>GRAINS: {grainsRef.current.length} ACTIVE CLOUD</div>
          </div>
        </div>

        {/* Granular Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              GRAIN PARAMETERS
            </h3>
          </div>

          {/* Grain Duration */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Grain Duration:</span>
              <span className="text-pink-400 font-bold">{grainSizeMs} ms</span>
            </div>
            <input
              type="range"
              min={20}
              max={200}
              step={5}
              value={grainSizeMs}
              onChange={(e) => setGrainSizeMs(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          {/* Spray Scatter */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Spray Scatter:</span>
              <span className="text-purple-400 font-bold">{sprayRandomness}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={sprayRandomness}
              onChange={(e) => setSprayRandomness(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
