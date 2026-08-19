import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function StagedArmatureCorvette() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pelletVelocityKmS, setPelletVelocityKmS] = useState(120); // 120 km/s hypervelocity projectile
  const [railgunStagesCount, setRailgunStagesCount] = useState(8); // 8-stage coaxial accelerator
  const [specificImpulseSec, setSpecificImpulseSec] = useState(540000); // 540,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(14000); // 14,000 kN corvette thrust

  const animFrameRef = useRef<number | null>(null);
  const corvettePlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Staged Plasma Armature Railgun Fusion Canvas
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

      // Staged Coaxial Railgun Accelerator Bore (Left: 60 to 220)
      const numStages = railgunStagesCount;
      const stageWidth = 160 / numStages;

      for (let s = 0; s < numStages; s++) {
        const sx = 60 + s * stageWidth;

        // Stage Coils (Top & Bottom)
        ctx.fillStyle = (s + Math.floor(time * 6)) % numStages === 0 ? '#ec4899' : '#334155';
        ctx.fillRect(sx, cy - 35, stageWidth - 2, 8);
        ctx.fillRect(sx, cy + 27, stageWidth - 2, 8);
      }

      // Upper & Lower Rails
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(60, cy - 20); ctx.lineTo(220, cy - 20);
      ctx.moveTo(60, cy + 20); ctx.lineTo(220, cy + 20);
      ctx.stroke();

      // Moving High-Velocity Macroscopic Fusion Pellet + Plasma Armature
      const pelletProgress = (time * (pelletVelocityKmS / 120) * 8) % 160;
      const px = 60 + pelletProgress;

      // Glowing Plasma Armature
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(px, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Magnetic Stagnation Target Reaction Chamber (at 220, cy)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(220, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('STAGNATION', 194, cy + 2.5);

      // Magnetic Aerospike Expansion Divertor Nozzle (220 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(220, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(220, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // Relativistic Thermonuclear Fusion Exhaust Plumes
      if (Math.random() < 0.85) {
        corvettePlasmaJetsRef.current.push({
          x: 220,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 44 + (pelletVelocityKmS / 120) * 10,
        });
      }

      corvettePlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      corvettePlasmaJetsRef.current = corvettePlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `STAGED ARMATURE CORVETTE: PELLET VELOCITY = ${pelletVelocityKmS} km/s | STAGES = ${railgunStagesCount} | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pelletVelocityKmS, railgunStagesCount, specificImpulseSec, thrustKiloNewtons]);

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                STAGED ARMATURE // 540,000s Isp FUSION CORVETTE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                MARSHALL, BARBER & NEURINGER (ANU & LANL)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              120 km/s hypervelocity staged plasma armature macro-pellet fusion corvette for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CORVETTE THRUST</div>
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
              <span className="text-emerald-400 font-bold">PELLET VELOCITY: {pelletVelocityKmS} km/s</span>
              <span className="text-pink-400 font-bold">STAGES: {railgunStagesCount} COAXIAL</span>
              <span className="text-cyan-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: HYPERVELOCITY PELLET STAGNATION IGNITION NOMINAL</div>
          </div>
        </div>

        {/* Railgun Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PELLET SPEED (km/s)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Hypervelocity Speed:</span>
              <span className="text-emerald-400 font-bold">{pelletVelocityKmS} km/s</span>
            </div>
            <input
              type="range"
              min={60}
              max={200}
              step={10}
              value={pelletVelocityKmS}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPelletVelocityKmS(val);
                setThrustKiloNewtons(Math.floor(val * 116.66));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Staged Plasma Armature Acceleration:</strong> Sequential pulsed power stages switch magnetic driving arcs, accelerating macroscopic cryogenic fusion pellets past 120 km/s without rail erosion!</div>
            <div>• <strong>Impact Stagnation Ignition:</strong> Hypervelocity projectile kinetic energy compresses the target fuel to gigabar pressures upon impact, unlocking 540,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
