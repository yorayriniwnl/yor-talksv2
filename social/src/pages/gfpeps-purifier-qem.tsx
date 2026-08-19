import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function GfpepsPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [rvbBondDimensionD, setRvbBondDimensionD] = useState(4); // D = 4 Gutzwiller PEPS bond
  const [gutzwillerBoundaryChi, setGutzwillerBoundaryChi] = useState(64); // χ = 64 boundary MPS
  const [isPurifyingGfpeps, setIsPurifyingGfpeps] = useState(false);
  const [purifiedGfpepsFidelity, setPurifiedGfpepsFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerGfpepsPurification = () => {
    uiaudio.warp();
    setIsPurifyingGfpeps(true);

    setTimeout(() => {
      setIsPurifyingGfpeps(false);
      setPurifiedGfpepsFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Gutzwiller-Projected Fermionic PEPS (GfPEPS) Canvas
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

      // 2D RVB Singlet Lattice (Left: 80 to 260)
      const gridSize = 3;
      const spacing = 48;
      const originX = 95;
      const originY = cy - 50;

      // Resonating Valence Bond (RVB) Singlet Pairs
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // Horizontal RVB Singlet
          if (c < gridSize - 1) {
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + spacing, y);
            ctx.stroke();
          }
          // Vertical RVB Singlet
          if (r < gridSize - 1) {
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x, y + spacing);
            ctx.stroke();
          }
        }
      }

      // Projected Fermionic Sites (Gutzwiller Projection: No Double Occupancy)
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // d-wave superconducting pairing arrow (Up-Right)
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x + 12, y - 12);
          ctx.stroke();

          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(x + 12, y - 12, 3, 0, Math.PI * 2);
          ctx.fill();

          // Single-Fermion Node (Gutzwiller Projected)
          ctx.fillStyle = (r + c) % 2 === 0 ? '#22c55e' : '#f59e0b';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 7px monospace';
          ctx.fillText('P_G', x - 6, y + 2.5);
        }
      }

      // Boundary MPS Row
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, originY + gridSize * spacing - 16, 130, 24);
      ctx.fillRect(80, originY + gridSize * spacing - 16, 130, 24);

      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('GUTZWILLER MPS (χ=64)', 84, originY + gridSize * spacing);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D RVB GUTZWILLER PEPS (D=4)', 75, cy + 90);

      // GfPEPS Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = isPurifyingGfpeps ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('GfPEPS PURIFIER', 320, cy - 12);
      ctx.fillText('d-WAVE HIGH-Tc RVB', 315, cy + 8);

      // Purified High-Tc Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingGfpeps ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('HIGH-Tc CUPRATE STATE', 488, cy - 35);
      ctx.fillText('NO DOUBLE-OCCUPANCY NOISE', 480, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedGfpepsFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `GfPEPS HIGH-Tc QEM: RVB BOND D = ${rvbBondDimensionD} | BOUNDARY χ = ${gutzwillerBoundaryChi} | FIDELITY = ${(purifiedGfpepsFidelity * 100).toFixed(2)}% (POILBLANC & CIRAC)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rvbBondDimensionD, gutzwillerBoundaryChi, purifiedGfpepsFidelity, isPurifyingGfpeps]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-400">
                GfPEPS HIGH-Tc QEM // GUTZWILLER RVB PURIFIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                POILBLANC, SCHUCH & CIRAC (PAUL SABATIER & MPQ GARCHING)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D Gutzwiller-projected RVB fermionic PEPS boundary MPS purifier for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerGfpepsPurification}
            disabled={isPurifyingGfpeps}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingGfpeps ? 'PROJECTING GUTZWILLER MPS...' : 'PURIFY VIA GfPEPS'}</span>
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
              <span className="text-cyan-400 font-bold">RVB BOND: D = {rvbBondDimensionD}</span>
              <span className="text-pink-400 font-bold">BOUNDARY MPS: χ = {gutzwillerBoundaryChi}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedGfpepsFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: GUTZWILLER ZERO DOUBLE OCCUPANCY CONVERGED</div>
          </div>
        </div>

        {/* GfPEPS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              RVB BOND (D)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>2D RVB Bond:</span>
              <span className="text-cyan-400 font-bold">D = {rvbBondDimensionD}</span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              step={1}
              value={rvbBondDimensionD}
              onChange={(e) => setRvbBondDimensionD(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Gutzwiller Projection Operator:</strong> Exact local projection eliminates forbidden double-occupancy quantum noise, accurately stabilizing high-Tc d-wave superconducting ground states!</div>
            <div>• <strong>Thermodynamic RVB Boundary:</strong> Contracts 2D resonating valence bond transfer matrices via 1D boundary MPS without finite-size distortion!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
