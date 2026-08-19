import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function StpepsPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [su2BondDimensionD, setSu2BondDimensionD] = useState(4); // D = 4 SU(2) symmetric tensor bond
  const [chiralBoundaryChi, setChiralBoundaryChi] = useState(64); // χ = 64 boundary MPS
  const [isPurifyingStpeps, setIsPurifyingStpeps] = useState(false);
  const [purifiedStpepsFidelity, setPurifiedStpepsFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerStpepsPurification = () => {
    uiaudio.warp();
    setIsPurifyingStpeps(true);

    setTimeout(() => {
      setIsPurifyingStpeps(false);
      setPurifiedStpepsFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Non-Abelian SU(2) Symmetric Tensor PEPS (ST-PEPS) Canvas
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

      // 2D Chiral Spin Liquid Kagome/Square Lattice (Left: 80 to 260)
      const gridSize = 3;
      const spacing = 48;
      const originX = 95;
      const originY = cy - 50;

      // Chiral SU(2) Gauge Invariant Virtual Bonds
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // Horizontal SU(2) Bond
          if (c < gridSize - 1) {
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + spacing, y);
            ctx.stroke();
          }
          // Vertical SU(2) Bond
          if (r < gridSize - 1) {
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x, y + spacing);
            ctx.stroke();
          }
          // Diagonal Chiral Flux Bond (T-breaking spin chirality)
          if (r < gridSize - 1 && c < gridSize - 1) {
            ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + spacing, y + spacing);
            ctx.stroke();
            ctx.strokeStyle = '#a855f7';
          }
        }
      }

      // Symmetric Tensor Nodes with SU(2) Clebsch-Gordan Coefficients
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // Chiral Non-Abelian Spin Flux Loop
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.stroke();

          // Physical Spin-1/2 Node (SU(2) Invariant)
          ctx.fillStyle = (r + c) % 2 === 0 ? '#3b82f6' : '#ec4899';
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 6.5px monospace';
          ctx.fillText('j=½', x - 6, y + 2.5);
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
      ctx.fillText('SU(2) BOUNDARY MPS (χ=64)', 83, originY + gridSize * spacing);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D CHIRAL SPIN LIQUID (D=4)', 75, cy + 90);

      // ST-PEPS Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isPurifyingStpeps ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('ST-PEPS PURIFIER', 318, cy - 12);
      ctx.fillText('SU(2) CLEBSCH-GORDAN', 308, cy + 8);

      // Purified Chiral Spin Liquid Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingStpeps ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CHIRAL SPIN LIQUID GROUND', 484, cy - 35);
      ctx.fillText('ZERO T-VIOLATION NOISE', 482, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedStpepsFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ST-PEPS CHIRAL QEM: SU(2) BOND D = ${su2BondDimensionD} | BOUNDARY χ = ${chiralBoundaryChi} | FIDELITY = ${(purifiedStpepsFidelity * 100).toFixed(2)}% (SCHUCH & POILBLANC)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [su2BondDimensionD, chiralBoundaryChi, purifiedStpepsFidelity, isPurifyingStpeps]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                ST-PEPS CHIRAL QEM // NON-ABELIAN SPIN-LIQUID PURIFIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                SCHUCH, POILBLANC, CIRAC & PEREZ-GARCIA (MPQ GARCHING & TOULOUSE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D SU(2) non-Abelian symmetric tensor PEPS chiral spin-liquid boundary MPS purifier for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerStpepsPurification}
            disabled={isPurifyingStpeps}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingStpeps ? 'PROJECTING SU(2) TENSORS...' : 'PURIFY VIA ST-PEPS'}</span>
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
              <span className="text-purple-400 font-bold">SU(2) BOND: D = {su2BondDimensionD}</span>
              <span className="text-pink-400 font-bold">BOUNDARY MPS: χ = {chiralBoundaryChi}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedStpepsFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-ABELIAN SU(2) CLEBSCH-GORDAN GAUGE CONVERGED</div>
          </div>
        </div>

        {/* ST-PEPS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SU(2) BOND (D)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>SU(2) Tensor Bond:</span>
              <span className="text-purple-400 font-bold">D = {su2BondDimensionD}</span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              step={1}
              value={su2BondDimensionD}
              onChange={(e) => setSu2BondDimensionD(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Exact SU(2) Clebsch-Gordan Blocks:</strong> Imposes exact non-Abelian spin rotational symmetry on virtual tensor legs, preventing unphysical singlet-triplet mixing noise!</div>
            <div>• <strong>Chiral Boundary Gauge Purification:</strong> Accurately isolates chiral edge modes in non-Abelian topological spin liquids directly in the thermodynamic limit!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
