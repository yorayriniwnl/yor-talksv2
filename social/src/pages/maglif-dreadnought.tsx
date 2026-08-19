import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MaglifDreadnought() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [preheatLaserEnergyKilojoules, setPreheatLaserEnergyKilojoules] = useState(4.5); // 4.5 kJ laser preheat
  const [axialBFieldTesla, setAxialBFieldTesla] = useState(30); // 30 Tesla axial B-field
  const [specificImpulseSec, setSpecificImpulseSec] = useState(350000); // 350,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(7200); // 7,200 kN dreadnought thrust

  const animFrameRef = useRef<number | null>(null);
  const dreadnoughtPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // MagLIF Laser-Preheated Magnetized Liner Implosion Canvas
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

      // Pre-heat Laser Beam Entry Tube (Left: 40 to 140)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(40, cy); ctx.lineTo(140, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Solid Beryllium Cylindrical Liner (Top & Bottom: 80 to 240)
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.fillRect(80, cy - 70, 160, 20);
      ctx.strokeRect(80, cy - 70, 160, 20);
      ctx.fillRect(80, cy + 50, 160, 20);
      ctx.strokeRect(80, cy + 50, 160, 20);

      // 30 Tesla Axial Magnetic Field Lines (Bz)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      for (let l = 0; l < 5; l++) {
        const ly = cy - 35 + l * 18;
        ctx.beginPath();
        ctx.moveTo(80, ly); ctx.lineTo(240, ly);
        ctx.stroke();
      }

      // Hot Dense MagLIF Fusion Stagnation Core (at 160, cy)
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(160, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magnetic Divertor Heavy Aerospike Exhaust Nozzle (240 to 520)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(240, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(240, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // High-Velocity Relativistic MagLIF Fusion Exhaust Streams
      if (Math.random() < 0.75) {
        dreadnoughtPlasmaJetsRef.current.push({
          x: 240,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 30 + (preheatLaserEnergyKilojoules / 4.5) * 8,
        });
      }

      dreadnoughtPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      dreadnoughtPlasmaJetsRef.current = dreadnoughtPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `MagLIF DREADNOUGHT: LASER PREHEAT = ${preheatLaserEnergyKilojoules} kJ | AXIAL B-FIELD = ${axialBFieldTesla} T | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [preheatLaserEnergyKilojoules, axialBFieldTesla, specificImpulseSec, thrustKiloNewtons]);

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
                MAGLIF DREADNOUGHT // 350,000s Isp LASER-PREHEAT DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                SLUTZ, SINARS & CUNEO (SANDIA Z-FACILITY)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              30 MA pulsed beryllium liner & 4.5 kJ laser-preheated fusion dreadnought for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">DREADNOUGHT THRUST</div>
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
              <span className="text-red-400 font-bold">LASER PREHEAT: {preheatLaserEnergyKilojoules} kJ</span>
              <span className="text-cyan-400 font-bold">B-FIELD: {axialBFieldTesla} T</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: 200 MBAR MAGLIF STAGNATION NOMINAL</div>
          </div>
        </div>

        {/* MagLIF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PREHEAT (kJ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Laser Energy:</span>
              <span className="text-red-400 font-bold">{preheatLaserEnergyKilojoules} kJ</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={10.0}
              step={0.5}
              value={preheatLaserEnergyKilojoules}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPreheatLaserEnergyKilojoules(val);
                setThrustKiloNewtons(Math.floor(val * 1600));
              }}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Magnetized Liner Inertial Fusion:</strong> Axial 30T magnetic fields trap charged fusion particles and reduce electron thermal conduction by 100x!</div>
            <div>• <strong>Megajoule Laser Preheat:</strong> Heating the fuel column to 200 eV prior to compression drastically lowers the required implosion velocity, achieving robust thermonuclear ignition!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
