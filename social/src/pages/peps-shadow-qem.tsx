import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PepsShadowQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pepsBondDimensionD, setPepsBondDimensionD] = useState(4); // D = 4 virtual bond dimension
  const [shadowRandomCliffordSnapshots, setShadowRandomCliffordSnapshots] = useState(2400); // 2,400 snapshots
  const [isDeconvolvingPeps, setIsDeconvolvingPeps] = useState(false);
  const [pepsReconstructedFidelity, setPepsReconstructedFidelity] = useState(0.986);

  const animFrameRef = useRef<number | null>(null);

  const triggerPepsDeconvolution = () => {
    uiaudio.warp();
    setIsDeconvolvingPeps(true);

    setTimeout(() => {
      setIsDeconvolvingPeps(false);
      setPepsReconstructedFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Projected Entangled Pair States (PEPS) Classical Shadow Deconvolution Canvas
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

      // 2D PEPS 3x3 Grid Tensor Network (Left: 90 to 250)
      const gridSize = 3;
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const px = 110 + c * 50;
          const py = cy - 60 + r * 50;

          // Virtual horizontal bond
          if (c < gridSize - 1) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(px, py); ctx.lineTo(px + 50, py);
            ctx.stroke();
          }

          // Virtual vertical bond
          if (r < gridSize - 1) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(px, py); ctx.lineTo(px, py + 50);
            ctx.stroke();
          }

          // PEPS 5-Leg Tensor Node
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D PEPS TENSOR LATTICE', 95, cy + 80);

      // PEPS Shadow Channel Inversion Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isDeconvolvingPeps ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SHADOW INVERSION', 320, cy - 12);
      ctx.fillText(`M^-1 [Tr_B(PEPS)]`, 322, cy + 8);

      // Mitigated 2D Classical Shadow Reconstruction Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isDeconvolvingPeps ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2-RDM DENSITY MATRIX', 492, cy - 35);
      ctx.fillText('SAMPLE OVERHEAD O(log N)', 486, cy - 10);
      ctx.fillText(`RECON FIDELITY = ${(pepsReconstructedFidelity * 100).toFixed(2)}%`, 488, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PEPS SHADOW QEM: BOND DIMENSION D = ${pepsBondDimensionD} | CLIFFORD SHADOWS = ${shadowRandomCliffordSnapshots} | FIDELITY = ${(pepsReconstructedFidelity * 100).toFixed(2)}% (SCHUCH & CIRAC)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pepsBondDimensionD, shadowRandomCliffordSnapshots, pepsReconstructedFidelity, isDeconvolvingPeps]);

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
                PEPS SHADOW QEM // 2D TENSOR SHADOW TOMOGRAPHY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SCHUCH, PEREZ-GARCIA & CIRAC (MPQ & UNIV. VIENNA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D Projected Entangled Pair States & randomized Clifford shadow deconvolution for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerPepsDeconvolution}
            disabled={isDeconvolvingPeps}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDeconvolvingPeps ? 'DECONVOLVING PEPS SHADOWS...' : 'INVERT 2D PEPS SHADOW MAP'}</span>
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
              <span className="text-cyan-400 font-bold">PEPS BOND DIMENSION: D = {pepsBondDimensionD}</span>
              <span className="text-pink-400 font-bold">CLIFFORD SNAPSHOTS: {shadowRandomCliffordSnapshots}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(pepsReconstructedFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: 2D LOCAL REDUCED DENSITY MATRICES EXTRACTED</div>
          </div>
        </div>

        {/* PEPS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PEPS BOND DIM (D)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Virtual Bond Index:</span>
              <span className="text-cyan-400 font-bold">D = {pepsBondDimensionD}</span>
            </div>
            <input
              type="range"
              min={2}
              max={8}
              step={1}
              value={pepsBondDimensionD}
              onChange={(e) => setPepsBondDimensionD(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>2D Projected Entangled Pair States:</strong> Naturally satisfies the 2D entanglement area law by connecting local nodes with virtual entangled pairs!</div>
            <div>• <strong>Efficient Classical Shadow Inversion:</strong> Combines tensor contraction with randomized measurement frames to extract multi-point correlators in logarithmic sampling time!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
