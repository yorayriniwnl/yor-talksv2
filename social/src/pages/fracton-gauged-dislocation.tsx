import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, GitFork
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonGaugedDislocation() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [burgersVectorLatticeA, setBurgersVectorLatticeA] = useState(2); // b = 2a lattice displacement
  const [lineonSupercurrentFidelity, setLineonSupercurrentFidelity] = useState(0.988);
  const [isGaugingBurgersVector, setIsGaugingBurgersVector] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerBurgersGauging = () => {
    uiaudio.warp();
    setIsGaugingBurgersVector(true);

    setTimeout(() => {
      setIsGaugingBurgersVector(false);
      setLineonSupercurrentFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Gauged Burgers Vector Dislocation Canvas
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

      // Dislocation Edge Plane (Left: 80 to 260)
      // Top Half Lattice (3 Rows)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;

      for (let r = 0; r < 3; r++) {
        const y = cy - 45 + r * 18;
        ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(240, y); ctx.stroke();
      }

      // Extra Half-Plane Insertion at x=160 (Burgers Vector b = 2a)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(160, cy - 65); ctx.lineTo(160, cy);
      ctx.stroke();

      // Bottom Half Lattice (2 Rows - Mismatched)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      for (let r = 0; r < 2; r++) {
        const y = cy + 18 + r * 22;
        ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(240, y); ctx.stroke();
      }

      // Ballistic Lineon Current Flowing Along Dislocation Line
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isGaugingBurgersVector ? 24 : 10;
      ctx.beginPath();
      ctx.arc(160, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('b=2a', 150, cy + 2.5);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('GAUGED BURGERS DISLOCATION', 75, cy + 90);

      // Gauged Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isGaugingBurgersVector ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('GAUGED BURGERS', 320, cy - 12);
      ctx.fillText('∇_i b^i = j_Lineon', 312, cy + 8);

      // Ballistic Lineon Supercurrent Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isGaugingBurgersVector ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('BALLISTIC SUPERCURRENT', 484, cy - 35);
      ctx.fillText('ZERO BACKSCATTERING FLOW', 480, cy - 10);
      ctx.fillText(`LINEON FIDELITY = ${(lineonSupercurrentFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `GAUGED DISLOCATION: BURGERS b = ${burgersVectorLatticeA}a | LINEON SUPERCURRENT = ${(lineonSupercurrentFidelity * 100).toFixed(2)}% (RADZIHOVSKY & SACHDEV)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [burgersVectorLatticeA, lineonSupercurrentFidelity, isGaugingBurgersVector]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <GitFork className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-400">
                GAUGED DISLOCATION // BALLISTIC LINEON SUPERCURRENTS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                RADZIHOVSKY, PRETKO & SACHDEV (HARVARD & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Higher-rank dynamically gauged Burgers vector dislocations & lineon 1D supercurrents for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerBurgersGauging}
            disabled={isGaugingBurgersVector}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isGaugingBurgersVector ? 'INDUCING SUPERCURRENT...' : 'GAUGE BURGERS VECTOR'}</span>
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
              <span className="text-pink-400 font-bold">BURGERS VECTOR: b = {burgersVectorLatticeA}a</span>
              <span className="text-cyan-400 font-bold">FLOW: 1D LINEON BALLISTIC</span>
              <span className="text-emerald-400 font-bold">SUPERCURRENT: {(lineonSupercurrentFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: ZERO BACKSCATTERING LINEON FLOW STABILIZED</div>
          </div>
        </div>

        {/* Dislocation Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BURGERS VECTOR (b)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Lattice Displacement:</span>
              <span className="text-pink-400 font-bold">b = {burgersVectorLatticeA}a</span>
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={burgersVectorLatticeA}
              onChange={(e) => setBurgersVectorLatticeA(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dynamically Gauged Dislocations:</strong> Gauging lattice translation vectors turns edge dislocations into 1D ballistic waveguides for fracton lineons!</div>
            <div>• <strong>Dissipationless 1D Transport:</strong> Lineon sub-dimensional quasiparticles traverse dislocation lines with zero backscattering, forming fault-tolerant quantum interconnects!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
