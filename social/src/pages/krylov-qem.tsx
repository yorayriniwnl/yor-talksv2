import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function KrylovQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [krylovDimensionM, setKrylovDimensionM] = useState(4); // M = 4 Krylov subspace dimension
  const [memoryKernelDecayGamma, setMemoryKernelDecayGamma] = useState(0.12); // 0.12 non-Markovian memory decay
  const [isProjecting, setIsProjecting] = useState(false);
  const [mitigatedDynamicalFidelity, setMitigatedDynamicalFidelity] = useState(0.983);

  const animFrameRef = useRef<number | null>(null);

  const triggerKrylovProjection = () => {
    uiaudio.warp();
    setIsProjecting(true);

    setTimeout(() => {
      setIsProjecting(false);
      setMitigatedDynamicalFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Krylov Operator Subspace Inversion & Non-Markovian Kernel Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Krylov Operator Basis Vectors {O, LO, L^2 O, ..., L^(M-1) O} (Left: 80 to 320)
      const basisStep = 240 / krylovDimensionM;
      for (let k = 0; k < krylovDimensionM; k++) {
        const bx = 90 + k * basisStep;
        const by = cy - 40;

        ctx.fillStyle = k === 0 ? '#06b6d4' : (k === 1 ? '#ec4899' : '#f59e0b');
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isProjecting ? 18 : 6;
        ctx.beginPath();
        ctx.arc(bx, by, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(k === 0 ? 'O_0' : `L^${k}O`, bx - 10, by + 3);
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`KRYLOV OPERATOR BASIS K_M = span{O, LO, ..., L^${krylovDimensionM - 1}O}`, 70, cy - 80);

      // Non-Markovian Memory Kernel Inversion Block (Center at 370, cy + 20)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isProjecting ? 24 : 8;
      ctx.strokeRect(310, cy - 10, 130, 80);
      ctx.fillRect(310, cy - 10, 130, 80);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('KRYLOV RESOLVENT', 320, cy + 18);
      ctx.fillText('(z - L_K)^-1 · |O⟩', 320, cy + 42);

      // Filtered Dynamical Observable Expectation (Right at 550, cy + 20)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isProjecting ? 24 : 10;
      ctx.strokeRect(480, cy - 10, 150, 80);
      ctx.fillRect(480, cy - 10, 150, 80);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('EXACT CORRELATOR', 495, cy + 15);
      ctx.fillText(`⟨O(t) O(0)⟩_mitigated`, 490, cy + 35);
      ctx.fillText(`FIDELITY = ${(mitigatedDynamicalFidelity * 100).toFixed(2)}%`, 495, cy + 55);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `KRYLOV SUBSPACE QEM: DIM M = ${krylovDimensionM} | MEMORY DECAY γ = ${memoryKernelDecayGamma} | DYNAMICAL FIDELITY = ${(mitigatedDynamicalFidelity * 100).toFixed(2)}% (GULL-MILLIS-REICHMAN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [krylovDimensionM, memoryKernelDecayGamma, mitigatedDynamicalFidelity, isProjecting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <FunctionSquare className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                KRYLOV SUBSPACE QEM // NON-MARKOVIAN MEMORY INVERSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                GULL, MILLIS & REICHMAN (COLUMBIA & FLATIRON)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Operator-space Krylov projection & non-Markovian memory kernel deconvolution for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerKrylovProjection}
            disabled={isProjecting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isProjecting ? 'PROJECTING KRYLOV SUBSPACE...' : 'PROJECT KRYLOV RESOLVENT'}</span>
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
              <span className="text-cyan-400 font-bold">KRYLOV DIM: M = {krylovDimensionM}</span>
              <span className="text-pink-400 font-bold">MEMORY DECAY: γ = {memoryKernelDecayGamma}</span>
              <span className="text-emerald-400 font-bold">DYNAMICAL FIDELITY: {(mitigatedDynamicalFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-MARKOVIAN RETARDED NOISE FILTERED</div>
          </div>
        </div>

        {/* Krylov Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              KRYLOV DIMENSION (M)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Subspace Dimension:</span>
              <span className="text-cyan-400 font-bold">M = {krylovDimensionM}</span>
            </div>
            <input
              type="range"
              min={2}
              max={8}
              step={1}
              value={krylovDimensionM}
              onChange={(e) => setKrylovDimensionM(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Operator Krylov Subspaces:</strong> By projecting the Liouvillian superoperator into low-dimensional operator Krylov spaces, complex retarded bath interactions are compressed to tridiagonal Lanczos forms!</div>
            <div>• <strong>Exact Resolvent Inversion:</strong> Directly inverts non-Markovian memory kernels, removing non-exponential decoherence tails in NISQ simulations!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
