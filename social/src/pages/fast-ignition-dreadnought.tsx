import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FastIgnitionDreadnought() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [petawattIgnitionPowerPw, setPetawattIgnitionPowerPw] = useState(10); // 10 PW fast ignition beam
  const [compressionDensityGcm3, setCompressionDensityGcm3] = useState(320); // 320 g/cm^3 isochoric density
  const [specificImpulseSec, setSpecificImpulseSec] = useState(420000); // 420,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(9600); // 9,600 kN dreadnought thrust

  const animFrameRef = useRef<number | null>(null);
  const dreadnoughtPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Fast-Ignition Cone-Guided Relativistic Electron Fusion Canvas
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

      // Gold Re-entrant Cone Guide (Left: 40 to 140)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(40, cy - 35);
      ctx.lineTo(140, cy - 8);
      ctx.lineTo(140, cy + 8);
      ctx.lineTo(40, cy + 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 10 PW Ultra-Relativistic Fast Electron Beam Shooting Down Cone
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.moveTo(40, cy); ctx.lineTo(145, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Symmetrically Compressed Isochoric DT Plasma Fuel (at 165, cy)
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 32;
      ctx.beginPath();
      ctx.arc(165, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('10 keV', 150, cy + 3);

      // Magnetic Aerospike Expansion Divertor Nozzle (230 to 520)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(230, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(230, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Particle Exhaust Streams
      if (Math.random() < 0.85) {
        dreadnoughtPlasmaJetsRef.current.push({
          x: 230,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 36 + (petawattIgnitionPowerPw / 10) * 10,
        });
      }

      dreadnoughtPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      dreadnoughtPlasmaJetsRef.current = dreadnoughtPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FAST IGNITION DREADNOUGHT: IGNITION BEAM = ${petawattIgnitionPowerPw} PW | DENSITY = ${compressionDensityGcm3} g/cm³ | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [petawattIgnitionPowerPw, compressionDensityGcm3, specificImpulseSec, thrustKiloNewtons]);

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-rose-300 to-amber-400">
                FAST IGNITION DREADNOUGHT // 420,000s Isp PETAWATT DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                TABAK & NORREYS (LLNL, OSAKA & TU DARMSTADT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              10 PW cone-guided relativistic electron fast-ignition dreadnought for {currentUser?.name}
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
              <span className="text-pink-400 font-bold">FAST IGNITION: {petawattIgnitionPowerPw} PW</span>
              <span className="text-cyan-400 font-bold">CORE DENSITY: {compressionDensityGcm3} g/cm³</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: CONE-GUIDED FAST IGNITION SPARK NOMINAL</div>
          </div>
        </div>

        {/* Fast Ignition Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              IGNITION POWER (PW)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Fast Ignition Laser:</span>
              <span className="text-red-400 font-bold">{petawattIgnitionPowerPw} PW</span>
            </div>
            <input
              type="range"
              min={2}
              max={20}
              step={1}
              value={petawattIgnitionPowerPw}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPetawattIgnitionPowerPw(val);
                setThrustKiloNewtons(Math.floor(val * 960));
              }}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Decoupled Compression and Ignition:</strong> Symmetrically compresses fuel at low velocity, then ignites a localized spark using a 10 PW picosecond electron beam!</div>
            <div>• <strong>High Gain Factor:</strong> Reaches gains exceeding 300 without hydrodynamic Rayleigh-Taylor shell breakup, delivering 420,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
