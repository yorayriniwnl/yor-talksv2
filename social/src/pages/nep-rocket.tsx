import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function NepRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [reactorPowerKwe, setReactorPowerKwe] = useState(100); // 100 kWe Kilopower Brayton nuclear generator
  const [thrusterCount, setThrusterCount] = useState(4); // 4-unit Hall thruster cluster
  const [specificImpulseSec, setSpecificImpulseSec] = useState(5000); // 5,000 s Isp
  const [thrustN, setThrustN] = useState(2.8); // 2.8 N continuous thrust

  const animFrameRef = useRef<number | null>(null);
  const hallPlumesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Nuclear Electric Propulsion (NEP) & Clustered Hall Ion Plume Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Deep Space
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nuclear Reactor Core & Shadow Shield (Left 60-140)
      ctx.fillStyle = '#475569';
      ctx.fillRect(60, cy - 25, 60, 50);
      // Heavy Tungsten/Lithium Hydride Radiation Shadow Shield (120-140)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(120, cy - 30, 20, 60);

      // Carbon-Composite Heat Radiator Panels (140-280)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      // Top Radiator Wing
      ctx.strokeRect(140, cy - 90, 120, 55);
      // Bottom Radiator Wing
      ctx.strokeRect(140, cy + 35, 120, 55);

      // Long Separation Truss (Connecting reactor to thruster module 140-300)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(140, cy); ctx.lineTo(300, cy);
      ctx.stroke();

      // Clustered Hall-Effect Thruster Array at Stern (300, cy)
      ctx.fillStyle = '#334155';
      ctx.fillRect(300, cy - 45, 30, 90);

      // 4 Hall Thruster Nozzle Channels
      for (let i = 0; i < thrusterCount; i++) {
        const ty = cy - 35 + i * 24;
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(325, ty, 8, 14);

        // Spawn E x B Accelerated Krypton Ion Exhaust Particles
        for (let k = 0; k < 2; k++) {
          hallPlumesRef.current.push({
            x: 335,
            y: ty + 7 + (Math.random() - 0.5) * 6,
            vx: Math.random() * 6 + 12,
            vy: (Math.random() - 0.5) * 1.5,
            life: 80,
          });
        }
      }

      // Draw Glowing Blue/Cyan Hall Ion Beam
      hallPlumesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1.5;

        if (p.life > 0) {
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      hallPlumesRef.current = hallPlumesRef.current.filter(p => p.life > 0 && p.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [reactorPowerKwe, thrusterCount]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                NUCLEAR ELECTRIC PROPULSION // NEP MEGAWATT HALL CLUSTER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                BRAYTON REACTOR & E×B DRIFT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Closed Brayton cycle fission power & continuous interplanetary spiral burns for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">REACTOR ELECTRIC POWER</div>
            <div className="text-xl font-bold text-cyan-400">{reactorPowerKwe} <span className="text-xs">kWe</span></div>
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
              <span className="text-cyan-400 font-bold">POWER: {reactorPowerKwe} kWe</span>
              <span className="text-pink-400 font-bold">Isp: {specificImpulseSec} s</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustN} N ({thrusterCount}× Cluster)</span>
            </div>
            <div>STATUS: CONTINUOUS INTERPLANETARY HELIOCENTRIC SPIRAL</div>
          </div>
        </div>

        {/* Propulsion Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              NUCLEAR REACTOR
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Reactor Output:</span>
              <span className="text-cyan-400 font-bold">{reactorPowerKwe} kWe</span>
            </div>
            <input
              type="range"
              min={50}
              max={500}
              step={25}
              value={reactorPowerKwe}
              onChange={(e) => {
                const val = Number(e.target.value);
                setReactorPowerKwe(val);
                setThrustN(+(val * 0.028).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Massive Fuel Savings:</strong> NEP achieves 5,000s specific impulse—over 10× higher than chemical rockets—drastically reducing the launch mass required for cargo transport to Mars and Jupiter!</div>
            <div>• <strong>Continuous Thrust:</strong> Fires continuously for 20,000+ hours, spiraling out of Earth's gravity well into deep solar orbit!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
