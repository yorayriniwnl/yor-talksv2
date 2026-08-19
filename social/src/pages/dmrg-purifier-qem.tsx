import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DmrgPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mpsBondDimensionChi, setMpsBondDimensionChi] = useState(64); // chi = 64 bond dimension
  const [schmidtTruncationErrorEps, setSchmidtTruncationErrorEps] = useState(0.0001); // 1e-4 truncation error
  const [isPurifying, setIsPurifying] = useState(false);
  const [purifiedStateFidelity, setPurifiedStateFidelity] = useState(0.984);

  const animFrameRef = useRef<number | null>(null);

  const triggerDmrgPurification = () => {
    uiaudio.warp();
    setIsPurifying(true);

    setTimeout(() => {
      setIsPurifying(false);
      setPurifiedStateFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Matrix Product Density Operator (MPDO) SVD Schmidt Truncation Canvas
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

      // Raw Noisy 1D Tensor Train MPDO (Left: 80 to 240, cy - 20)
      const numSites = 5;
      for (let s = 0; s < numSites; s++) {
        const sx = 90 + s * 34;

        // Tensor Node
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, cy - 20, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Physical Index Leg
        ctx.strokeStyle = '#ec4899';
        ctx.beginPath();
        ctx.moveTo(sx, cy - 20); ctx.lineTo(sx, cy + 15);
        ctx.stroke();

        // Virtual Bond Link
        if (s < numSites - 1) {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(sx + 10, cy - 20); ctx.lineTo(sx + 24, cy - 20);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NOISY MPDO TENSOR TRAIN', 80, cy - 45);

      // DMRG SVD Schmidt Purification Kernel (Center at 370, cy - 20)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isPurifying ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 20, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DMRG SVD PURIFIER', 320, cy - 28);
      ctx.fillText(`χ = ${mpsBondDimensionChi} (CUTOFF)`, 328, cy - 8);

      // Mitigated Pure MPS State Output (Right at 530, cy - 20)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifying ? 24 : 6;
      ctx.strokeRect(480, cy - 75, 160, 110);
      ctx.fillRect(480, cy - 75, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PURIFIED MPS MANIFOLD', 490, cy - 50);
      ctx.fillText('THERMAL NOISE DECOUPLED', 486, cy - 25);
      ctx.fillText(`FIDELITY = ${(purifiedStateFidelity * 100).toFixed(2)}%`, 495, cy + 5);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DMRG TENSOR PURIFIER: BOND DIMENSION χ = ${mpsBondDimensionChi} | TRUNCATION ε = ${schmidtTruncationErrorEps} | FIDELITY = ${(purifiedStateFidelity * 100).toFixed(2)}% (SCHOLLWÖCK & CIRAC)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mpsBondDimensionChi, schmidtTruncationErrorEps, purifiedStateFidelity, isPurifying]);

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
                DMRG PURIFIER QEM // MATRIX PRODUCT DENSITY OPERATOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SCHOLLWÖCK & CIRAC (LMU MUNICH & MPQ)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Tensor network density matrix SVD truncation & Schmidt decomposition purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerDmrgPurification}
            disabled={isPurifying}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifying ? 'TRUNCATING NOISY SCHMIDT MODES...' : 'PURIFY VIA DMRG SVD'}</span>
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
              <span className="text-cyan-400 font-bold">BOND DIMENSION: χ = {mpsBondDimensionChi}</span>
              <span className="text-pink-400 font-bold">TRUNCATION: ε = {schmidtTruncationErrorEps}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedStateFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: PURIFIED TENSOR MANIFOLD PROJECTED</div>
          </div>
        </div>

        {/* DMRG Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BOND DIMENSION (χ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>MPS Virtual Dimension:</span>
              <span className="text-cyan-400 font-bold">χ = {mpsBondDimensionChi}</span>
            </div>
            <input
              type="range"
              min={16}
              max={128}
              step={16}
              value={mpsBondDimensionChi}
              onChange={(e) => setMpsBondDimensionChi(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Matrix Product Density Operator (MPDO):</strong> Decomposes large density matrices into local 3-leg tensors, capturing spatial quantum entanglement while bounding complexity!</div>
            <div>• <strong>Singular Value Truncation:</strong> Discarding low-weight Schmidt singular values below the cutoff threshold strips away mixed thermal noise, recovering the pure target ground state!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
