import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Box
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RaussendorfLattice() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [latticeDepthL, setLatticeDepthL] = useState(4); // 4x4x4 RHG lattice unit cells
  const [defectLoopType, setDefectLoopType] = useState<'Primal_Loop' | 'Dual_Loop'>('Primal_Loop');
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [faultTolerantFidelity, setFaultTolerantFidelity] = useState(0.9997);

  const animFrameRef = useRef<number | null>(null);

  const trigger3dMeasurementBraiding = () => {
    uiaudio.warp();
    setIsMeasuring(true);

    setTimeout(() => {
      setIsMeasuring(false);
      setFaultTolerantFidelity(0.99992);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setFaultTolerantFidelity(0.9997);
    setIsMeasuring(false);
  };

  // 3D Raussendorf-Harrington-Goyal (RHG) Topological Cluster State Canvas
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

      // Draw 3D Isometric Cubic Wireframe Entangled Cells (4x4)
      const rot = time * 0.3;
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            // 3D Iso projection
            const px = cx + (x * 45 - y * 45) * Math.cos(rot * 0.4);
            const py = cy + (x * 22 + y * 22) - z * 40;

            // Physical Qubit Node
            ctx.fillStyle = isMeasuring ? '#ec4899' : '#06b6d4';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = isMeasuring ? 12 : 3;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Cluster CZ Entanglement Bonds
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + 30, py + 15);
            ctx.stroke();
          }
        }
      }

      // Draw Topological Defect Tube Loop (Center Primal/Dual Loop)
      ctx.strokeStyle = defectLoopType === 'Primal_Loop' ? '#f59e0b' : '#ec4899';
      ctx.lineWidth = 4;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 90, 45, rot, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `RAUSSENDORF 3D CLUSTER: ${defectLoopType.toUpperCase()} BRAIDING | FAULT-TOLERANT FIDELITY = ${(faultTolerantFidelity * 100).toFixed(3)}%`,
        70,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [latticeDepthL, defectLoopType, faultTolerantFidelity, isMeasuring]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Box className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                RAUSSENDORF 3D LATTICE // TOPOLOGICAL CLUSTER STATE QC
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                0.75% FAULT-TOLERANT THRESHOLD (RHG LATTICE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3D cubic cluster state & single-qubit measurement defect braiding for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={trigger3dMeasurementBraiding}
            disabled={isMeasuring}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isMeasuring ? 'MEASURING 3D TOPOLOGICAL DEFECTS...' : 'MEASURE CLUSTER DEFECT BRAID'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
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
              <span className="text-cyan-400 font-bold">LATTICE: {latticeDepthL}x{latticeDepthL}x{latticeDepthL} RHG</span>
              <span className="text-pink-400 font-bold">DEFECT: {defectLoopType}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(faultTolerantFidelity * 100).toFixed(3)}%</span>
            </div>
            <div>STATUS: SINGLE-QUBIT MEASUREMENT COMPUTATION ONLY</div>
          </div>
        </div>

        {/* RHG Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TOPOLOGICAL DEFECT
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setDefectLoopType('Primal_Loop');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                defectLoopType === 'Primal_Loop' ? "bg-amber-500/20 border-amber-400 text-amber-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Primal Defect Loop (Rough)</div>
              <div className="text-[10px] text-zinc-400">Logical X-string operator loop</div>
            </button>

            <button
              onClick={() => {
                setDefectLoopType('Dual_Loop');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                defectLoopType === 'Dual_Loop' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Dual Defect Loop (Smooth)</div>
              <div className="text-[10px] text-zinc-400">Logical Z-string operator loop</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Measurement-Driven Time:</strong> The 3rd spatial dimension of the RHG cluster represents simulated time evolution in standard circuit models!</div>
            <div>• <strong>High Fault-Tolerance Threshold:</strong> The 3D Raussendorf lattice achieves a massive ~0.75% error threshold under realistic depolarizing noise!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
