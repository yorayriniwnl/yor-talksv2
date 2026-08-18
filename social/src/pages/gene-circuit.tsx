import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type CircuitType = 'repressilator' | 'toggle_switch' | 'feedforward_loop';

export default function GeneCircuit() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [circuitType, setCircuitType] = useState<CircuitType>('repressilator');
  const [transcriptionRate, setTranscriptionRate] = useState(1.4);
  const [hillCoefficient, setHillCoefficient] = useState(2.0);
  const [isSimulating, setIsSimulating] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  // Biological Kinetics Simulation Canvas
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

      // Repressilator Tri-Oscillator Waveforms (LacI, TetR, cI proteins)
      const proteins = [
        { name: 'GFP (Green Fluorescent)', color: '#10b981', phase: 0 },
        { name: 'RFP (Red Fluorescent)', color: '#ef4444', phase: (Math.PI * 2) / 3 },
        { name: 'BFP (Blue Fluorescent)', color: '#3b82f6', phase: (Math.PI * 4) / 3 },
      ];

      proteins.forEach((prot, idx) => {
        ctx.strokeStyle = prot.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = prot.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();

        for (let x = 40; x < canvas.width - 40; x += 4) {
          const t = (x / canvas.width) * 6;
          const osc = Math.sin(t * transcriptionRate - time * 2 + prot.phase);
          // Hill function non-linear cooperativity
          const concentration = Math.pow(Math.max(0, osc), hillCoefficient);
          const y = canvas.height / 2 + (1 - concentration * 2) * 80;

          if (x === 40) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [transcriptionRate, hillCoefficient, circuitType]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Dna className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                GENE CIRCUIT // SYNTHETIC BIOLOGY KINETICS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                HILL EQUATION n=2.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Michaelis-Menten & Repressilator non-linear genetic oscillation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Reset */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => {
              uiaudio.click();
              setTranscriptionRate(1.4);
              setHillCoefficient(2.0);
            }}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Reset Bio Kinetics"
          >
            <RotateCcw className="w-4 h-4" />
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
            <div className="flex items-center space-x-3">
              <span className="text-emerald-400 font-bold">● GFP (LacI)</span>
              <span className="text-red-400 font-bold">● RFP (TetR)</span>
              <span className="text-blue-400 font-bold">● BFP (cI)</span>
            </div>
            <div>STATUS: TRI-STABLE OSCILLATION ACTIVE</div>
          </div>
        </div>

        {/* Kinetics Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              KINETIC PARAMETERS
            </h3>
          </div>

          {/* Transcription Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Transcription Velocity (α):</span>
              <span className="text-emerald-400 font-bold">{transcriptionRate} /min</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.1}
              value={transcriptionRate}
              onChange={(e) => setTranscriptionRate(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Hill Coefficient */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Hill Cooperativity (n):</span>
              <span className="text-cyan-400 font-bold">{hillCoefficient}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={4.0}
              step={0.2}
              value={hillCoefficient}
              onChange={(e) => setHillCoefficient(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
