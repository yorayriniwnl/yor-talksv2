import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SpheromakPlasmaLiner() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [plasmaGunsCount, setPlasmaGunsCount] = useState(60); // 60 coaxial plasma railguns
  const [spheromakFieldTesla, setSpheromakFieldTesla] = useState(5.0); // 5.0 T seed magnetic field
  const [specificImpulseSec, setSpecificImpulseSec] = useState(480000); // 480,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(11000); // 11,000 kN flagship thrust

  const animFrameRef = useRef<number | null>(null);
  const flagshipPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Coaxial Plasma-Liner Implosion of Central Spheromak Canvas
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

      // Spherical Chamber with 60 Converging Coaxial Plasma Jets (Left: 60 to 220)
      const numGuns = 8;
      for (let g = 0; g < numGuns; g++) {
        const angle = (g / numGuns) * Math.PI * 2 + time * 0.2;
        const gunX = 140 + Math.cos(angle) * 65;
        const gunY = cy + Math.sin(angle) * 65;

        // Gun Nozzle
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(gunX, gunY, 6, 0, Math.PI * 2);
        ctx.fill();

        // High-Mach Inward Plasma Jet
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gunX, gunY); ctx.lineTo(140, cy);
        ctx.stroke();
      }

      // Imploding Spherical Stagnation Liner (at 140, cy)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(140, cy, 32, 0, Math.PI * 2);
      ctx.stroke();

      // Compressed High-Beta Spheromak Core (Closed Magnetic Flux)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 32;
      ctx.beginPath();
      ctx.ellipse(140, cy, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('SPHEROMAK', 118, cy + 3);

      // Magnetic Aerospike Expansion Divertor Nozzle (220 to 520)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(220, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(220, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // Relativistic Thermonuclear Fusion Exhaust Plumes
      if (Math.random() < 0.85) {
        flagshipPlasmaJetsRef.current.push({
          x: 220,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 38 + (spheromakFieldTesla / 5) * 10,
        });
      }

      flagshipPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      flagshipPlasmaJetsRef.current = flagshipPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `SPHEROMAK PLASMA-LINER: GUNS = ${plasmaGunsCount} | SPHEROMAK B = ${spheromakFieldTesla} T | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [plasmaGunsCount, spheromakFieldTesla, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-amber-400">
                SPHEROMAK PLASMA-LINER // 480,000s Isp FLAGSHIP
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                HSU, TACCETTI & AWE (LANL & ARPA-E ALPHA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              60-gun supersonic plasma-liner imploding spheromak flagship for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">FLAGSHIP THRUST</div>
            <div className="text-xl font-bold text-pink-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-pink-400 font-bold">COAXIAL GUNS: {plasmaGunsCount}</span>
              <span className="text-amber-400 font-bold">SPHEROMAK B: {spheromakFieldTesla} T</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: CONVERGING SUPERSONIC PLASMA LINER IMPLOSION NOMINAL</div>
          </div>
        </div>

        {/* Plasma Liner Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SEED FIELD (T)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Spheromak Initial B:</span>
              <span className="text-pink-400 font-bold">{spheromakFieldTesla} T</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={10.0}
              step={0.5}
              value={spheromakFieldTesla}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSpheromakFieldTesla(val);
                setThrustKiloNewtons(Math.floor(val * 2200));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Standoff Plasma Compression:</strong> 60 coaxial plasma railguns fire converging high-Mach argon jets, forming an imploding heavy liner that compresses a magnetized spheromak without solid wall destruction!</div>
            <div>• <strong>Megabar Flux Compression:</strong> Self-generated magnetic toroid isolates the thermonuclear plasma, achieving 480,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
