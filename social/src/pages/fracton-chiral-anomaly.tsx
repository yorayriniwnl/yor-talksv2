import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonChiralAnomaly() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [axionAngleThetaPi, setAxionAngleThetaPi] = useState(1.0); // θ = 1.0 π axion topological angle
  const [tensorElectricFieldEij, setTensorElectricFieldEij] = useState(4.5); // E_ij = 4.5 tensor field
  const [isActivatingAnomaly, setIsActivatingAnomaly] = useState(false);
  const [topologicalAxionFidelity, setTopologicalAxionFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerChiralAnomalyActivation = () => {
    uiaudio.warp();
    setIsActivatingAnomaly(true);

    setTimeout(() => {
      setIsActivatingAnomaly(false);
      setTopologicalAxionFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Higher-Rank Fracton Chiral Anomaly & Axion Canvas
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

      // Higher-Rank Axion Tensor Field Vectors E_ij, B_ij (Left: 80 to 260)
      const numLines = 5;
      for (let l = 0; l < numLines; l++) {
        const ly = cy - 40 + l * 20;

        // Tensor Electric Field E_ij (Pink)
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, ly); ctx.lineTo(240, ly);
        ctx.stroke();

        // Magnetic Flux Vortices B_ij (Cyan Circles along lines)
        const bx = 100 + ((time * 25 + l * 40) % 130);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, ly, 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Induced Fractionalized Witten Charge at Center of Anomaly
      const isInduced = isActivatingAnomaly || topologicalAxionFidelity > 0.99;
      ctx.fillStyle = isInduced ? '#f59e0b' : '#334155';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isInduced ? 20 : 0;
      ctx.beginPath();
      ctx.arc(160, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('q=θ/2π', 142, cy + 2.5);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('RANK-2 AXION FIELD θ E_{ij} B_{ij}', 70, cy + 90);

      // Higher-Rank Anomaly Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isActivatingAnomaly ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CHIRAL ANOMALY', 320, cy - 12);
      ctx.fillText('∂_μ j^μ_5 = θ E·B', 315, cy + 8);

      // Topological Charge Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isActivatingAnomaly ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('HIGHER-RANK WITTEN EFFECT', 482, cy - 35);
      ctx.fillText('FRACTIONAL ELECTRIC MONOPOLE', 480, cy - 10);
      ctx.fillText(`AXION FIDELITY = ${(topologicalAxionFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON CHIRAL ANOMALY: AXION ANGLE θ = ${axionAngleThetaPi.toFixed(2)} π | FIELD E_ij = ${tensorElectricFieldEij} | FIDELITY = ${(topologicalAxionFidelity * 100).toFixed(2)}% (SEIBERG & PRETKO)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [axionAngleThetaPi, tensorElectricFieldEij, topologicalAxionFidelity, isActivatingAnomaly]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                FRACTON CHIRAL ANOMALY // RANK-2 AXION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                SEIBERG, PRETKO & RADZIHOVSKY (PRINCETON IAS & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Higher-rank tensor axion electrodynamics & fractional Witten effect for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerChiralAnomalyActivation}
            disabled={isActivatingAnomaly}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isActivatingAnomaly ? 'ACTIVATING CHIRAL ANOMALY...' : 'ACTIVATE HIGHER-RANK AXION'}</span>
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
              <span className="text-pink-400 font-bold">AXION ANGLE: θ = {axionAngleThetaPi.toFixed(2)} π</span>
              <span className="text-cyan-400 font-bold">FIELD: E_ij = {tensorElectricFieldEij}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(topologicalAxionFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: HIGHER-RANK WITTEN CHARGE INDUCTION CONFINED</div>
          </div>
        </div>

        {/* Anomaly Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              AXION ANGLE (θ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Topological Theta:</span>
              <span className="text-pink-400 font-bold">{axionAngleThetaPi.toFixed(2)} π</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={2.0}
              step={0.1}
              value={axionAngleThetaPi}
              onChange={(e) => setAxionAngleThetaPi(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Higher-Rank Witten Effect:</strong> In rank-2 tensor electrodynamics, magnetic flux lines induce fractional electric charges on sub-dimensional fracton defects proportional to the axion angle $\theta / 2\pi$!</div>
            <div>• <strong>Topological Tensor Invariant:</strong> The non-vanishing divergence of the axial current ($\partial_\mu j^\mu_5 \propto \theta \, E_{ij} B_{ij}$) protects dissipationless chiral transport in 3D quantum elasticity!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
