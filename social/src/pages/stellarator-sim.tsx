import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Zap, Play, Pause, RotateCcw, 
  ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function StellaratorSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [rotationalTransformIota, setRotationalTransformIota] = useState(0.86); // iota = 5/6 rotational transform
  const [bFieldTesla, setBFieldTesla] = useState(2.5); // 2.5 Tesla on axis
  const [plasmaTempKev, setPlasmaTempKev] = useState(8.5); // 8.5 keV (~100 Million K)
  const [isRunning, setIsRunning] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  // W7-X 5-Fold Symmetric 3D Helical Twisted Plasma Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Cryostat Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 5-Fold Symmetry Non-Planar Superconducting Coils (Twisted Modular Ribbon Coils)
      const numCoils = 10;
      for (let i = 0; i < numCoils; i++) {
        const angle = (i / numCoils) * Math.PI * 2;
        const rx = cx + Math.cos(angle) * 160;
        const ry = cy + Math.sin(angle) * 110;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        // 3D twisted coil loop perspective
        ctx.ellipse(rx, ry, 28, 48, angle + Math.sin(time + i) * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Twisted Helical Plasma Bean/Triangle Cross-Section (Glowing Core)
      const plasmaGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 140);
      plasmaGrad.addColorStop(0, '#ffffff');
      plasmaGrad.addColorStop(0.3, '#f59e0b');
      plasmaGrad.addColorStop(0.6, '#ec4899');
      plasmaGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');

      ctx.fillStyle = plasmaGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 20;

      ctx.beginPath();
      const points = 100;
      for (let p = 0; p <= points; p++) {
        const theta = (p / points) * Math.PI * 2;
        // W7-X 5-fold helical pentagonal modulation
        const rMod = 120 + 20 * Math.cos(theta * 5 + time);
        const px = cx + Math.cos(theta) * rMod;
        const py = cy + Math.sin(theta) * (rMod * 0.7);

        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rotationalTransformIota]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                STELLARATOR W7-X // 3D NON-PLANAR MODULAR COIL FUSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                DISRUPTION-FREE STEADY STATE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Quasi-isodynamic 5-fold helical magnetic confinement without plasma net current for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">PULSE DURATION</div>
            <div className="text-xl font-bold text-amber-400">30:00 <span className="text-xs">MINUTES (CW)</span></div>
          </div>
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
              <span className="text-amber-400 font-bold">ROTATIONAL TRANSFORM: ι = {rotationalTransformIota}</span>
              <span className="text-cyan-400 font-bold">B-FIELD: {bFieldTesla} T</span>
              <span className="text-pink-400 font-bold">ION TEMP: {plasmaTempKev} keV</span>
            </div>
            <div>STATUS: DISRUPTION-FREE HIGH-CONFINEMENT STEADY STATE</div>
          </div>
        </div>

        {/* Stellarator Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              MAGNETIC METRICS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Rotational Transform (ι):</span>
              <span className="text-amber-400 font-bold">ι = {rotationalTransformIota}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.2}
              step={0.02}
              value={rotationalTransformIota}
              onChange={(e) => setRotationalTransformIota(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Zero Net Current:</strong> Unlike Tokamaks, Stellarators generate rotational transform entirely with external 3D shaped coils, eliminating current-driven disruptions!</div>
            <div>• <strong>Quasi-Isodynamic Optimization:</strong> Minimizes neoclassical ripple transport and fast-ion losses for continuous fusion power plants.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
