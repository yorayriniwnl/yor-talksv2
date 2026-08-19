import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HeliconFrcCollider() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [collisionVelocityKmS, setCollisionVelocityKmS] = useState(600); // 600 km/s supersonic merger
  const [formationEnergyKiloJoules, setFormationEnergyKiloJoules] = useState(450); // 450 kJ FRC formation
  const [specificImpulseSec, setSpecificImpulseSec] = useState(800000); // 800,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(38000); // 38,000 kN interceptor thrust

  const animFrameRef = useRef<number | null>(null);
  const interceptorPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Supersonic Helicon-FRC Plasmoid Collider Interceptor Canvas
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

      // Opposed Helicon Injector Tubes (Left at x=60 to 120, Right at x=220 to 160)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;

      // Left Helicon RF Antenna Coil
      for (let i = 0; i < 3; i++) {
        const x = 70 + i * 18;
        ctx.beginPath();
        ctx.ellipse(x, cy, 5, 24, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Opposed Incoming FRC Plasmoids colliding at x=140
      const phase = Math.sin(time * 6);
      const leftFrcX = 90 + Math.abs(phase) * 35;
      const rightFrcX = 190 - Math.abs(phase) * 35;

      // Left FRC Toroid (Cyan)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath(); ctx.ellipse(leftFrcX, cy, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Right FRC Toroid (Amber)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.ellipse(rightFrcX, cy, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

      // Central Stagnation & Direct Ignition Core (at 140, cy)
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 34;
      ctx.beginPath();
      ctx.arc(140, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 6.5px monospace';
      ctx.fillText('125keV', 129, cy + 2.5);

      // Magnetic Aerospike Divertor Expansion Nozzle (190 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(190, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(190, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        interceptorPlasmaJetsRef.current.push({
          x: 190,
          y: cy + (Math.random() - 0.5) * 14,
          vx: 66 + (collisionVelocityKmS / 600) * 10,
        });
      }

      interceptorPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      interceptorPlasmaJetsRef.current = interceptorPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `HELICON-FRC COLLIDER: VELOCITY = ${collisionVelocityKmS} km/s | FORMATION = ${formationEnergyKiloJoules} kJ | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [collisionVelocityKmS, formationEnergyKiloJoules, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-amber-400">
                HELICON-FRC COLLIDER // 800,000s Isp INTERCEPTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                HOFFMAN, SLOUGH & HELION (UW & MSNW)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              600 km/s opposed supersonic Helicon-FRC plasmoid collision fusion drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">INTERCEPTOR THRUST</div>
            <div className="text-xl font-bold text-emerald-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-cyan-400 font-bold">COLLISION: {collisionVelocityKmS} km/s</span>
              <span className="text-pink-400 font-bold">ENERGY: {formationEnergyKiloJoules} kJ</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: SUPERSONIC PLASMOID STAGNATION & COMPRESSION CONVERGED</div>
          </div>
        </div>

        {/* FRC Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              COLLISION VELOCITY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Merger Speed:</span>
              <span className="text-emerald-400 font-bold">{collisionVelocityKmS} km/s</span>
            </div>
            <input
              type="range"
              min={300}
              max={900}
              step={50}
              value={collisionVelocityKmS}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCollisionVelocityKmS(val);
                setFormationEnergyKiloJoules(Math.floor(val * 0.75));
                setThrustKiloNewtons(Math.floor(val * 63.3));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Supersonic FRC Merging:</strong> Head-on 600 km/s collision of twin Helicon-formed FRC plasmoids converts bulk kinetic energy into 125 keV ion thermal energy instantly!</div>
            <div>• <strong>Direct Magnetic Compression:</strong> Magnetic field ramp compresses the stagnated toroid to megabar pressures, generating clean aneutronic alpha streams at 800,000s Isp!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
