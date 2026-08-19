import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CasimirStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [plateSeparationNm, setPlateSeparationNm] = useState(25); // 25 nm gap
  const [oscillationFreqGhz, setOscillationFreqGhz] = useState(10.4); // 10.4 GHz dynamical SQUID oscillation
  const [isDynamicMode, setIsDynamicMode] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const photonsRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  const toggleDynamicCasimir = () => {
    uiaudio.warp();
    setIsDynamicMode(prev => !prev);
  };

  // Static & Dynamic Casimir Vacuum Fluctuation Canvas
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

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Plate Separation Scaling
      const halfGap = 20 + (plateSeparationNm / 50) * 80;
      const osc = isDynamicMode ? Math.sin(time * 3) * 6 : 0;

      // Left Conducting Plate
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.fillRect(cx - halfGap - 18 - osc, 80, 18, 320);

      // Right Conducting Plate
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 15;
      ctx.fillRect(cx + halfGap + osc, 80, 18, 320);
      ctx.shadowBlur = 0;

      // Quantum Zero-Point Vacuum Modes Outside Cavity (Dense Spectrum)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      // Left Outside Waves
      for (let y = 100; y <= 380; y += 24) {
        ctx.beginPath();
        for (let x = 60; x <= cx - halfGap - 25; x += 4) {
          const wy = y + Math.sin(x * 0.1 + time * 2) * 6;
          if (x === 60) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }
      // Right Outside Waves
      for (let y = 100; y <= 380; y += 24) {
        ctx.beginPath();
        for (let x = cx + halfGap + 25; x <= canvas.width - 60; x += 4) {
          const wy = y + Math.sin(x * 0.1 + time * 2) * 6;
          if (x === cx + halfGap + 25) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
        }
        ctx.stroke();
      }

      // Discrete Allowed Vacuum Modes Inside Cavity (Only harmonics matching boundary conditions n*lambda/2 = d)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = cx - halfGap; x <= cx + halfGap; x += 3) {
        const norm = (x - (cx - halfGap)) / (halfGap * 2);
        const wy = cy + Math.sin(norm * Math.PI * 2) * 20 * Math.cos(time * 2);
        if (x === cx - halfGap) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
      }
      ctx.stroke();

      // Dynamic Casimir Effect: Oscillating Boundary Creates Real Photon Pairs Out of Vacuum!
      if (isDynamicMode) {
        if (Math.random() < 0.4) {
          // Left Photon
          photonsRef.current.push({
            x: cx - halfGap,
            y: cy + (Math.random() - 0.5) * 100,
            vx: -(Math.random() * 4 + 4),
            vy: (Math.random() - 0.5) * 3,
            life: 60,
          });
          // Entangled Right Photon
          photonsRef.current.push({
            x: cx + halfGap,
            y: cy + (Math.random() - 0.5) * 100,
            vx: (Math.random() * 4 + 4),
            vy: (Math.random() - 0.5) * 3,
            life: 60,
          });
        }

        photonsRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 1.5;

          if (p.life > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });

        photonsRef.current = photonsRef.current.filter(p => p.life > 0);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [plateSeparationNm, isDynamicMode]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Waves className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                CASIMIR EFFECT // STATIC FORCE & DYNAMICAL VACUUM PHOTONS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                F/A = -π²ℏc / (240 d⁴)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Zero-point energy boundary exclusion & relativistic SQUID photon pair creation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleDynamicCasimir}
            className={cn(
              "px-6 py-3 rounded-xl font-bold shadow-lg flex items-center space-x-2 transition-all",
              isDynamicMode ? "bg-pink-600 text-white shadow-pink-500/30" : "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>{isDynamicMode ? 'STOP DYNAMICAL OSCILLATION' : 'ENABLE DYNAMICAL CASIMIR (DCE)'}</span>
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
              <span className="text-cyan-400 font-bold">GAP: {plateSeparationNm} nm</span>
              <span className="text-pink-400 font-bold">PRESSURE: {(1.3 / Math.pow(plateSeparationNm / 25, 4)).toFixed(2)} Atm (Attractive)</span>
            </div>
            <div>STATUS: {isDynamicMode ? 'PARAMETRIC VACUUM PHOTON PAIRS GENERATED' : 'STATIC CASIMIR CAVITY CONFINEMENT'}</div>
          </div>
        </div>

        {/* Casimir Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PLATE SEPARATION
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Cavity Gap (d):</span>
              <span className="text-cyan-400 font-bold">{plateSeparationNm} nm</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={plateSeparationNm}
              onChange={(e) => setPlateSeparationNm(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Vacuum Pressure:</strong> Outer space has more zero-point modes than the narrow gap between plates, creating net inward attractive force that increases with 1/d⁴!</div>
            <div>• <strong>Real Photons from Empty Space:</strong> Oscillating a superconducting mirror at relativistic speeds (DCE - Chalmers 2011) converts virtual vacuum fluctuations into pairs of real, entangled photons!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
