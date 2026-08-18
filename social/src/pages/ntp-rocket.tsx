import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function NtpRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [coreTempK, setCoreTempK] = useState(2850); // 2,850 K
  const [specificImpulseSec, setSpecificImpulseSec] = useState(925); // 925 s Isp
  const [chamberPressureBar, setChamberPressureBar] = useState(70);
  const [thrustKn, setThrustKn] = useState(250);

  const animFrameRef = useRef<number | null>(null);
  const exhaustPlume = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // NTP Reactor & Hydrogen Nozzle Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Liquid Hydrogen Inflow Jacket Lines (Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(30, cy - 70); ctx.lineTo(150, cy - 70);
      ctx.moveTo(30, cy + 70); ctx.lineTo(150, cy + 70);
      ctx.stroke();

      // Enriched Uranium Carbide Nuclear Pebble-Bed Core (Orange/Red Glowing Block)
      const coreGrad = ctx.createLinearGradient(120, cy, 220, cy);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#f59e0b');
      coreGrad.addColorStop(1, '#ef4444');

      ctx.fillStyle = coreGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 20;
      ctx.fillRect(120, cy - 60, 100, 120);
      ctx.shadowBlur = 0;

      // Rocket Convergent-Divergent Bell Nozzle (Gray Metal)
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(220, cy - 60);
      ctx.lineTo(260, cy - 20); // Throat
      ctx.lineTo(380, cy - 90); // Bell expansion
      ctx.lineTo(380, cy + 90);
      ctx.lineTo(260, cy + 20);
      ctx.lineTo(220, cy + 60);
      ctx.closePath();
      ctx.fill();

      // Hydrogen Exhaust Gas Expansion (Translucent Blue/White Plume)
      const plumeGrad = ctx.createLinearGradient(260, cy, canvas.width, cy);
      plumeGrad.addColorStop(0, '#ffffff');
      plumeGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.7)');
      plumeGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.moveTo(260, cy - 20);
      ctx.lineTo(canvas.width, cy - 140);
      ctx.lineTo(canvas.width, cy + 140);
      ctx.lineTo(260, cy + 20);
      ctx.closePath();
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [coreTempK]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Atom className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '16s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                NUCLEAR THERMAL PROPULSION // PEBBLE-BED NERVA ROCKET
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SPECIFIC IMPULSE 925S
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Liquid hydrogen superheating through enriched uranium carbide core for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Isp */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE (Isp)</div>
            <div className="text-xl font-bold text-amber-400">{specificImpulseSec} <span className="text-xs">SECONDS</span></div>
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
              <span className="text-amber-400 font-bold">CORE TEMP: {coreTempK} K</span>
              <span className="text-rose-400 font-bold">THRUST: {thrustKn} kN</span>
            </div>
            <div>STATUS: PROMPT-CRITICAL THERMAL EXPANSION</div>
          </div>
        </div>

        {/* Reactor Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              REACTOR CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Core Operating Temperature:</span>
              <span className="text-amber-400 font-bold">{coreTempK} K</span>
            </div>
            <input
              type="range"
              min={2200}
              max={3200}
              step={50}
              value={coreTempK}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCoreTempK(val);
                setSpecificImpulseSec(Math.round(Math.sqrt(val) * 17.3));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">NTP ADVANTAGE:</span>
            <div>• Double the efficiency of chemical rockets (925s vs 450s Isp) by heating pure low-molecular-weight hydrogen gas.</div>
            <div>• Enables rapid transit to Mars in under 100 days.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
