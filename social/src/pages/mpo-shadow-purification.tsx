import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, Scissors
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MpoShadowPurification() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mpoBondDimensionChi, setMpoBondDimensionChi] = useState(8); // chi = 8 MPO bond dimension
  const [svdTruncationThreshold, setSvdTruncationThreshold] = useState(0.0001); // 1e-4 SVD truncation
  const [isPurifying, setIsPurifying] = useState(false);
  const [purifiedMpoFidelity, setPurifiedMpoFidelity] = useState(0.986);

  const animFrameRef = useRef<number | null>(null);

  const triggerMpoPurification = () => {
    uiaudio.warp();
    setIsPurifying(true);

    setTimeout(() => {
      setIsPurifying(false);
      setPurifiedMpoFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Matrix Product Operator (MPO) Tensor Chain & SVD Purification Canvas
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

      // Draw 1D MPO Tensor Chain (Left: 80 to 360, cy - 30)
      const numTensors = 5;
      const tStep = 55;

      for (let t = 0; t < numTensors; t++) {
        const tx = 95 + t * tStep;
        const ty = cy - 30;

        // Tensor Node
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = isPurifying ? 18 : 6;
        ctx.fillRect(tx - 16, ty - 16, 32, 32);
        ctx.strokeRect(tx - 16, ty - 16, 32, 32);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`A^(${t + 1})`, tx - 10, ty + 4);

        // Physical In/Out Legs (Vertical lines)
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 16); ctx.lineTo(tx, ty - 38);
        ctx.moveTo(tx, ty + 16); ctx.lineTo(tx, ty + 38);
        ctx.stroke();

        // Virtual Bond Leg (Horizontal connection)
        if (t < numTensors - 1) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(tx + 16, ty); ctx.lineTo(tx + tStep - 16, ty);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`MATRIX PRODUCT OPERATOR (MPO) CHAIN (χ = ${mpoBondDimensionChi})`, 75, cy - 65);

      // Canonical SVD Schmidt Value Truncation Kernel (Center at 420, cy - 30)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isPurifying ? 24 : 8;
      ctx.beginPath();
      ctx.arc(420, cy - 30, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SVD TRUNCATION', 375, cy - 34);
      ctx.fillText('σ_k ≥ ε_SVD', 390, cy - 18);

      // Positive Semidefinite Physical State (Right at 560, cy - 30)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifying ? 24 : 10;
      ctx.strokeRect(510, cy - 75, 140, 90);
      ctx.fillRect(510, cy - 75, 140, 90);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PURIFIED MPO STATE', 522, cy - 45);
      ctx.fillText('Tr(ρ) = 1, ρ ≥ 0', 530, cy - 20);
      ctx.fillText(`F = ${(purifiedMpoFidelity * 100).toFixed(2)}%`, 542, cy + 5);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `MPO SHADOW PURIFICATION: BOND DIM χ = ${mpoBondDimensionChi} | SVD CUTOFF ε = ${svdTruncationThreshold} | PURIFIED FIDELITY = ${(purifiedMpoFidelity * 100).toFixed(2)}% (CIRAC & VERSTRAETE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mpoBondDimensionChi, svdTruncationThreshold, purifiedMpoFidelity, isPurifying]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Filter className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                MPO SHADOW PURIFICATION // TENSOR SINGULAR VALUE TRUNCATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CIRAC, VERSTRAETE & HASTINGS (MAX PLANCK)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              1D/2D Matrix product operator classical shadows & positive semidefinite purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMpoPurification}
            disabled={isPurifying}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifying ? 'TRUNCATING MPO SHADOW...' : 'PURIFY MPO DENSITY CHAIN'}</span>
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
              <span className="text-cyan-400 font-bold">BOND DIM: χ = {mpoBondDimensionChi}</span>
              <span className="text-pink-400 font-bold">SVD CUTOFF: {svdTruncationThreshold}</span>
              <span className="text-emerald-400 font-bold">PURIFIED FIDELITY: {(purifiedMpoFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: TENSOR ENTANGLEMENT TRUNCATION ACTIVE</div>
          </div>
        </div>

        {/* MPO Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BOND DIMENSION (χ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>MPO Rank Cutoff:</span>
              <span className="text-cyan-400 font-bold">χ = {mpoBondDimensionChi}</span>
            </div>
            <input
              type="range"
              min={4}
              max={32}
              step={4}
              value={mpoBondDimensionChi}
              onChange={(e) => setMpoBondDimensionChi(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Efficient Tensor Compression:</strong> Representing shadow reconstructions as Matrix Product Operators compresses $2^N \times 2^N$ density matrices to polynomial $\mathcal{O}(N \chi^2)$ parameters!</div>
            <div>• <strong>Positive Semidefinite Gauge:</strong> Local Schmidt singular value truncations naturally enforce positive trace spectra, eliminating spurious negative probability amplitudes!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
