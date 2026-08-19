import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CbtFusionDreadnought() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [collidingBeamEnergyKev, setCollidingBeamEnergyKev] = useState(650); // 650 keV center-of-mass resonance
  const [torusMagneticFieldTesla, setTorusMagneticFieldTesla] = useState(8.5); // 8.5 T field-reversed torus
  const [specificImpulseSec, setSpecificImpulseSec] = useState(500000); // 500,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(12000); // 12,000 kN dreadnought thrust

  const animFrameRef = useRef<number | null>(null);
  const cbtPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Colliding Beam Torus (CBT) Aneutronic Fusion Canvas
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

      // Toroidal Magnetic Field Coils (Left: 60 to 220)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(60, cy - 65, 160, 130);

      // Counter-Rotating Proton Beam Ring (Clockwise - Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(140, cy, 60, 45, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Counter-Rotating Boron-11 Beam Ring (Counter-Clockwise - Pink)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(140, cy, 45, 30, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Moving High-Energy Beam Particles
      const numParticles = 6;
      for (let p = 0; p < numParticles; p++) {
        // Proton
        const pAng = (p / numParticles) * Math.PI * 2 + time * 0.8;
        const px = 140 + Math.cos(pAng) * 60;
        const py = cy + Math.sin(pAng) * 45;
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        // Boron-11
        const bAng = (p / numParticles) * Math.PI * 2 - time * 0.8;
        const bx = 140 + Math.cos(bAng) * 45;
        const by = cy + Math.sin(bAng) * 30;
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 650 keV Thermonuclear Collision Center (at 140, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(140, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('650keV', 125, cy + 3);

      // Magnetic Aerospike Expansion Divertor Nozzle (220 to 520)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(220, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(220, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Particle Exhaust Streams
      if (Math.random() < 0.85) {
        cbtPlasmaJetsRef.current.push({
          x: 220,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 40 + (collidingBeamEnergyKev / 650) * 10,
        });
      }

      cbtPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      cbtPlasmaJetsRef.current = cbtPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `COLLIDING BEAM TORUS: BEAM ENERGY = ${collidingBeamEnergyKev} keV | TORUS B = ${torusMagneticFieldTesla} T | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [collidingBeamEnergyKev, torusMagneticFieldTesla, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400">
                CBT FUSION DREADNOUGHT // 500,000s Isp ANEUTRONIC DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ROSTOKER, MONKHORST & BINDERBAUER (TAE TECHNOLOGIES)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              650 keV counter-rotating colliding beam torus aneutronic p-11B starship for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">DREADNOUGHT THRUST</div>
            <div className="text-xl font-bold text-amber-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-amber-400 font-bold">BEAM RESONANCE: {collidingBeamEnergyKev} keV</span>
              <span className="text-cyan-400 font-bold">TORUS B: {torusMagneticFieldTesla} T</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: COUNTER-ROTATING COLLIDING BEAM TORUS NOMINAL</div>
          </div>
        </div>

        {/* CBT Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BEAM ENERGY (keV)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Center-of-Mass Energy:</span>
              <span className="text-amber-400 font-bold">{collidingBeamEnergyKev} keV</span>
            </div>
            <input
              type="range"
              min={300}
              max={1000}
              step={25}
              value={collidingBeamEnergyKev}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCollidingBeamEnergyKev(val);
                setThrustKiloNewtons(Math.floor(val * 18.46));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Resonant Non-Maxwellian Fusion:</strong> Operates at the exact 650 keV nuclear cross-section resonance for proton-boron fusion ($p + {}^{11}\text{B} \to 3\,{}^4\text{He}$), bypassing thermal Bremsstrahlung loss!</div>
            <div>• <strong>Field-Reversed Beam Torus:</strong> Self-generated azimuthal diamagnetic currents stabilize the colliding beam rings, producing 500,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
