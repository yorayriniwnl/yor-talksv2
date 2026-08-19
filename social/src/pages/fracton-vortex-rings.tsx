import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Disc
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonVortexRings() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [vortexCirculationQuantumGamma, setVortexCirculationQuantumGamma] = useState(2); // Γ = 2h/m circulation quantum
  const [solitonPropagationVelocityV, setSolitonPropagationVelocityV] = useState(3.6); // v = 3.6 soliton velocity
  const [isPropagatingRings, setIsPropagatingRings] = useState(false);
  const [topologicalVortexFidelity, setTopologicalVortexFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerVortexRingPropagation = () => {
    uiaudio.warp();
    setIsPropagatingRings(true);

    setTimeout(() => {
      setIsPropagatingRings(false);
      setTopologicalVortexFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Higher-Rank Fracton Anisotropic Vortex Rings Canvas
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

      // Solitary Anisotropic Vortex Rings (Left: 80 to 260)
      const numRings = 3;
      for (let r = 0; r < numRings; r++) {
        const rx = 100 + r * 55 + (isPropagatingRings ? (time * solitonPropagationVelocityV * 8) % 160 : 0);
        const ry = cy - 10 + Math.sin(time + r) * 12;

        // Outer Tensor Circulation Sheath
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(rx, ry, 26, 16, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Dipole Condensate Core
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.ellipse(rx, ry, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Velocity Arrow
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rx + 26, ry); ctx.lineTo(rx + 38, ry);
        ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FRACTON ANISOTROPIC VORTEX RINGS', 75, cy + 90);

      // Rank-2 Vortex Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isPropagatingRings ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TENSOR HYDRODYNAMICS', 312, cy - 12);
      ctx.fillText('Γ = 2h/m CIRCULATION', 315, cy + 8);

      // Soliton Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPropagatingRings ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NON-DISPERSIVE SOLITONS', 488, cy - 35);
      ctx.fillText('SUB-DIMENSIONAL CONFINED', 484, cy - 10);
      ctx.fillText(`TOPOLOGICAL FIDELITY = ${(topologicalVortexFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON VORTEX RINGS: QUANTUM Γ = ${vortexCirculationQuantumGamma} h/m | SOLITON VELOCITY = ${solitonPropagationVelocityV} | FIDELITY = ${(topologicalVortexFidelity * 100).toFixed(2)}% (PRETKO & RADZIHOVSKY)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [vortexCirculationQuantumGamma, solitonPropagationVelocityV, topologicalVortexFidelity, isPropagatingRings]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Disc className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                FRACTON VORTEX RINGS // TENSOR HYDRODYNAMICS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PRETKO, RADZIHOVSKY & BARKESHLI (CU BOULDER & UMD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rank-2 tensor hydrodynamics & quantized anisotropic vortex ring solitons for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerVortexRingPropagation}
            disabled={isPropagatingRings}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPropagatingRings ? 'PROPAGATING VORTEX RINGS...' : 'LAUNCH TENSOR VORTEX RINGS'}</span>
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
              <span className="text-cyan-400 font-bold">CIRCULATION: Γ = {vortexCirculationQuantumGamma} h/m</span>
              <span className="text-pink-400 font-bold">VELOCITY: v = {solitonPropagationVelocityV}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(topologicalVortexFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-DISPERSIVE ANISOTROPIC SOLITONS CONFINED</div>
          </div>
        </div>

        {/* Vortex Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PROPAGATION SPEED (v)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Soliton Velocity:</span>
              <span className="text-cyan-400 font-bold">v = {solitonPropagationVelocityV}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={8.0}
              step={0.2}
              value={solitonPropagationVelocityV}
              onChange={(e) => setSolitonPropagationVelocityV(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Rank-2 Tensor Vortices:</strong> Higher-rank gauge conservation laws constrain vortex line reconnections, creating highly stable quantized vortex rings!</div>
            <div>• <strong>Solitary Dipolar Propagation:</strong> Dipolar lineon bound states propagate along specific sub-dimensional directions without radial dispersion!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
