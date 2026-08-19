import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MicfFusionRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [laserEnergyKilojoules, setLaserEnergyKilojoules] = useState(250); // 250 kJ laser pulse
  const [internalBFieldTesla, setInternalBFieldTesla] = useState(100); // 100 T self-generated magnetic field
  const [specificImpulseSec, setSpecificImpulseSec] = useState(220000); // 220,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(850); // 850 kN thrust

  const animFrameRef = useRef<number | null>(null);
  const ablatedPlasmaJetRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Magnetically Insulated Inertial Confinement Fusion (MICF) Canvas
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

      // Heavy Metal Spherical Shell (Left at 260, cy)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(260, cy, 55, 0, Math.PI * 2);
      ctx.stroke();

      // Laser Hole & Injected Laser Beam (Left Needle)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(60, cy); ctx.lineTo(210, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Self-Generated 100-Tesla Closed Magnetic Insulation Field (Inside Shell)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(260, cy, 38, 22, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Superheated Thermonuclear Plasma Core (at 260, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(260, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magnetic Expansion Nozzle (315 to 540)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(315, cy - 25); ctx.lineTo(540, cy - 80);
      ctx.moveTo(315, cy + 25); ctx.lineTo(540, cy + 80);
      ctx.stroke();

      // High-Velocity Fusion Exhaust Jet
      if (Math.random() < 0.5) {
        ablatedPlasmaJetRef.current.push({
          x: 315,
          y: cy + (Math.random() - 0.5) * 14,
          vx: 20 + (laserEnergyKilojoules / 250) * 8,
        });
      }

      ablatedPlasmaJetRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ablatedPlasmaJetRef.current = ablatedPlasmaJetRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `MICF FUSION ROCKET: E_laser = ${laserEnergyKilojoules} kJ | B_insulation = ${internalBFieldTesla} T | I_sp = ${specificImpulseSec.toLocaleString()} s | F = ${thrustKiloNewtons} kN`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [laserEnergyKilojoules, internalBFieldTesla, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-amber-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-amber-300 to-pink-400">
                MICF FUSION ROCKET // MAGNETICALLY INSULATED INERTIAL CONFINEMENT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                220,000s Isp (TERRY KAMMASH - UNIV OF MICHIGAN & NASA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              100-Tesla self-generated magnetic insulation & high-gain D-T plasma burn for {currentUser?.name}
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
              <span className="text-cyan-400 font-bold">LASER: {laserEnergyKilojoules} kJ</span>
              <span className="text-pink-400 font-bold">FIELD: {internalBFieldTesla} T</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: ZERO CONDUCTION THERMAL WALL LOSSES</div>
          </div>
        </div>

        {/* MICF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LASER PULSE (kJ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Driver Energy:</span>
              <span className="text-cyan-400 font-bold">{laserEnergyKilojoules} kJ</span>
            </div>
            <input
              type="range"
              min={100}
              max={500}
              step={25}
              value={laserEnergyKilojoules}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLaserEnergyKilojoules(val);
                setThrustKiloNewtons(Math.floor(val * 3.4));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Self-Generated Magnetic Insulation:</strong> Laser ablation of the inner shell creates a dense plasma that spontaneously produces a 100-Tesla magnetic field, thermally insulating the core from the wall!</div>
            <div>• <strong>Long Confinement Time:</strong> Physical shell inertia provides confinement times 100x longer than standard laser fusion, dramatically lowering driver energy requirements!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
