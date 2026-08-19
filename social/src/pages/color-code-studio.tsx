import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Hexagon
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ColorCodeStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [codeDistanceD, setCodeDistanceD] = useState(3); // d = 3 color code (7 data qubits, 3 face plaquettes)
  const [transversalGate, setTransversalGate] = useState<'Hadamard_H' | 'Phase_S' | 'Transversal_CNOT'>('Hadamard_H');
  const [isApplyingGate, setIsApplyingGate] = useState(false);
  const [logicalFidelity, setLogicalFidelity] = useState(0.9994);

  const animFrameRef = useRef<number | null>(null);

  const triggerTransversalGate = () => {
    uiaudio.warp();
    setIsApplyingGate(true);

    setTimeout(() => {
      setIsApplyingGate(false);
      setLogicalFidelity(0.9999);
      uiaudio.success();
    }, 700);
  };

  const handleReset = () => {
    uiaudio.click();
    setLogicalFidelity(0.9994);
    setIsApplyingGate(false);
  };

  // 2D 3-Colorable Triangular Color Code Lattice Canvas
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

      // Draw 3 Colored Triangular / Hexagonal Plaquette Faces (Red, Green, Blue)
      // Red Plaquette (Top)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 110); ctx.lineTo(cx - 70, cy); ctx.lineTo(cx + 70, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Green Plaquette (Bottom Left)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(cx - 70, cy); ctx.lineTo(cx - 140, cy + 110); ctx.lineTo(cx, cy + 110);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blue Plaquette (Bottom Right)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cx + 70, cy); ctx.lineTo(cx, cy + 110); ctx.lineTo(cx + 140, cy + 110);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw 7 Physical Data Qubits at Triangular Vertices
      const vertices = [
        { x: cx, y: cy - 110 },
        { x: cx - 70, y: cy },
        { x: cx + 70, y: cy },
        { x: cx - 140, y: cy + 110 },
        { x: cx, y: cy + 110 },
        { x: cx + 140, y: cy + 110 },
        { x: cx, y: cy - 20 },
      ];

      vertices.forEach((v, idx) => {
        ctx.fillStyle = isApplyingGate ? '#ec4899' : '#ffffff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isApplyingGate ? 15 : 4;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `COLOR CODE [[7,1,3]]: TRANSVERSAL ${transversalGate.toUpperCase()} (FIDELITY = ${(logicalFidelity * 100).toFixed(2)}%)`,
        80,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [codeDistanceD, transversalGate, logicalFidelity, isApplyingGate]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Hexagon className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                COLOR CODE // 2D 3-COLORABLE TRANSVERSAL CLIFFORD GATES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                BOMBIN & MARTIN-DELGADO
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3-Colorable planar lattice & full transversal Clifford group (H, S, CNOT) for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerTransversalGate}
            disabled={isApplyingGate}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isApplyingGate ? 'APPLYING TRANSVERSAL GATE...' : `APPLY TRANSVERSAL ${transversalGate.toUpperCase()}`}</span>
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
              <span className="text-cyan-400 font-bold">GATE: {transversalGate}</span>
              <span className="text-pink-400 font-bold">TOPOLOGY: 3-COLORABLE 2D</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(logicalFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: ENTIRE CLIFFORD GROUP TRANSVERSAL (ZERO DISTILLATION)</div>
          </div>
        </div>

        {/* Color Code Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TRANSVERSAL OPERATION
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setTransversalGate('Hadamard_H');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                transversalGate === 'Hadamard_H' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Hadamard Gate (H)</div>
              <div className="text-[10px] text-zinc-400">Transversal bit/phase exchange</div>
            </button>

            <button
              onClick={() => {
                setTransversalGate('Phase_S');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                transversalGate === 'Phase_S' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Phase Gate (S)</div>
              <div className="text-[10px] text-zinc-400">Transversal π/2 phase rotation</div>
            </button>

            <button
              onClick={() => {
                setTransversalGate('Transversal_CNOT');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                transversalGate === 'Transversal_CNOT' ? "bg-emerald-500/20 border-emerald-400 text-emerald-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Logical CNOT Gate</div>
              <div className="text-[10px] text-zinc-400">Transversal pairwise 2-qubit entangler</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Full Clifford Transversality:</strong> Unlike Surface Codes where Hadamard requires lattice surgery, Color Codes implement H, S, and CNOT purely bitwise across physical qubits!</div>
            <div>• <strong>3-Colorable Geometry:</strong> Each plaquette face hosts both X-type and Z-type multi-qubit stabilizer generators on the exact same qubits!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
