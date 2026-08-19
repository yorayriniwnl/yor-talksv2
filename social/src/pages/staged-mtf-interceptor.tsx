import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function StagedMtfInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [compressionPressureMbar, setCompressionPressureMbar] = useState(100); // 100 Mbar peak stagnation pressure
  const [initialMagneticFieldTesla, setInitialMagneticFieldTesla] = useState(10); // 10 Tesla seed field
  const [specificImpulseSec, setSpecificImpulseSec] = useState(230000); // 230,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(3500); // 3,500 kN interceptor thrust

  const animFrameRef = useRef<number | null>(null);
  const mtfExhaustJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Staged Magnetized Target Fusion (MTF) Interceptor Canvas
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

      // Dark Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Concentric Molten Metal Compression Pistons (Top & Bottom: 80 to 240)
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.fillRect(80, cy - 85, 160, 24);
      ctx.strokeRect(80, cy - 85, 160, 24);
      ctx.fillRect(80, cy + 61, 160, 24);
      ctx.strokeRect(80, cy + 61, 160, 24);

      // High-Density Staged MTF Plasma Core (at 160, cy)
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(160, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Seed 10T Magnetic Flux Lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      for (let f = 0; f < 3; f++) {
        ctx.beginPath();
        ctx.ellipse(160, cy, 22, 10 + f * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Magnetic Expansion Thrust Nozzle (250 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(250, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(250, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // High-Velocity Staged MTF Exhaust Plasma Jets
      if (Math.random() < 0.6) {
        mtfExhaustJetsRef.current.push({
          x: 250,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 24 + (compressionPressureMbar / 100) * 8,
        });
      }

      mtfExhaustJetsRef.current.forEach((j) => {
        j.x += j.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      mtfExhaustJetsRef.current = mtfExhaustJetsRef.current.filter(j => j.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `STAGED MTF INTERCEPTOR: STAGNATION = ${compressionPressureMbar} Mbar | SEED B = ${initialMagneticFieldTesla} T | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [compressionPressureMbar, initialMagneticFieldTesla, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
                STAGED MTF INTERCEPTOR // 100 MBAR PULSED FUSION DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                230,000s Isp (LINDEMUTH & SIEMENS - LANL & GENERAL FUSION)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              100 Mbar acoustic liquid metal compression & 3,500 kN interceptor propulsion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">INTERCEPTOR THRUST</div>
            <div className="text-xl font-bold text-red-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-red-400 font-bold">STAGNATION: {compressionPressureMbar} Mbar</span>
              <span className="text-amber-400 font-bold">SEED FLUX: {initialMagneticFieldTesla} T</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: HIGH-DENSITY ACOUSTIC IMPLOSION STABLE</div>
          </div>
        </div>

        {/* MTF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              STAGNATION (Mbar)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Peak Pressure:</span>
              <span className="text-red-400 font-bold">{compressionPressureMbar} Mbar</span>
            </div>
            <input
              type="range"
              min={50}
              max={250}
              step={10}
              value={compressionPressureMbar}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCompressionPressureMbar(val);
                setThrustKiloNewtons(Math.floor(val * 35));
              }}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Magnetized Target Fusion:</strong> Combines the high density of ICF with the magnetic thermal insulation of MFE, drastically reducing laser driver power requirements!</div>
            <div>• <strong>Liquid Lead-Lithium Vortex:</strong> Shields the reactor wall from 14.1 MeV neutrons while breeding tritium and acting as a renewable acoustic compression piston!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
