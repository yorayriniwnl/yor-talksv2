import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function VasimrRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [rfPowerKw, setRfPowerKw] = useState(200); // 200 kW VX-200 engine
  const [specificImpulseSec, setSpecificImpulseSec] = useState(5000); // 5,000 s Isp high gear
  const [thrustN, setThrustN] = useState(5.8); // 5.8 N thrust
  const [propellantType, setPropellantType] = useState<'Argon' | 'Krypton'>('Argon');

  const animFrameRef = useRef<number | null>(null);
  const plasmaExhaust = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // VASIMR 3-Stage Helicon/ICRH/Magnetic Nozzle Canvas
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

      // Stage 1: Helicon Plasma Generator (Left Quartz Tube 60-160)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(60, cy - 35, 100, 70);

      // Stage 2: Ion Cyclotron Resonant Heating ICRH Section (160-260)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.strokeRect(160, cy - 45, 100, 90);

      // Stage 3: Superconducting Magnetic Divergent Nozzle (260-340)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(260, cy - 45); ctx.lineTo(340, cy - 85);
      ctx.moveTo(260, cy + 45); ctx.lineTo(340, cy + 85);
      ctx.stroke();

      // Helicon RF Dense Glow in Stage 1
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.fillRect(65, cy - 30, 90, 60);

      // ICRH Superheated Ion Thermal Gyro-Orbit Glow in Stage 2 (Blinding White/Magenta)
      const icrhGrad = ctx.createRadialGradient(210, cy, 5, 210, cy, 40);
      icrhGrad.addColorStop(0, '#ffffff');
      icrhGrad.addColorStop(0.5, '#ec4899');
      icrhGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');
      ctx.fillStyle = icrhGrad;
      ctx.beginPath();
      ctx.arc(210, cy, 40, 0, Math.PI * 2);
      ctx.fill();

      // Spawn Magnetic Nozzle Accelerated Exhaust Plume
      for (let i = 0; i < 6; i++) {
        plasmaExhaust.current.push({
          x: 340,
          y: cy + (Math.random() - 0.5) * 40,
          vx: Math.random() * 8 + 12,
          vy: (Math.random() - 0.5) * 3,
          life: 80,
        });
      }

      // Draw Detached Plasma Jet Particles
      plasmaExhaust.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1.5;

        if (p.life > 0) {
          ctx.fillStyle = '#06b6d4';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      plasmaExhaust.current = plasmaExhaust.current.filter(p => p.life > 0 && p.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rfPowerKw]);

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
                VASIMR VX-200 // VARIABLE SPECIFIC IMPULSE MAGNETOPLASMA
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                200 KW HELICON & ICRH
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Ion Cyclotron Resonance heating & magnetic divergent nozzle thrust conversion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE (Isp)</div>
            <div className="text-xl font-bold text-cyan-400">{specificImpulseSec} <span className="text-xs">SECONDS</span></div>
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
              <span className="text-cyan-400 font-bold">RF POWER: {rfPowerKw} kW</span>
              <span className="text-pink-400 font-bold">THRUST: {thrustN} N</span>
              <span className="text-amber-400 font-bold">PROPELLANT: {propellantType}</span>
            </div>
            <div>STATUS: CONTINUOUS ICRH PLASMA DETACHMENT</div>
          </div>
        </div>

        {/* Thruster Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              GEAR SHIFTING
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>RF Generator Power:</span>
              <span className="text-cyan-400 font-bold">{rfPowerKw} kW</span>
            </div>
            <input
              type="range"
              min={50}
              max={200}
              step={10}
              value={rfPowerKw}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRfPowerKw(val);
                setThrustN(+(val * 0.029).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Electrode-Free:</strong> No physical electrodes are exposed to plasma, eliminating erosion and allowing years of continuous operation.</div>
            <div>• <strong>Variable Exhaust:</strong> Can "shift gears" between high thrust (3,000s Isp) for planetary escape and high efficiency (5,000s Isp) for interplanetary cruising!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
