import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Box
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HaahCode() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cubeDimensionL, setCubeDimensionL] = useState(4); // 4x4x4 unit cells (2 qubits per site = 128 qubits)
  const [fractalDimensionDh, setFractalDimensionDh] = useState(2.15); // log2(1 + sqrt(5)) ≈ 2.1492
  const [isExciting, setIsExciting] = useState(false);
  const [memoryRetentionTimeYears, setMemoryRetentionTimeYears] = useState(10000); // Macroscopic self-correction

  const animFrameRef = useRef<number | null>(null);

  const triggerHaahExcitation = () => {
    uiaudio.warp();
    setIsExciting(true);

    setTimeout(() => {
      setIsExciting(false);
      uiaudio.success();
    }, 750);
  };

  // 3D Haah's Cubic Code Type-II Fracton Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw 3D Isometric Dual-Qubit Cubic Sites
      const rot = time * 0.3;
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            const px = cx + (x * 45 - y * 45) * Math.cos(rot * 0.3);
            const py = cy + (x * 22 + y * 22) - z * 35;

            // Dual Qubits per site (Qubit A: cyan, Qubit B: pink)
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.arc(px - 4, py, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ec4899';
            ctx.beginPath();
            ctx.arc(px + 4, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw 8-Corner Fractal Sierpinski Excitation Pattern (Center)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isExciting ? 25 : 12;

      const corners = [
        { dx: -45, dy: -30 }, { dx: 45, dy: -30 },
        { dx: -45, dy: 30 }, { dx: 45, dy: 30 },
        { dx: 0, dy: -50 }, { dx: 0, dy: 50 },
        { dx: -60, dy: 0 }, { dx: 60, dy: 0 }
      ];

      corners.forEach((c) => {
        ctx.beginPath();
        ctx.arc(cx + c.dx, cy + c.dy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `HAAH'S CUBIC CODE: TYPE-II FRACTON MODEL (FRACTAL DIM d_H ≈ ${fractalDimensionDh} | NO STRING OPERATORS)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cubeDimensionL, fractalDimensionDh, memoryRetentionTimeYears, isExciting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Box className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-indigo-300 to-pink-400">
                HAAH'S CUBIC CODE // TYPE-II FRACTON QUANTUM HARD DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                JEONGWAN HAAH (CALTECH & MICROSOFT QUANTUM)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Fractal logical operators ($d_H \approx 2.15$) & macroscopic thermal self-correction for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerHaahExcitation}
            disabled={isExciting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isExciting ? 'PROBING FRACTAL LOGICAL CORRELATION...' : 'INJECT TYPE-II FRACTON CLUSTER'}</span>
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
              <span className="text-amber-400 font-bold">LATTICE: {cubeDimensionL}x{cubeDimensionL}x{cubeDimensionL} (2 QUBITS/SITE)</span>
              <span className="text-pink-400 font-bold">FRACTAL DIM: d_H = {fractalDimensionDh}</span>
              <span className="text-emerald-400 font-bold">RETENTION: &gt; {memoryRetentionTimeYears.toLocaleString()} YRS</span>
            </div>
            <div>STATUS: ZERO MOBILE STRING/MEMBRANE OPERATORS</div>
          </div>
        </div>

        {/* Haah Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TYPE-II TOPOLOGY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No String Excitations:</strong> Unlike 2D surface codes or 3D toric codes, Haah's cubic code has zero string or ribbon-like logical operators!</div>
            <div>• <strong>Fractal Energy Barrier:</strong> Flipping a logical qubit requires creating a Sierpinski fractal of excitations with an energy barrier scaling logarithmically with system size, creating true macroscopic self-correction!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
