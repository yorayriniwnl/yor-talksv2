import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, Layers, Eye, Brain
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MicrotubuleSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [coherenceTimeMs, setCoherenceTimeMs] = useState(25); // 25ms = 40 Hz gamma synchrony
  const [orchReductionEvent, setOrchReductionEvent] = useState(false);
  const [frohlichFreqGhz, setFrohlichFreqGhz] = useState(8.4); // GHz resonant modes

  const animFrameRef = useRef<number | null>(null);

  const triggerOrchOrCollapse = () => {
    uiaudio.warp();
    setOrchReductionEvent(true);

    setTimeout(() => {
      setOrchReductionEvent(false);
      uiaudio.success();
    }, 1000);
  };

  // 13-Protofilament Microtubule Cylinder Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Cellular Interior Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const protofilaments = 13;
      const rows = 28;
      const spacingY = 16;
      const spacingX = 22;

      // Draw Cylindrical Tubulin Dipole Lattice Grid
      for (let p = 0; p < protofilaments; p++) {
        const y = 80 + p * spacingY;

        for (let c = 0; c < rows; c++) {
          const x = 70 + c * spacingX;
          const quantumPhase = Math.sin(x * 0.05 + y * 0.08 + time * 3);

          // Alpha / Beta Tubulin Conformation State
          const isAlpha = quantumPhase > 0;
          ctx.fillStyle = orchReductionEvent 
            ? '#ffffff' 
            : (isAlpha ? '#06b6d4' : '#a855f7');

          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = orchReductionEvent ? 15 : 6;

          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [orchReductionEvent]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
                MICROTUBULE // ORCH-OR QUANTUM CONSCIOUSNESS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                PENROSE-HAMEROFF MODEL
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              13-protofilament tubulin lattice Fröhlich condensate & objective reduction for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerOrchOrCollapse}
            disabled={orchReductionEvent}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{orchReductionEvent ? 'OBJECTIVE REDUCTION TRIGGERED!' : 'TRIGGER OBJECTIVE REDUCTION (OR)'}</span>
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
              <span className="text-purple-400 font-bold">FRÖHLICH FREQ: {frohlichFreqGhz} GHz</span>
              <span className="text-cyan-400 font-bold">COHERENCE: {coherenceTimeMs} ms (40 Hz GAMMA)</span>
            </div>
            <div>STATUS: MACROSCOPIC QUANTUM SUPERPOSITION</div>
          </div>
        </div>

        {/* Quantum Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ORCH-OR MECHANICS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Tubulin Dipoles:</strong> Conformational states of tubulin proteins act as quantum bits in neuronal microtubules.</div>
            <div>• <strong>Objective Reduction:</strong> Gravitational self-energy reaches Planck threshold τ ≈ ℏ/E_G, producing conscious moments of proto-experience.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
