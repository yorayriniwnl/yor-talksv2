import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Maximize2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonGaugedDisclination() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gaugedFrankAngleDeg, setGaugedFrankAngleDeg] = useState(60); // 60-degree disclination wedge
  const [topologicalHolonomyFidelity, setTopologicalHolonomyFidelity] = useState(0.988);
  const [isGaugingFrankVector, setIsGaugingFrankVector] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerFrankGauging = () => {
    uiaudio.warp();
    setIsGaugingFrankVector(true);

    setTimeout(() => {
      setIsGaugingFrankVector(false);
      setTopologicalHolonomyFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Gauged Frank Vector Disclination Canvas
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

      // Gauged Disclination Triangular / Hexagonal Lattice (Left: 80 to 260)
      const numRings = 4;
      const originX = 160;
      const originY = cy;

      // Hexagonal Lattice Spokes
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;

      for (let r = 1; r <= numRings; r++) {
        const radius = r * 22;
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const ang = (s * Math.PI) / 3 + time * 0.5;
          const px = originX + Math.cos(ang) * radius;
          const py = originY + Math.sin(ang) * radius;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Gauged Frank Vector 5-Fold / 7-Fold Disclination Core (at 160, cy)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isGaugingFrankVector ? 24 : 10;
      ctx.beginPath();
      ctx.arc(originX, originY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Ω_z', originX - 5, originY + 2.5);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('GAUGED FRANK DISCLINATION', 80, cy + 90);

      // Holonomy Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isGaugingFrankVector ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('GAUGE HOLONOMY', 320, cy - 12);
      ctx.fillText('∮ A_ij dx^j = Ω_Frank', 310, cy + 8);

      // Non-Abelian Topological Entanglement Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isGaugingFrankVector ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NON-ABELIAN HOLONOMY', 486, cy - 35);
      ctx.fillText('FRACTIONALIZED CHARGE', 484, cy - 10);
      ctx.fillText(`HOLONOMY FIDELITY = ${(topologicalHolonomyFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `GAUGED DISCLINATION: FRANK ANGLE = ${gaugedFrankAngleDeg}° | HOLONOMY FIDELITY = ${(topologicalHolonomyFidelity * 100).toFixed(2)}% (RADZIHOVSKY & VISHWANATH)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gaugedFrankAngleDeg, topologicalHolonomyFidelity, isGaugingFrankVector]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Maximize2 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                GAUGED DISCLINATION // NON-ABELIAN HOLONOMY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                RADZIHOVSKY, PRETKO & VISHWANATH (HARVARD & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Higher-rank dynamically gauged Frank vector disclinations & non-Abelian holonomy for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFrankGauging}
            disabled={isGaugingFrankVector}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isGaugingFrankVector ? 'COMPUTING HOLONOMY...' : 'GAUGE FRANK VECTOR'}</span>
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
              <span className="text-pink-400 font-bold">FRANK ANGLE: {gaugedFrankAngleDeg}°</span>
              <span className="text-cyan-400 font-bold">GAUGE: RANK-2 SU(2)</span>
              <span className="text-emerald-400 font-bold">HOLONOMY: {(topologicalHolonomyFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: DYNAMICALLY GAUGED FRANK HOLONOMY STABILIZED</div>
          </div>
        </div>

        {/* Disclination Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              FRANK ANGLE (Ω)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Wedge Angle:</span>
              <span className="text-cyan-400 font-bold">{gaugedFrankAngleDeg}°</span>
            </div>
            <input
              type="range"
              min={30}
              max={120}
              step={15}
              value={gaugedFrankAngleDeg}
              onChange={(e) => setGaugedFrankAngleDeg(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dynamically Gauged Rotational Defects:</strong> Gauging Frank vectors transforms crystal disclinations into localized non-Abelian gauge flux vortices!</div>
            <div>• <strong>Topological Holonomy Invariant:</strong> Parallel transporting fracton dipoles around a gauged disclination core produces a discrete non-Abelian geometric phase rotation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
