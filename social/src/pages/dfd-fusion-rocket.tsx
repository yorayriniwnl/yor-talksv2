import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DfdFusionRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [rmfPowerKw, setRmfPowerKw] = useState(1200); // 1.2 MW RMF odd-parity heating
  const [specificImpulseSec, setSpecificImpulseSec] = useState(10000); // 10,000 s Isp
  const [thrustN, setThrustN] = useState(52.5); // 52.5 N thrust
  const [electricPowerMw, setElectricPowerMw] = useState(1.4); // 1.4 MW electric power

  const animFrameRef = useRef<number | null>(null);
  const exhaustRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // PFRC Direct Fusion Drive Magnetic Open Nozzle Canvas
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

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // PFRC Superconducting Solenoid Cylindrical Vessel (Left 80-280)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(80, cy - 40, 200, 80);

      // Magnetic Open Divergent Nozzle (280-360)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(280, cy - 40); ctx.lineTo(360, cy - 85);
      ctx.moveTo(280, cy + 40); ctx.lineTo(360, cy + 85);
      ctx.stroke();

      // Field-Reversed Configuration (FRC) Closed Magnetic Toroid in Core (180, cy)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(180, cy, 70, 28, 0, 0, Math.PI * 2);
      ctx.stroke();

      // D-3He Core Superheated Fusion Plasma Glow (Blinding White/Cyan)
      const coreGrad = ctx.createRadialGradient(180, cy, 4, 180, cy, 35);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, '#06b6d4');
      coreGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(180, cy, 35, 0, Math.PI * 2);
      ctx.fill();

      // Spawn Magnetic Open Exhaust Plasma Stream
      for (let i = 0; i < 5; i++) {
        exhaustRef.current.push({
          x: 360,
          y: cy + (Math.random() - 0.5) * 45,
          vx: Math.random() * 8 + 14,
          vy: (Math.random() - 0.5) * 2.5,
          life: 70,
        });
      }

      // Draw Directed Fusion Exhaust Plume
      exhaustRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1.4;

        if (p.life > 0) {
          ctx.fillStyle = '#06b6d4';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      exhaustRef.current = exhaustRef.current.filter(p => p.life > 0 && p.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rmfPowerKw]);

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
                DIRECT FUSION DRIVE // PRINCETON PFRC-2 FRC ENGINE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                D-3He CLEAN ANEUTRONIC FUSION
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rotating magnetic field (RMF) heating & open magnetic nozzle directed thrust for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">ELECTRIC POWER GENERATION</div>
            <div className="text-xl font-bold text-cyan-400">{electricPowerMw} <span className="text-xs">MEGAWATTS</span></div>
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
              <span className="text-cyan-400 font-bold">RMF POWER: {rmfPowerKw} kW</span>
              <span className="text-pink-400 font-bold">Isp: {specificImpulseSec} s</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustN} N</span>
            </div>
            <div>STATUS: CONTINUOUS D-3He FRC CONFINEMENT & EXHAUST</div>
          </div>
        </div>

        {/* Thruster Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              RMF DRIVER
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>RMF Input Power:</span>
              <span className="text-cyan-400 font-bold">{rmfPowerKw} kW</span>
            </div>
            <input
              type="range"
              min={500}
              max={2000}
              step={100}
              value={rmfPowerKw}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRmfPowerKw(val);
                setThrustN(+(val * 0.04375).toFixed(1));
                setElectricPowerMw(+(val * 0.00116).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dual Propulsion & Power:</strong> Unlike standard rockets, DFD directly produces megawatts of onboard electrical power while firing its magnetic fusion nozzle!</div>
            <div>• <strong>Pluto in 4 Years:</strong> Direct Fusion Drive enables rapid robotic sample return missions to Saturn's Titan and Pluto within human timelines!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
