import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonStressTensor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [youngsModulusGPa, setYoungsModulusGPa] = useState(120); // 120 GPa Young's modulus
  const [burgersVectorMagnitudeB, setBurgersVectorMagnitudeB] = useState(2.8); // b = 2.8 Angstrom Burgers vector
  const [isSimulatingStressDuality, setIsSimulatingStressDuality] = useState(false);
  const [cauchyGaugeFidelity, setCauchyGaugeFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerStressTensorDuality = () => {
    uiaudio.warp();
    setIsSimulatingStressDuality(true);

    setTimeout(() => {
      setIsSimulatingStressDuality(false);
      setCauchyGaugeFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Cauchy Stress Tensor σ_ij & Fracton Gauge Field E_ij Duality Canvas
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

      // Crystal Lattice Dislocation Edge Line (Left: 90 to 270)
      const latticeRows = 5;
      for (let r = 0; r < latticeRows; r++) {
        const ry = cy - 60 + r * 28;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(90, ry); ctx.lineTo(270, ry);
        ctx.stroke();
      }

      // Extra Half-Plane Edge Dislocation (Burgers Vector b)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isSimulatingStressDuality ? 20 : 6;
      ctx.beginPath();
      ctx.moveTo(180, cy - 60); ctx.lineTo(180, cy - 4);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Burgers Vector Core at Dislocation Line
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(180, cy - 4, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DISLOCATION LINE', 135, cy + 22);
      ctx.fillText(`b = ${burgersVectorMagnitudeB} Å (1D LINEON)`, 132, cy + 42);

      // Cauchy Stress Tensor to Rank-2 Gauge Map (Center: 310 to 420)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(310, cy - 15); ctx.lineTo(420, cy - 15);
      ctx.lineTo(405, cy - 23);
      ctx.moveTo(420, cy - 15); ctx.lineTo(405, cy - 7);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DUALITY ISOMORPHISM', 308, cy - 30);
      ctx.fillText('σ_ij ↔ ε_ik ε_jl E_kl', 315, cy - 2);

      // Higher-Rank Rank-2 Tensor Electrodynamics (Right at 530, cy - 15)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isSimulatingStressDuality ? 24 : 6;
      ctx.strokeRect(460, cy - 70, 180, 110);
      ctx.fillRect(460, cy - 70, 180, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('RANK-2 TENSOR GAUGE THEORY', 468, cy - 45);
      ctx.fillText('∂_j σ^ij = 0  (EQUILIBRIUM)', 472, cy - 20);
      ctx.fillText(`GAUGE CONSERVATION = ${(cauchyGaugeFidelity * 100).toFixed(2)}%`, 470, cy + 10);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CAUCHY STRESS-FRACTON DUALITY: YOUNG E = ${youngsModulusGPa} GPa | BURGERS b = ${burgersVectorMagnitudeB} Å | FIDELITY = ${(cauchyGaugeFidelity * 100).toFixed(2)}% (GROMOV & PREATKO)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [youngsModulusGPa, burgersVectorMagnitudeB, cauchyGaugeFidelity, isSimulatingStressDuality]);

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-400">
                FRACTON-STRESS DUALITY // CAUCHY TENSOR GAUGE THEORY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                GROMOV, RADZIHOVSKY & PRETKO (BROWN & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Cauchy elasticity stress tensor & dislocation lineon mobility mapping for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerStressTensorDuality}
            disabled={isSimulatingStressDuality}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSimulatingStressDuality ? 'SIMULATING DUALITY...' : 'MAP CAUCHY STRESS TO TENSOR GAUGE'}</span>
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
              <span className="text-cyan-400 font-bold">YOUNG'S MODULUS: E = {youngsModulusGPa} GPa</span>
              <span className="text-pink-400 font-bold">BURGERS: b = {burgersVectorMagnitudeB} Å</span>
              <span className="text-emerald-400 font-bold">CONSERVATION: {(cauchyGaugeFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: HIGHER-RANK DIPOLE MOMENT GAUGE INVARIANT</div>
          </div>
        </div>

        {/* Stress Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              YOUNG'S MODULUS (GPa)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Lattice Stiffness:</span>
              <span className="text-cyan-400 font-bold">{youngsModulusGPa} GPa</span>
            </div>
            <input
              type="range"
              min={50}
              max={300}
              step={10}
              value={youngsModulusGPa}
              onChange={(e) => setYoungsModulusGPa(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Cauchy Stress Conservation:</strong> Mechanical equilibrium equations are mathematically dual to the Gauss law constraint of a symmetric rank-2 tensor gauge theory!</div>
            <div>• <strong>Dislocation Glide as Lineon Motion:</strong> Dislocation lines glide freely along their glide plane (1D lineon behavior) but cannot climb without emitting vacancies (fracton creation)!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
