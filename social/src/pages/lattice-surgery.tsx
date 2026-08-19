import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function LatticeSurgery() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [operationState, setOperationState] = useState<'Split_Isolated' | 'Merged_Surgery' | 'Split_Final'>('Split_Isolated');
  const [codeDistanceD, setCodeDistanceD] = useState(3); // d = 3 surface code patches
  const [isOperating, setIsOperating] = useState(false);
  const [logicalFidelity, setLogicalFidelity] = useState(0.999);

  const animFrameRef = useRef<number | null>(null);

  const triggerLatticeSurgery = () => {
    uiaudio.warp();
    setIsOperating(true);

    setTimeout(() => {
      setOperationState('Merged_Surgery');
      uiaudio.click();

      setTimeout(() => {
        setIsOperating(false);
        setOperationState('Split_Final');
        setLogicalFidelity(0.9998);
        uiaudio.success();
      }, 700);
    }, 600);
  };

  const handleReset = () => {
    uiaudio.click();
    setOperationState('Split_Isolated');
    setLogicalFidelity(0.999);
  };

  // Surface Code 2D Planar Patch Lattice Surgery Canvas
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

      // Patch A (Left Logical Qubit Q_A) at 120, cy - 90 (160x180)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.fillRect(120, cy - 90, 160, 180);
      ctx.strokeRect(120, cy - 90, 160, 180);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('LOGICAL Q_A', 150, cy);

      // Patch B (Right Logical Qubit Q_B) at 440, cy - 90 (160x180)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.fillRect(440, cy - 90, 160, 180);
      ctx.strokeRect(440, cy - 90, 160, 180);

      ctx.fillStyle = '#ffffff';
      ctx.fillText('LOGICAL Q_B', 470, cy);

      // Surgery Intermediate Boundary Zone (280 to 440)
      if (operationState === 'Merged_Surgery') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.fillRect(280, cy - 90, 160, 180);
        ctx.strokeRect(280, cy - 90, 160, 180);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('JOINT M_ZZ MEASUREMENT', 285, cy);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `LATTICE SURGERY: ${operationState} | LOGICAL CNOT FIDELITY = ${(logicalFidelity * 100).toFixed(2)}% (d = ${codeDistanceD})`,
        80,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [operationState, codeDistanceD, logicalFidelity, isOperating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Grid className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                SURFACE CODE // LATTICE SURGERY & TOPOLOGICAL LOGICAL CNOT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                HORSMAN & FOWLER (FAULT-TOLERANT QEC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Planar patch merging, splitting & joint multi-qubit parity measurements for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerLatticeSurgery}
            disabled={isOperating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isOperating ? 'PERFORMING LATTICE SURGERY...' : 'EXECUTE LOGICAL CNOT SURGERY'}</span>
          </button>

          {operationState !== 'Split_Isolated' && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
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
              <span className="text-cyan-400 font-bold">STATE: {operationState}</span>
              <span className="text-pink-400 font-bold">CODE DISTANCE: d = {codeDistanceD}</span>
              <span className="text-emerald-400 font-bold">LOGICAL FIDELITY: {(logicalFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: ZERO PHYSICAL QUBIT MOVEMENT REQUIRED</div>
          </div>
        </div>

        {/* Surgery Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SURFACE CODE DISTANCE
          </h3>

          <div className="space-y-2">
            {[3, 5, 7].map((d) => (
              <button
                key={d}
                onClick={() => {
                  setCodeDistanceD(d);
                  uiaudio.click();
                }}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  codeDistanceD === d ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">Distance d = {d} ({2 * d * d - 1} physical qubits)</div>
                <div className="text-[10px] text-zinc-400">Corrects up to {(d - 1) / 2} arbitrary Pauli errors</div>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No Braiding Overhead:</strong> Lattice surgery replaces physical hole braiding with joint stabilizer measurements along the boundaries of planar surface code patches!</div>
            <div>• <strong>Universal Fault-Tolerance:</strong> Enables transversal logical CNOT, teleportation, and magic state injection on 2D nearest-neighbor quantum architectures!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
