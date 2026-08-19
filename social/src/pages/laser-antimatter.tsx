import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Crosshair
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function LaserAntimatter() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [laserEnergyMj, setLaserEnergyMj] = useState(5.0); // 5.0 Megajoules petawatt laser driver
  const [specificImpulseSec, setSpecificImpulseSec] = useState(17000); // 17,000 s Isp
  const [antimatterSeedFraction, setAntimatterSeedFraction] = useState(10); // 10^9 antiprotons/pellet
  const [thrustKn, setThrustKn] = useState(250); // 250 kN thrust

  const animFrameRef = useRef<number | null>(null);
  const microFusionPlumesRef = useRef<{ x: number; y: number; r: number; opacity: number }[]>([]);

  // Laser-Antimatter Micro-Fusion Thrust Chamber Canvas
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

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Conical 12-Tesla Superconducting Magnetic Coil Ring (120 to 320)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(220, cy, 110, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();

      // Divergent Magnetic Nozzle Exhaust Field (320 to 500)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(320, cy - 80); ctx.lineTo(500, cy - 140);
      ctx.moveTo(320, cy + 80); ctx.lineTo(500, cy + 140);
      ctx.stroke();

      // Petawatt Laser Beam Cones Focusing on Ignition Point (220, cy)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(100, cy - 100); ctx.lineTo(220, cy);
      ctx.moveTo(100, cy + 100); ctx.lineTo(220, cy);
      ctx.stroke();

      // Trigger Periodic Laser-Antimatter Thermonuclear Ignition
      if (Math.random() < 0.2) {
        microFusionPlumesRef.current.push({
          x: 220,
          y: cy,
          r: 6,
          opacity: 1.0,
        });
      }

      // Draw Expanding Thermonuclear Shockwave & Relativistic Exhaust Plume
      microFusionPlumesRef.current.forEach((p) => {
        p.r += 4.2;
        p.opacity -= 0.04;

        ctx.strokeStyle = `rgba(236, 72, 153, ${p.opacity})`;
        ctx.fillStyle = `rgba(245, 158, 11, ${p.opacity * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      microFusionPlumesRef.current = microFusionPlumesRef.current.filter(p => p.opacity > 0);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `LASER-ANTIMATTER MICRO-FUSION: ${laserEnergyMj} MJ PETAWATT DRIVER (I_sp = ${specificImpulseSec.toLocaleString()} s | F = ${thrustKn} kN)`,
        80,
        cy + 175
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [laserEnergyMj, specificImpulseSec, thrustKn]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                LASER-ANTIMATTER FUSION // PETAWATT DRIVER STARSHIP (VISTA)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                17,000s Isp (LLNL / VISTA STARSHIP)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Megajoule laser compression & antiproton-catalyzed D-T pellet ignition for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-pink-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-pink-400 font-bold">LASER: {laserEnergyMj} MJ</span>
              <span className="text-cyan-400 font-bold">p̄ SEED: 10^{antimatterSeedFraction}</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustKn} kN</span>
            </div>
            <div>STATUS: 12-TESLA ASYMMETRIC MAGNETIC MIRROR CONFINEMENT</div>
          </div>
        </div>

        {/* Laser Antimatter Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LASER DRIVER ENERGY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Excimer Laser Pulse:</span>
              <span className="text-pink-400 font-bold">{laserEnergyMj} MJ</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={10.0}
              step={0.5}
              value={laserEnergyMj}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLaserEnergyMj(val);
                setThrustKn(Math.round(val * 50));
                setSpecificImpulseSec(Math.round(10000 + val * 1400));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Fast Spark Ignition:</strong> Seeding the D-T pellet core with a tiny burst of antiprotons reduces required laser compression energy by over 100×!</div>
            <div>• <strong>Magnetic Redirection:</strong> 12-Tesla superconducting magnetic coils direct hypervelocity alpha particles and plasma out the nozzle without ablating physical chamber walls!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
