import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonAxialGravitational() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [temperatureSquaredCoeff, setTemperatureSquaredCoeff] = useState(1.2); // T^2 mixed anomaly coefficient
  const [magneticVortexDensity, setMagneticVortexDensity] = useState(4.2); // B_ij magnetic vortex density
  const [isActivatingMixedAnomaly, setIsActivatingMixedAnomaly] = useState(false);
  const [mixedAnomalyFidelity, setMixedAnomalyFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerMixedAnomalyActivation = () => {
    uiaudio.warp();
    setIsActivatingMixedAnomaly(true);

    setTimeout(() => {
      setIsActivatingMixedAnomaly(false);
      setMixedAnomalyFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Mixed Axial-Gravitational Anomaly Canvas
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

      // Chiral Magnetic Vortex Filaments along Fracton Dislocation Lines (Left: 80 to 260)
      const numFilaments = 4;
      for (let f = 0; f < numFilaments; f++) {
        const fy = cy - 35 + f * 24;

        // Dislocation Core (Blue)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(80, fy); ctx.lineTo(240, fy);
        ctx.stroke();

        // Helical Chiral Current Vortices along Core (Pink Spiral)
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 80; x <= 240; x += 4) {
          const phase = (x / 14) + time * 3 + f;
          const y = fy + Math.sin(phase) * 8;
          if (x === 80) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CHIRAL MAGNETIC VORTICES', 88, cy + 90);

      // Mixed Anomaly Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isActivatingMixedAnomaly ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('MIXED ANOMALY', 324, cy - 12);
      ctx.fillText('∇_i j^i_5 = T²/12 R∧R', 315, cy + 8);

      // Dissipationless Dislocation Transport Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isActivatingMixedAnomaly ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('THERMAL CHIRAL VORTEX', 492, cy - 35);
      ctx.fillText('DISLOCATION CONFINED FLOW', 482, cy - 10);
      ctx.fillText(`ANOMALY FIDELITY = ${(mixedAnomalyFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `MIXED ANOMALY: T^2 COEFF = ${temperatureSquaredCoeff.toFixed(1)} | VORTEX B_ij = ${magneticVortexDensity} | FIDELITY = ${(mixedAnomalyFidelity * 100).toFixed(2)}% (LANDSTEINER & PRETKO)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [temperatureSquaredCoeff, magneticVortexDensity, mixedAnomalyFidelity, isActivatingMixedAnomaly]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Compass className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                FRACTON MIXED ANOMALY // CHIRAL VORTICES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                LANDSTEINER, PRETKO & RADZIHOVSKY (UAM & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Higher-rank mixed axial-gravitational anomaly & dislocation vortex flow for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMixedAnomalyActivation}
            disabled={isActivatingMixedAnomaly}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isActivatingMixedAnomaly ? 'ACTIVATING MIXED ANOMALY...' : 'ACTIVATE MIXED ANOMALY'}</span>
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
              <span className="text-pink-400 font-bold">T^2 COEFF: {temperatureSquaredCoeff.toFixed(1)}</span>
              <span className="text-cyan-400 font-bold">VORTEX: B_ij = {magneticVortexDensity}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(mixedAnomalyFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: DISLOCATION LINEON CHIRAL VORTEX FLOW STABILIZED</div>
          </div>
        </div>

        {/* Mixed Anomaly Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TEMPERATURE COEFF (T^2)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Thermal Anomaly:</span>
              <span className="text-pink-400 font-bold">T^2 = {temperatureSquaredCoeff.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={3.0}
              step={0.2}
              value={temperatureSquaredCoeff}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTemperatureSquaredCoeff(val);
                setMagneticVortexDensity(Number((val * 3.5).toFixed(1)));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Mixed Thermal-Gauge Anomaly:</strong> Temperature gradients combined with tensor magnetic fields induce dissipationless chiral axial currents along crystal dislocation lines!</div>
            <div>• <strong>Dislocation Trapped Lineons:</strong> Chiral magnetic vortices transport fractionalized lineons with zero backscattering, forming 1D ballistic quantum interconnects!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
