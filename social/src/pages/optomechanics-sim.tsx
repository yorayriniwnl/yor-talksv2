import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function OptomechanicsSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [laserDetuningDelta, setLaserDetuningDelta] = useState(-1.0); // Delta = -omega_m (Red-sideband cooling)
  const [opticalPowerMw, setOpticalPowerMw] = useState(15.0); // 15 mW input laser
  const [phononOccupancyN, setPhononOccupancyN] = useState(0.24); // <n> = 0.24 (Quantum ground state cooling!)
  const [coolingActive, setCoolingActive] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerSidebandCooling = () => {
    uiaudio.warp();
    setCoolingActive(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1100);
  };

  const handleReset = () => {
    uiaudio.click();
    setCoolingActive(false);
  };

  // Cavity Quantum Optomechanics & Sideband Cooling Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Cryogenic Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Optical Cavity Mirrors: Fixed Mirror (Left 140)
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fillRect(140, cy - 80, 16, 160);

      // Micro-Mechanical Cantilever / Movable Mirror (Right 480)
      const vibAmp = coolingActive ? 1.5 : 14.0; // Dynamic backaction damping
      const oscX = 480 + Math.sin(time * 2.5) * vibAmp;

      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 12;
      ctx.fillRect(oscX, cy - 70, 14, 140);
      ctx.shadowBlur = 0;

      // Cantilever Flexible Support Arm
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(oscX + 7, cy - 70); ctx.lineTo(oscX + 7, cy - 140);
      ctx.stroke();

      // Intra-Cavity Trapped Optical Laser Field (Standing Wave)
      const beamGrad = ctx.createLinearGradient(156, cy, oscX, cy);
      beamGrad.addColorStop(0, '#38bdf8');
      beamGrad.addColorStop(0.5, '#ffffff');
      beamGrad.addColorStop(1, '#ec4899');
      ctx.fillStyle = beamGrad;

      for (let x = 156; x <= oscX; x += 18) {
        const h = Math.abs(Math.sin((x - 156) * 0.08 + time * 4)) * 40;
        ctx.fillRect(x, cy - h / 2, 8, h);
      }

      // Phonon Energy State Diagram (Bottom Left)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      for (let n = 0; n <= 4; n++) {
        const ly = cy + 140 - n * 18;
        ctx.beginPath();
        ctx.moveTo(60, ly); ctx.lineTo(160, ly);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.fillText(`|n = ${n}⟩`, 165, ly + 3);
      }

      // Current Thermal State Blob
      const targetLevel = coolingActive ? 0 : 3;
      ctx.fillStyle = coolingActive ? '#22c55e' : '#ef4444';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(110, cy + 140 - targetLevel * 18, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (coolingActive) {
        ctx.fillText('RED-SIDEBAND DYNAMIC BACKACTION: ⟨n⟩ = 0.24 PHONONS (GROUND STATE)', 200, cy + 120);
      } else {
        ctx.fillText('THERMAL BROWNIAN MOTION ACTIVE (T = 300 mK)', 240, cy + 120);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [coolingActive, laserDetuningDelta]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                CAVITY QUANTUM OPTOMECHANICS // SIDEBAND GROUND STATE COOLING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ℏg₀ a†a (b + b†)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Radiation pressure dynamical backaction & zero-point mechanical ground state for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerSidebandCooling}
            disabled={coolingActive}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{coolingActive ? 'GROUND STATE COOLING ACTIVE (⟨n⟩ < 1)' : 'ENGAGE RED-SIDEBAND COOLING (Δ = -ω_m)'}</span>
          </button>

          {coolingActive && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
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
              <span className="text-cyan-400 font-bold">DETUNING: Δ = -1.0 ω_m</span>
              <span className="text-pink-400 font-bold">PHONONS: {coolingActive ? '0.24' : '3.80'}</span>
              <span className="text-amber-400 font-bold">POWER: {opticalPowerMw} mW</span>
            </div>
            <div>STATUS: {coolingActive ? 'QUANTUM GROUND STATE PURITY: 80.6%' : 'THERMAL EQUILIBRIUM'}</div>
          </div>
        </div>

        {/* Optomechanics Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LASER POWER
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Drive Power:</span>
              <span className="text-cyan-400 font-bold">{opticalPowerMw} mW</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={30.0}
              step={1.0}
              value={opticalPowerMw}
              onChange={(e) => setOpticalPowerMw(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Quantum Ground State:</strong> Red-detuned laser photons absorb mechanical vibrational phonons from the mirror and scatter out at the cavity resonance frequency, carrying away mechanical thermal energy!</div>
            <div>• <strong>Macroscopic Quantum Superpositions:</strong> Cooling a mechanical membrane to its quantum ground state allows observing Schrödinger cat states in tangible macroscopic objects!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
