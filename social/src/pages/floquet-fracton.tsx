import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Repeat
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FloquetFracton() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [drivingFrequencyOmega, setDrivingFrequencyOmega] = useState(14.5); // 14.5 GHz high-frequency driving
  const [stroboscopicStepIndex, setStroboscopicStepIndex] = useState(1); // 1 to 4 Floquet unitary steps
  const [isDriving, setIsDriving] = useState(false);
  const [floquetQuasiEnergyGap, setFloquetQuasiEnergyGap] = useState(0.88); // 0.88 pi quasi-energy gap

  const animFrameRef = useRef<number | null>(null);

  const triggerFloquetStroboscope = () => {
    uiaudio.warp();
    setIsDriving(true);

    setTimeout(() => {
      setIsDriving(false);
      setFloquetQuasiEnergyGap(0.96);
      uiaudio.success();
    }, 750);
  };

  // 3D Driven Floquet Fracton Subsystem Lattice Canvas
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

      // Stroboscopic Floquet Step Phase (Rotates dynamically)
      const phase = (time * (drivingFrequencyOmega / 10)) % (Math.PI * 2);

      // Draw 3D Cubic Foliated Subsystem Lattice
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            const px = cx + (x * 45 - y * 45) * Math.cos(phase * 0.25);
            const py = cy + (x * 22 + y * 22) - z * 35;

            // Stroboscopically Pulsed Site
            ctx.fillStyle = (x + y + z) % 2 === 0 ? '#38bdf8' : '#ec4899';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw Anomalous Chiral Edge Currents (Circulating along boundary)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isDriving ? 24 : 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 140, 75, phase * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FLOQUET FRACTON TOPOLOGY: ω = ${drivingFrequencyOmega} GHz | QUASI-ENERGY GAP Δ = ${floquetQuasiEnergyGap}π | STROBOSCOPIC STEP: U_F(T)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [drivingFrequencyOmega, stroboscopicStepIndex, floquetQuasiEnergyGap, isDriving]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Repeat className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-indigo-300 to-pink-400">
                FLOQUET FRACTONS // STROBOSCOPIC DRIVEN TOPOLOGICAL ORDER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                PO & VISHWANATH (HARVARD & UC BERKELEY)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Out-of-equilibrium quasi-energy protection & chiral edge fracton currents for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFloquetStroboscope}
            disabled={isDriving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDriving ? 'DRIVING STROBOSCOPIC CYCLE...' : 'APPLY FLOQUET DRIVE CYCLE'}</span>
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
              <span className="text-amber-400 font-bold">DRIVE: {drivingFrequencyOmega} GHz</span>
              <span className="text-cyan-400 font-bold">QUASI-ENERGY GAP: {floquetQuasiEnergyGap}π</span>
              <span className="text-emerald-400 font-bold">MODE: CHIRAL EDGE CURRENT</span>
            </div>
            <div>STATUS: NON-THERMALIZING TIME-PERIODIC REGIME ACTIVE</div>
          </div>
        </div>

        {/* Floquet Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DRIVE FREQUENCY (ω)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Microwave Driving:</span>
              <span className="text-amber-400 font-bold">{drivingFrequencyOmega} GHz</span>
            </div>
            <input
              type="range"
              min={5.0}
              max={30.0}
              step={0.5}
              value={drivingFrequencyOmega}
              onChange={(e) => setDrivingFrequencyOmega(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Anomalous Floquet Phases:</strong> Periodic time-dependent driving generates topological phases with chiral surface modes having no static equilibrium analog!</div>
            <div>• <strong>Heating Suppression:</strong> Subsystem fracton conservation laws dynamically arrest thermalization, preserving topological quantum memory indefinitely!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
