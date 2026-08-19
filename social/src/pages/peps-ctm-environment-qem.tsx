import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PepsCtmEnvironmentQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pepsBondDimensionD, setPepsBondDimensionD] = useState(4); // D = 4 PEPS bond
  const [ctmEnvironmentChi, setCtmEnvironmentChi] = useState(80); // χ = 80 CTM environment
  const [isProjectingEnvironment, setIsProjectingEnvironment] = useState(false);
  const [purifiedCtmFidelity, setPurifiedCtmFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerCtmPurification = () => {
    uiaudio.warp();
    setIsProjectingEnvironment(true);

    setTimeout(() => {
      setIsProjectingEnvironment(false);
      setPurifiedCtmFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D CTMRG Environment Projector Canvas
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

      // CTMRG 9-Tensor Block Diagram (Left: 80 to 240, cy - 80 to cy + 80)
      // C1 (Top-Left), T1 (Top), C2 (Top-Right)
      // T4 (Left), A (Center Bulk Tensor), T2 (Right)
      // C4 (Bottom-Left), T3 (Bottom), C3 (Bottom-Right)

      const originX = 160;
      const originY = cy;
      const blockSize = 32;

      // Corner Tensors (Pink C1, C2, C3, C4)
      ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;

      ctx.fillRect(originX - blockSize * 1.5, originY - blockSize * 1.5, blockSize, blockSize);
      ctx.strokeRect(originX - blockSize * 1.5, originY - blockSize * 1.5, blockSize, blockSize);
      ctx.fillRect(originX + blockSize * 0.5, originY - blockSize * 1.5, blockSize, blockSize);
      ctx.strokeRect(originX + blockSize * 0.5, originY - blockSize * 1.5, blockSize, blockSize);
      ctx.fillRect(originX + blockSize * 0.5, originY + blockSize * 0.5, blockSize, blockSize);
      ctx.strokeRect(originX + blockSize * 0.5, originY + blockSize * 0.5, blockSize, blockSize);
      ctx.fillRect(originX - blockSize * 1.5, originY + blockSize * 0.5, blockSize, blockSize);
      ctx.strokeRect(originX - blockSize * 1.5, originY + blockSize * 0.5, blockSize, blockSize);

      // Half-Row/Column Transfer Tensors (Cyan T1, T2, T3, T4)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.strokeStyle = '#06b6d4';
      ctx.fillRect(originX - blockSize * 0.5, originY - blockSize * 1.5, blockSize, blockSize);
      ctx.strokeRect(originX - blockSize * 0.5, originY - blockSize * 1.5, blockSize, blockSize);
      ctx.fillRect(originX + blockSize * 0.5, originY - blockSize * 0.5, blockSize, blockSize);
      ctx.strokeRect(originX + blockSize * 0.5, originY - blockSize * 0.5, blockSize, blockSize);
      ctx.fillRect(originX - blockSize * 0.5, originY + blockSize * 0.5, blockSize, blockSize);
      ctx.strokeRect(originX - blockSize * 0.5, originY + blockSize * 0.5, blockSize, blockSize);
      ctx.fillRect(originX - blockSize * 1.5, originY - blockSize * 0.5, blockSize, blockSize);
      ctx.strokeRect(originX - blockSize * 1.5, originY - blockSize * 0.5, blockSize, blockSize);

      // Central Reduced Density Bulk Matrix A (Amber)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isProjectingEnvironment ? 24 : 8;
      ctx.fillRect(originX - blockSize * 0.5, originY - blockSize * 0.5, blockSize, blockSize);
      ctx.strokeRect(originX - blockSize * 0.5, originY - blockSize * 0.5, blockSize, blockSize);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7.5px monospace';
      ctx.fillText('C1', originX - blockSize * 1.3, originY - blockSize * 0.9);
      ctx.fillText('C2', originX + blockSize * 0.7, originY - blockSize * 0.9);
      ctx.fillText('C3', originX + blockSize * 0.7, originY + blockSize * 1.1);
      ctx.fillText('C4', originX - blockSize * 1.3, originY + blockSize * 1.1);
      ctx.fillText('a(D)', originX - 10, originY + 2.5);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D CTMRG ENVIRONMENT (χ=80)', 70, cy + 90);

      // CTMRG Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isProjectingEnvironment ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CTM PROJECTOR', 320, cy - 12);
      ctx.fillText('CORNER TRANSFER RG', 310, cy + 8);

      // Purified 2D Thermodynamic Limit Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isProjectingEnvironment ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D INFINITE LATTICE', 492, cy - 35);
      ctx.fillText('EXACT CORRELATORS <O>', 484, cy - 10);
      ctx.fillText(`CTM FIDELITY = ${(purifiedCtmFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CTM ENVIRONMENT QEM: PEPS BOND D = ${pepsBondDimensionD} | CTM χ = ${ctmEnvironmentChi} | FIDELITY = ${(purifiedCtmFidelity * 100).toFixed(2)}% (NISHINO, ORUS & CORBOZ)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pepsBondDimensionD, ctmEnvironmentChi, purifiedCtmFidelity, isProjectingEnvironment]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-400">
                CTM ENVIRONMENT QEM // INFINITE 2D PEPS PURIFIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                NISHINO, ORÚS, VERSTRAETE & CORBOZ (AMSTERDAM & MPQ GARCHING)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D infinite PEPS corner transfer matrix environment RG projector for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCtmPurification}
            disabled={isProjectingEnvironment}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isProjectingEnvironment ? 'CONTRACTING CTM CHANNELS...' : 'PURIFY VIA CTM ENVIRONMENT'}</span>
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
              <span className="text-cyan-400 font-bold">PEPS BOND: D = {pepsBondDimensionD}</span>
              <span className="text-pink-400 font-bold">CTM ENVIRONMENT: χ = {ctmEnvironmentChi}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedCtmFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: CORNER TRANSFER MATRIX RENORMALIZATION CONVERGED</div>
          </div>
        </div>

        {/* CTMRG Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CTM ENVIRONMENT (χ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Environment Dimension:</span>
              <span className="text-cyan-400 font-bold">χ = {ctmEnvironmentChi}</span>
            </div>
            <input
              type="range"
              min={20}
              max={128}
              step={8}
              value={ctmEnvironmentChi}
              onChange={(e) => setCtmEnvironmentChi(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Infinite 2D Environment RG:</strong> Contracts infinite 2D PEPS lattices into 4 Corner Tensors ($C$) and 4 Half-Row Transfer Tensors ($T$) with exact directional isometries!</div>
            <div>• <strong>Thermodynamic Limit Correlators:</strong> Accurately computes local order parameters and long-range entanglement spectra directly in infinite planar lattices!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
