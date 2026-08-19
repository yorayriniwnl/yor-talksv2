import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Network
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonNonInvertible() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fusionCategoryQuantumDim, setFusionCategoryQuantumDim] = useState(1.618); // d = 1.618 golden ratio Fibonacci category
  const [nonInvertibleDefectPurity, setNonInvertibleDefectPurity] = useState(0.988);
  const [isSynthesizingNonInvertible, setIsSynthesizingNonInvertible] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerNonInvertibleSynthesis = () => {
    uiaudio.warp();
    setIsSynthesizingNonInvertible(true);

    setTimeout(() => {
      setIsSynthesizingNonInvertible(false);
      setNonInvertibleDefectPurity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Non-Invertible Fracton Symmetry Canvas
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

      // Non-Invertible Topological Defect Mesh (Left: 80 to 260)
      const numLines = 5;
      for (let l = 0; l < numLines; l++) {
        const lx = 90 + l * 34;

        // Vertical Defect Line (Pink)
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(lx, cy - 60); ctx.lineTo(lx, cy + 60);
        ctx.stroke();

        // Horizontal Category Junction (Cyan)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(80, cy - 40 + l * 20); ctx.lineTo(240, cy - 40 + l * 20);
        ctx.stroke();
      }

      // Non-Abelian Fusion Nodes at Junctions (d = 1.618)
      const isSynthesized = isSynthesizingNonInvertible || nonInvertibleDefectPurity > 0.99;
      for (let i = 0; i < 3; i++) {
        const nx = 124 + i * 34;
        const ny = cy - 20 + i * 20;

        ctx.fillStyle = isSynthesized ? '#f59e0b' : '#334155';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = isSynthesized ? 16 : 0;
        ctx.beginPath();
        ctx.arc(nx, ny, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NON-INVERTIBLE DEFECT MESH', 80, cy + 90);

      // Fusion Category Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isSynthesizingNonInvertible ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FUSION CATEGORY', 320, cy - 12);
      ctx.fillText('d = 1.618 FIBONACCI', 315, cy + 8);

      // Non-Invertible Tensor Symmetry Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isSynthesizingNonInvertible ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NON-INVERTIBLE SYMMETRY', 484, cy - 35);
      ctx.fillText('FIBONACCI ANYON DEFECTS', 482, cy - 10);
      ctx.fillText(`CATEGORY PURITY = ${(nonInvertibleDefectPurity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON NON-INVERTIBLE: QUANTUM DIM d = ${fusionCategoryQuantumDim.toFixed(3)} | PURITY = ${(nonInvertibleDefectPurity * 100).toFixed(2)}% (SHAO, PRETKO & RADZIHOVSKY)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [fusionCategoryQuantumDim, nonInvertibleDefectPurity, isSynthesizingNonInvertible]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Network className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                FRACTON NON-INVERTIBLE // FUSION CATEGORIES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                SHAO, PRETKO & RADZIHOVSKY (HARVARD & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Higher-rank non-invertible tensor symmetries & Fibonacci fusion defects for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerNonInvertibleSynthesis}
            disabled={isSynthesizingNonInvertible}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSynthesizingNonInvertible ? 'SYNTHESIZING FUSION DEFECTS...' : 'SYNTHESIZE NON-INVERTIBLE DEFECTS'}</span>
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
              <span className="text-pink-400 font-bold">QUANTUM DIM: d = {fusionCategoryQuantumDim.toFixed(3)}</span>
              <span className="text-cyan-400 font-bold">CATEGORY: FIBONACCI ANYONS</span>
              <span className="text-emerald-400 font-bold">PURITY: {(nonInvertibleDefectPurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-INVERTIBLE TENSOR CHARGE DEFECTS CONVERGED</div>
          </div>
        </div>

        {/* Non-Invertible Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              QUANTUM DIMENSION (d)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Category Dim:</span>
              <span className="text-pink-400 font-bold">d = {fusionCategoryQuantumDim.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={2.5}
              step={0.05}
              value={fusionCategoryQuantumDim}
              onChange={(e) => setFusionCategoryQuantumDim(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Non-Invertible Symmetries:</strong> Unlike ordinary group symmetries, non-invertible topological defect operators do not have an inverse ($D \times D = 1 + D$), protecting universal topological quantum computing!</div>
            <div>• <strong>Non-Abelian Fracton Fusion:</strong> Merging sub-dimensional lineons across Fibonacci defect junctions generates non-local topological entanglement without mobile bulk quasiparticles!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
