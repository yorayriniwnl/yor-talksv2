import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PlasmaGunDestroyer() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [coaxialPlasmaGunsCount, setCoaxialPlasmaGunsCount] = useState(60); // 60 spherical coaxial plasma guns
  const [plasmaLinerVelocityKms, setPlasmaLinerVelocityKms] = useState(120); // 120 km/s jet velocity
  const [specificImpulseSec, setSpecificImpulseSec] = useState(320000); // 320,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(6000); // 6,000 kN heavy destroyer thrust

  const animFrameRef = useRef<number | null>(null);
  const plasmaGunJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Spherical Magnetized Plasma Gun Liner Implosion Canvas
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

      // Spherical Array of 60 Coaxial Plasma Guns (Left: 80 to 240)
      const numGuns = 8;
      for (let g = 0; g < numGuns; g++) {
        const angle = (g / numGuns) * Math.PI * 2 + time * 0.5;
        const gx = 160 + Math.cos(angle) * 60;
        const gy = cy + Math.sin(angle) * 60;

        // Plasma Gun Barrel
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(160 + Math.cos(angle) * 35, cy + Math.sin(angle) * 35);
        ctx.stroke();

        // Gun Firing Muzzle Flash
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(gx, gy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central Magnetized Fusion Stagnation Core (at 160, cy)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(160, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magnetic Expansion Aerospike Exhaust Nozzle (240 to 520)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(240, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(240, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // High-Velocity Plasma Liner Fusion Exhaust Streams
      if (Math.random() < 0.7) {
        plasmaGunJetsRef.current.push({
          x: 240,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 28 + (plasmaLinerVelocityKms / 120) * 8,
        });
      }

      plasmaGunJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      plasmaGunJetsRef.current = plasmaGunJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PLASMA GUN DESTROYER: GUNS = ${coaxialPlasmaGunsCount} | JET SPEED = ${plasmaLinerVelocityKms} km/s | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [coaxialPlasmaGunsCount, plasmaLinerVelocityKms, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                PLASMA GUN DESTROYER // 320,000s Isp PLASMOID LINER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                HSU, AWE & CASSIBRY (LANL, SANDIA & UAH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              60-gun spherical plasma jet liner implosion & 6,000 kN heavy destroyer drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">DESTROYER THRUST</div>
            <div className="text-xl font-bold text-cyan-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-cyan-400 font-bold">COAXIAL GUNS: {coaxialPlasmaGunsCount}</span>
              <span className="text-pink-400 font-bold">JET VELOCITY: {plasmaLinerVelocityKms} km/s</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: SPHERICAL PLASMA LINER STAGNATION NOMINAL</div>
          </div>
        </div>

        {/* Gun Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              JET SPEED (km/s)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Coaxial Liner Velocity:</span>
              <span className="text-cyan-400 font-bold">{plasmaLinerVelocityKms} km/s</span>
            </div>
            <input
              type="range"
              min={60}
              max={200}
              step={10}
              value={plasmaLinerVelocityKms}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPlasmaLinerVelocityKms(val);
                setThrustKiloNewtons(Math.floor(val * 50));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Spherical Plasma Liner Compression:</strong> 60 hyper-velocity coaxial plasma guns merge into a uniform spherical imploding shell, reaching 180 Mbar stagnation pressure without solid liners!</div>
            <div>• <strong>Relativistic Plasmoid Exhaust:</strong> Direct Lorentz divertor acceleration expels thermalized fusion alpha particles at 320,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
