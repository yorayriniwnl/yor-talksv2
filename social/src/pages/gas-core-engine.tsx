import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Wind
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function GasCoreEngine() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [coreTempKelvin, setCoreTempKelvin] = useState(55000); // 55,000 K gaseous uranium plasma
  const [specificImpulseSec, setSpecificImpulseSec] = useState(5000); // 5,000 s Isp
  const [thrustKn, setThrustKn] = useState(220); // 220 kN thrust
  const [vortexFlowRate, setVortexFlowRate] = useState(4.5); // 4.5 kg/s H2 buffer

  const animFrameRef = useRef<number | null>(null);
  const hydrogenStreamRef = useRef<{ x: number; y: number; vx: number; vy: number; temp: number }[]>([]);

  // Gas-Core Open-Cycle Vortex Fission Reactor Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spherical Beryllium Oxide Moderator Pressure Vessel (Left 80 to 320)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(200, cy, 110, 0, Math.PI * 2);
      ctx.stroke();

      // Regeneratively Cooled Rocket Divergent Exhaust Nozzle (290 to 460)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(290, cy - 35); ctx.lineTo(460, cy - 100);
      ctx.moveTo(290, cy + 35); ctx.lineTo(460, cy + 100);
      ctx.stroke();

      // Incandescent Gaseous Uranium-235 Plasma Core (Central Vortex Sphere at 200, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.arc(200, cy, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('U-235 PLASMA', 160, cy - 5);
      ctx.fillText('55,000 K', 175, cy + 12);

      // Swirling Cold Hydrogen Propellant Buffer Layer (Swirling around core without mixing)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      for (let r = 55; r <= 95; r += 15) {
        ctx.beginPath();
        ctx.arc(200, cy, r, time * 2, time * 2 + Math.PI * 1.6);
        ctx.stroke();
      }

      // Spawn Superheated Exhaust Gas expelled out the nozzle
      if (Math.random() < 0.6) {
        hydrogenStreamRef.current.push({
          x: 290,
          y: cy + (Math.random() - 0.5) * 20,
          vx: Math.random() * 4 + 12,
          vy: (Math.random() - 0.5) * 3,
          temp: 1.0,
        });
      }

      // Draw & Propagate Hot Hydrogen Plume
      hydrogenStreamRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      hydrogenStreamRef.current = hydrogenStreamRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `GAS-CORE NUCLEAR THERMAL: 55,000 K RADIATIVE BLACKBODY FLUX (I_sp = ${specificImpulseSec.toLocaleString()} s)`,
        100,
        cy + 160
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [coreTempKelvin, specificImpulseSec]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-amber-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Wind className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-amber-300 to-pink-400">
                GAS-CORE NUCLEAR ROCKET // VORTEX FISSION PLASMA (GCNR)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                5,000s Isp (NASA LEWIS)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              55,000 K incandescent uranium plasma vortex & radiative blackbody heating for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-cyan-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-amber-400 font-bold">CORE: {coreTempKelvin.toLocaleString()} K</span>
              <span className="text-cyan-400 font-bold">THRUST: {thrustKn} kN</span>
              <span className="text-pink-400 font-bold">BUFFER: {vortexFlowRate} kg/s H₂</span>
            </div>
            <div>STATUS: FLUID-DYNAMIC HYDROGEN VORTEX CONFINING URANIUM CORE</div>
          </div>
        </div>

        {/* GCNR Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CORE TEMPERATURE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Plasma Temperature:</span>
              <span className="text-amber-400 font-bold">{coreTempKelvin.toLocaleString()} K</span>
            </div>
            <input
              type="range"
              min={25000}
              max={80000}
              step={2500}
              value={coreTempKelvin}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCoreTempKelvin(val);
                setSpecificImpulseSec(Math.round(Math.sqrt(val) * 21.3));
                setThrustKn(Math.round(val * 0.004));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No Solid Core Meltdown:</strong> By replacing solid fuel rods with a free-floating gaseous uranium plasma ball, core temperatures exceed solid fuel limits by over 20×!</div>
            <div>• <strong>Radiative Heat Transfer:</strong> UV blackbody photons radiated by the incandescent core pass through the transparent hydrogen vortex, heating the propellant to 20,000 K!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
