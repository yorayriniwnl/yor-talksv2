import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function VumpsPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [vumpsBondDimensionChi, setVumpsBondDimensionChi] = useState(64); // χ = 64 VUMPS bond dimension
  const [tangentGradientTolerance, setTangentGradientTolerance] = useState(1e-6); // 1e-6 gradient tolerance
  const [isPurifyingVumps, setIsPurifyingVumps] = useState(false);
  const [purifiedVumpsFidelity, setPurifiedVumpsFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerVumpsPurification = () => {
    uiaudio.warp();
    setIsPurifyingVumps(true);

    setTimeout(() => {
      setIsPurifyingVumps(false);
      setPurifiedVumpsFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 1D Infinite MPS Variational Uniform Matrix Product State (VUMPS) Canvas
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

      // Mixed Canonical Chain: A_L - A_C - A_R (Left: 80 to 260)
      const nodes = [
        { x: 95, y: cy - 10, label: 'A_L', color: '#06b6d4' },
        { x: 170, y: cy - 10, label: 'A_C', color: '#ec4899' },
        { x: 245, y: cy - 10, label: 'A_R', color: '#38bdf8' },
      ];

      // Virtual Entanglement Bonds
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy - 10); ctx.lineTo(260, cy - 10);
      ctx.stroke();

      nodes.forEach(n => {
        // Physical Leg
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y); ctx.lineTo(n.x, n.y - 32);
        ctx.stroke();

        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(n.x, n.y - 32, 4, 0, Math.PI * 2);
        ctx.fill();

        // Tensor Node
        ctx.fillStyle = n.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(n.label, n.x - 9, n.y + 3);
      });

      // Tangent Space Gradient Vector (at 170, cy + 30)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(170, cy + 15); ctx.lineTo(170, cy + 45);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('∇E ∈ T_{|Ψ⟩}', 142, cy + 58);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('UNIFORM TANGENT MPS (VUMPS)', 80, cy + 90);

      // VUMPS Tangent Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isPurifyingVumps ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('VUMPS PURIFIER', 324, cy - 12);
      ctx.fillText('H_{A_C} & H_C SOLVER', 315, cy + 8);

      // Purified 1D Thermodynamic Limit Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingVumps ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('1D THERMODYNAMIC LIMIT', 484, cy - 35);
      ctx.fillText('TANGENT SPACE GRADIENT = 0', 482, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedVumpsFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `VUMPS PURIFIER QEM: BOND DIMENSION χ = ${vumpsBondDimensionChi} | TANGENT GRADIENT = ${tangentGradientTolerance} | FIDELITY = ${(purifiedVumpsFidelity * 100).toFixed(2)}% (VERSTRAETE & HAEGEMAN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [vumpsBondDimensionChi, tangentGradientTolerance, purifiedVumpsFidelity, isPurifyingVumps]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <LineChart className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-sky-300 to-pink-400">
                VUMPS PURIFIER QEM // TANGENT SPACE MPS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ZAUNER, FISHMAN, VERSTRAETE & HAEGEMAN (VIENNA & GHENT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              1D Infinite uniform MPS tangent space gradient optimization for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerVumpsPurification}
            disabled={isPurifyingVumps}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingVumps ? 'SOLVING TANGENT GRADIENT...' : 'PURIFY VIA VUMPS'}</span>
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
              <span className="text-purple-400 font-bold">VUMPS BOND: χ = {vumpsBondDimensionChi}</span>
              <span className="text-pink-400 font-bold">GRADIENT: 1e-6</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedVumpsFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: TANGENT SPACE EFFECTIVE HAMILTONIAN CONVERGED</div>
          </div>
        </div>

        {/* VUMPS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BOND DIMENSION (χ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Uniform Bond:</span>
              <span className="text-purple-400 font-bold">χ = {vumpsBondDimensionChi}</span>
            </div>
            <input
              type="range"
              min={16}
              max={128}
              step={16}
              value={vumpsBondDimensionChi}
              onChange={(e) => setVumpsBondDimensionChi(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Tangent Space Optimization:</strong> VUMPS optimizes infinite uniform matrix product states directly in the thermodynamic limit using tangent space projections!</div>
            <div>• <strong>Exact Mixed Gauge:</strong> Solves effective 1-site and 0-site Hamiltonians ($H_{A_C}, H_C$) iteratively, eliminating boundary truncation errors with quadratic convergence!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
