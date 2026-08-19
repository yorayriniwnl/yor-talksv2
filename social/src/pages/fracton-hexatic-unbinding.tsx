import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonHexaticUnbinding() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hexaticTemperatureT, setHexaticTemperatureT] = useState(1.4); // T = 1.4 melting temperature
  const [burgersVectorMagnitudeB, setBurgersVectorMagnitudeB] = useState(1); // |b| = 1 Burgers vector
  const [isUnbindingDipoles, setIsUnbindingDipoles] = useState(false);
  const [hexaticOrderFidelity, setHexaticOrderFidelity] = useState(0.986);

  const animFrameRef = useRef<number | null>(null);

  const triggerDislocationUnbinding = () => {
    uiaudio.warp();
    setIsUnbindingDipoles(true);

    setTimeout(() => {
      setIsUnbindingDipoles(false);
      setHexaticOrderFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton Elasticity Hexatic-to-Isotropic Melting Canvas
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

      // Unbinding Dislocation Dipole Pairs (Left: 80 to 260)
      const numPairs = 4;
      for (let p = 0; p < numPairs; p++) {
        const py = cy - 60 + p * 40;
        const separation = isUnbindingDipoles ? 45 : 16;

        // Dislocation Vector (+b) (Pink)
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(170 - separation, py, 6, 0, Math.PI * 2);
        ctx.fill();

        // Dislocation Vector (-b) (Cyan)
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(170 + separation, py, 6, 0, Math.PI * 2);
        ctx.fill();

        // Dipole Coupling Spring
        ctx.strokeStyle = isUnbindingDipoles ? 'rgba(239, 68, 68, 0.4)' : '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(170 - separation, py);
        ctx.lineTo(170 + separation, py);
        ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isUnbindingDipoles ? 'FREE UNBOUND DISLOCATIONS' : 'BOUND DISLOCATION DIPOLES', 95, cy + 90);

      // Fracton Elasticity Dual Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isUnbindingDipoles ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2-STEP MELTING', 324, cy - 12);
      ctx.fillText('HEXATIC → LIQUID', 318, cy + 8);

      // Phase Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isUnbindingDipoles ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('ISOTROPIC FLUID DUALITY', 484, cy - 35);
      ctx.fillText('FINITE BURGERS DENSITY', 486, cy - 10);
      ctx.fillText(`PHASE FIDELITY = ${(hexaticOrderFidelity * 100).toFixed(2)}%`, 490, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DISLOCATION UNBINDING: TEMP T = ${hexaticTemperatureT} | BURGERS |b| = ${burgersVectorMagnitudeB} | FIDELITY = ${(hexaticOrderFidelity * 100).toFixed(2)}% (PRETKOW & RADZIHOVSKY)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hexaticTemperatureT, burgersVectorMagnitudeB, hexaticOrderFidelity, isUnbindingDipoles]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-pink-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Orbit className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                HEXATIC UNBINDING // DISLOCATION DUALITY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                PRETKO, RADZIHOVSKY & HALPERIN (CU BOULDER & HARVARD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rank-2 tensor gauge theory & 2-step hexatic-to-isotropic melting for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerDislocationUnbinding}
            disabled={isUnbindingDipoles}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isUnbindingDipoles ? 'UNBINDING DISLOCATION PAIRS...' : 'TRIGGER 2ND-STAGE MELTING'}</span>
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
              <span className="text-amber-400 font-bold">TEMP: T = {hexaticTemperatureT}</span>
              <span className="text-pink-400 font-bold">BURGERS VECTOR: |b| = {burgersVectorMagnitudeB}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(hexaticOrderFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: SECONDARY BKT DISLOCATION MELTING MONITORED</div>
          </div>
        </div>

        {/* Fracton Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TEMPERATURE (T)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Thermal Melting:</span>
              <span className="text-amber-400 font-bold">T = {hexaticTemperatureT}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.1}
              value={hexaticTemperatureT}
              onChange={(e) => setHexaticTemperatureT(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Two-Step Melting Mechanism:</strong> Solid melting occurs first via disclination dipole unbinding into a hexatic liquid, followed by dislocation dipole unbinding into an isotropic fluid!</div>
            <div>• <strong>Higher-Rank Gauge Duality:</strong> Isolated free dislocations act as mobile vector gauge charges, destroying orientational bond order while restoring continuous Euclidean rotational symmetry!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
