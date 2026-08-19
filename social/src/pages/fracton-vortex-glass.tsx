import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonVortexGlass() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [vortexGlassPinningPotentialV, setVortexGlassPinningPotentialV] = useState(2.4); // V = 2.4 pinning potential
  const [higherRankTensorRankR, setHigherRankTensorRankR] = useState(2); // Rank-2 tensor gauge theory
  const [isFormingGlassLattice, setIsFormingGlassLattice] = useState(false);
  const [vortexGlassFidelity, setVortexGlassFidelity] = useState(0.987);

  const animFrameRef = useRef<number | null>(null);

  const triggerVortexGlassTransition = () => {
    uiaudio.warp();
    setIsFormingGlassLattice(true);

    setTimeout(() => {
      setIsFormingGlassLattice(false);
      setVortexGlassFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton Disclination Clumping & Superconducting Vortex Glass Canvas
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

      // Superconducting Fracton Vortex Lattice (Left: 80 to 260)
      const cols = 4;
      const rows = 4;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const px = 100 + c * 42 + (isFormingGlassLattice ? 0 : Math.sin(time + c * r) * 6);
          const py = cy - 65 + r * 42 + (isFormingGlassLattice ? 0 : Math.cos(time - c * r) * 6);

          // Vortex Core (Cyan/Pink)
          ctx.fillStyle = isFormingGlassLattice ? '#06b6d4' : '#ec4899';
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();

          // Magnetic Flux Quantum Ring
          ctx.strokeStyle = isFormingGlassLattice ? '#22c55e' : '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isFormingGlassLattice ? 'PINNED VORTEX GLASS' : 'DISCLINATION VORTEX LIQUID', 90, cy + 90);

      // Superconducting Fracton Duality Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isFormingGlassLattice ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('VORTEX GLASS', 328, cy - 12);
      ctx.fillText('FRACTON DUALITY', 320, cy + 8);

      // Glass Phase Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isFormingGlassLattice ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SUPER-RESISTIVE GLASS', 488, cy - 35);
      ctx.fillText('SUB-DIMENSIONAL FREEZING', 484, cy - 10);
      ctx.fillText(`GLASS FIDELITY = ${(vortexGlassFidelity * 100).toFixed(2)}%`, 490, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON VORTEX GLASS: PINNING V = ${vortexGlassPinningPotentialV} | TENSOR RANK = ${higherRankTensorRankR} | FIDELITY = ${(vortexGlassFidelity * 100).toFixed(2)}% (PRETKO & BARKESHLI)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [vortexGlassPinningPotentialV, higherRankTensorRankR, vortexGlassFidelity, isFormingGlassLattice]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Orbit className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-indigo-400">
                FRACTON VORTEX GLASS // PINNED LATTICE DUALITY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PRETKO, RADZIHOVSKY & BARKESHLI (CU BOULDER & UMD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Superconducting fracton vortex clumping & higher-rank glass transitions for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerVortexGlassTransition}
            disabled={isFormingGlassLattice}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isFormingGlassLattice ? 'PINNING FRACTON VORTICES...' : 'FREEZE INTO VORTEX GLASS'}</span>
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
              <span className="text-emerald-400 font-bold">PINNING POTENTIAL: V = {vortexGlassPinningPotentialV}</span>
              <span className="text-cyan-400 font-bold">TENSOR RANK: {higherRankTensorRankR}</span>
              <span className="text-pink-400 font-bold">FIDELITY: {(vortexGlassFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: SUB-DIMENSIONAL VORTEX PINNING CONFINED</div>
          </div>
        </div>

        {/* Glass Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PINNING POTENTIAL (V)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Disorder Strength:</span>
              <span className="text-emerald-400 font-bold">V = {vortexGlassPinningPotentialV}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.1}
              value={vortexGlassPinningPotentialV}
              onChange={(e) => setVortexGlassPinningPotentialV(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Superconducting Fracton Duality:</strong> In dual elasticity descriptions, superconducting vortices map onto immobile 0D disclination fracton charges!</div>
            <div>• <strong>Glassy Sub-Dimensional Freezing:</strong> Random pinning potentials clump vortices into a robust non-ergodic vortex glass phase with vanishing linear DC dissipation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
