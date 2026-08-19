import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Thermometer
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonGravitationalAnomaly() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [chiralCentralChargeC, setChiralCentralChargeC] = useState(1.5); // c = 1.5 chiral central charge
  const [hallViscosityEtaH, setHallViscosityEtaH] = useState(3.8); // η_H = 3.8 Hall viscosity
  const [isActivatingGravAnomaly, setIsActivatingGravAnomaly] = useState(false);
  const [gravitationalAnomalyFidelity, setGravitationalAnomalyFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerGravAnomalyActivation = () => {
    uiaudio.warp();
    setIsActivatingGravAnomaly(true);

    setTimeout(() => {
      setIsActivatingGravAnomaly(false);
      setGravitationalAnomalyFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Higher-Rank Gravitational Anomaly & Hall Viscosity Canvas
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

      // Quantized Chiral Thermal Edge Currents (Left: 80 to 260)
      const numRings = 4;
      for (let r = 0; r < numRings; r++) {
        const rad = 25 + r * 18;
        ctx.strokeStyle = r % 2 === 0 ? 'rgba(236, 72, 153, 0.4)' : 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(170, cy, rad, 0, Math.PI * 2);
        ctx.stroke();

        // Chiral Flowing Phonon Mode along Boundary
        const angle = time * 2 * (r % 2 === 0 ? 1 : -1) + r;
        const px = 170 + Math.cos(angle) * rad;
        const py = cy + Math.sin(angle) * rad;

        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('QUANTIZED HALL VISCOSITY η_H', 75, cy + 90);

      // Higher-Rank Gravitational Anomaly Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isActivatingGravAnomaly ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('GRAV ANOMALY', 324, cy - 12);
      ctx.fillText('κ_xy = c/12 π² k_B² T', 315, cy + 8);

      // Dissipationless Boundary Layer Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isActivatingGravAnomaly ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CHIRAL THERMAL HALL FLUX', 484, cy - 35);
      ctx.fillText('DISSIPATIONLESS VISCOSITY', 482, cy - 10);
      ctx.fillText(`ANOMALY FIDELITY = ${(gravitationalAnomalyFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON GRAV ANOMALY: CENTRAL CHARGE c = ${chiralCentralChargeC.toFixed(1)} | VISCOSITY η_H = ${hallViscosityEtaH} | FIDELITY = ${(gravitationalAnomalyFidelity * 100).toFixed(2)}% (READ & PRETKO)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [chiralCentralChargeC, hallViscosityEtaH, gravitationalAnomalyFidelity, isActivatingGravAnomaly]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Thermometer className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                FRACTON GRAVITATIONAL ANOMALY // HALL VISCOSITY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                READ, PRETKO & RADZIHOVSKY (YALE & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Higher-rank gravitational Chern-Simons anomaly & thermal Hall transport for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerGravAnomalyActivation}
            disabled={isActivatingGravAnomaly}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isActivatingGravAnomaly ? 'ACTIVATING GRAV ANOMALY...' : 'ACTIVATE THERMAL ANOMALY'}</span>
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
              <span className="text-pink-400 font-bold">CENTRAL CHARGE: c = {chiralCentralChargeC.toFixed(1)}</span>
              <span className="text-cyan-400 font-bold">HALL VISCOSITY: η_H = {hallViscosityEtaH}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(gravitationalAnomalyFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: QUANTIZED THERMAL CHIRAL BOUNDARY FLOW COMPLETE</div>
          </div>
        </div>

        {/* Gravitational Anomaly Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CENTRAL CHARGE (c)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Chiral Central Charge:</span>
              <span className="text-pink-400 font-bold">c = {chiralCentralChargeC.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={4.0}
              step={0.5}
              value={chiralCentralChargeC}
              onChange={(e) => {
                const val = Number(e.target.value);
                setChiralCentralChargeC(val);
                setHallViscosityEtaH(Number((val * 2.53).toFixed(1)));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Higher-Rank Gravitational Chern-Simons:</strong> Curvature strain couplings generate quantized thermal Hall conductance proportional to the central charge c, transporting heat with zero electrical charge dissipation!</div>
            <div>• <strong>Hall Viscosity eta_H:</strong> The dissipationless antisymmetric part of the rank-4 elasticity tensor shields immobile fractons from bulk acoustic phonons!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
