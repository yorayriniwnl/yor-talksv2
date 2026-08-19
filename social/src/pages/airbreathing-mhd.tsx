import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Wind, Plane
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AirbreathingMhd() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [laserPowerMw, setLaserPowerMw] = useState(50); // 50 MW beamed laser power
  const [machNumber, setMachNumber] = useState(18); // Mach 18 hypersonic ascent
  const [plasmaExhaustVelocityKms, setPlasmaExhaustVelocityKms] = useState(8.5); // 8.5 km/s exhaust
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(850); // 850 kN Lorentz thrust

  const animFrameRef = useRef<number | null>(null);
  const plasmaParticlesRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Air-Breathing Laser-Thermal MHD Lightcraft Canvas
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

      // Dark Upper Atmosphere Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground/Orbital Beamed Laser Ray (Bottom Left to Craft Nose at 260, cy)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(40, canvas.height - 40);
      ctx.lineTo(260, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Lightcraft Hypersonic Aerodynamic Aerospike Hull (260 to 420)
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(260, cy); // Fore Spike
      ctx.lineTo(380, cy - 40);
      ctx.lineTo(420, cy - 35);
      ctx.lineTo(420, cy + 35);
      ctx.lineTo(380, cy + 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Annular MHD Ionization Cowl & Magnetic ExB Coils (380 to 420)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(380, cy - 45); ctx.lineTo(420, cy - 40);
      ctx.moveTo(380, cy + 45); ctx.lineTo(420, cy + 40);
      ctx.stroke();

      // Ambient Atmospheric Ionized Plasma Particles
      if (Math.random() < 0.4) {
        plasmaParticlesRef.current.push({
          x: 200,
          y: cy + (Math.random() - 0.5) * 80,
          vx: 12 + machNumber * 0.5,
        });
      }

      plasmaParticlesRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = p.x > 400 ? '#ec4899' : '#06b6d4';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = p.x > 400 ? 15 : 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.x > 400 ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      plasmaParticlesRef.current = plasmaParticlesRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `AIR-BREATHING LASER-MHD: MACH ${machNumber} (LASER BEAM = ${laserPowerMw} MW | EXHAUST = ${plasmaExhaustVelocityKms} km/s | THRUST = ${thrustKiloNewtons} kN)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [laserPowerMw, machNumber, plasmaExhaustVelocityKms, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Plane className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                AIR-BREATHING LASER-MHD // PROPELLANTLESS SSTO AEROSPACE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LEIK MYRABO (NASA GLENN / LIGHTCRAFT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Beamed multi-megawatt optical breakdown & atmospheric Lorentz plasma drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">ASCENT VELOCITY</div>
            <div className="text-xl font-bold text-cyan-400">MACH {machNumber}</div>
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
              <span className="text-cyan-400 font-bold">LASER: {laserPowerMw} MW</span>
              <span className="text-pink-400 font-bold">EXHAUST: {plasmaExhaustVelocityKms} km/s</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: ZERO PROPELLANT MASS SSTO ASCENT</div>
          </div>
        </div>

        {/* MHD Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LASER BEAM POWER
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Beamed Power:</span>
              <span className="text-cyan-400 font-bold">{laserPowerMw} MW</span>
            </div>
            <input
              type="range"
              min={10}
              max={150}
              step={5}
              value={laserPowerMw}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLaserPowerMw(val);
                setThrustKiloNewtons(val * 17);
                setMachNumber(Math.floor(10 + val * 0.15));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Optical Air Breakdown:</strong> Pulsed multi-megawatt laser beams focus at the parabolic craft rim, flash-heating ambient air into super-hot $30,000\text{ K}$ conductive plasma!</div>
            <div>• <strong>MHD Lorentz Acceleration:</strong> Superconducting coils establish magnetic fields that accelerate the plasma out the annular cowl via $\vec{J} \times \vec{B}$ Lorentz forces!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
