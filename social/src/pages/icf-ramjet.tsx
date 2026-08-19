import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function IcfRamjet() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [scoopRadiusKm, setScoopRadiusKm] = useState(1000); // 1,000 km magnetic scoop
  const [relativisticBeta, setRelativisticBeta] = useState(0.35); // 0.35c cruise velocity
  const [specificImpulseSec, setSpecificImpulseSec] = useState(100000); // 100,000 s Isp
  const [thrustMegaNewtons, setThrustMegaNewtons] = useState(2.4); // 2.4 MN thrust

  const animFrameRef = useRef<number | null>(null);
  const protonStreamRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Bussard Laser-ICF Magnetic Scoop Ramjet Canvas
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

      // Dark Interstellar Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Massive 1,000-km Magnetic Scoop Field Lines (Left: 60 to 320)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      for (let offset = 40; offset <= 160; offset += 40) {
        ctx.beginPath();
        ctx.moveTo(60, cy - offset * 1.5);
        ctx.bezierCurveTo(200, cy - offset * 0.8, 280, cy - 30, 320, cy - 15);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(60, cy + offset * 1.5);
        ctx.bezierCurveTo(200, cy + offset * 0.8, 280, cy + 30, 320, cy + 15);
        ctx.stroke();
      }

      // Ramjet Starship Core & Laser-ICF Combustion Chamber (320 to 440)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.fillRect(320, cy - 25, 120, 50);
      ctx.strokeRect(320, cy - 25, 120, 50);

      // Magnetic Exhaust Expansion Nozzle (440 to 560)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(440, cy - 20); ctx.lineTo(560, cy - 80);
      ctx.moveTo(440, cy + 20); ctx.lineTo(560, cy + 80);
      ctx.stroke();

      // Interstellar Hydrogen Inflow Particles
      if (Math.random() < 0.3) {
        protonStreamRef.current.push({
          x: 40,
          y: cy + (Math.random() - 0.5) * 260,
          vx: 9 + relativisticBeta * 10,
        });
      }

      protonStreamRef.current.forEach((p) => {
        p.x += p.vx;
        // Funnel towards scoop throat (320, cy)
        if (p.x < 320) {
          p.y += (cy - p.y) * 0.08;
        }

        ctx.fillStyle = p.x > 320 ? '#ec4899' : '#38bdf8';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = p.x > 320 ? 15 : 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.x > 320 ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      protonStreamRef.current = protonStreamRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `BUSSARD ICF RAMJET: SCOOP R = ${scoopRadiusKm.toLocaleString()} km (v = ${relativisticBeta}c | I_sp = ${specificImpulseSec.toLocaleString()} s | F = ${thrustMegaNewtons} MN)`,
        70,
        cy + 175
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scoopRadiusKm, relativisticBeta, specificImpulseSec, thrustMegaNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Compass className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                BUSSARD ICF RAMJET // RELATIVISTIC INTERSTELLAR STARSHIP
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                100,000s Isp (BUSSARD & ANDREWS - BIS)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              1,000-km magnetic scoop & laser-compressed D-D fusion acceleration for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CRUISE VELOCITY</div>
            <div className="text-xl font-bold text-cyan-400">{relativisticBeta} <span className="text-xs">c</span></div>
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
              <span className="text-cyan-400 font-bold">SCOOP: {scoopRadiusKm} km</span>
              <span className="text-pink-400 font-bold">VELOCITY: {relativisticBeta}c</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustMegaNewtons} MN</span>
            </div>
            <div>STATUS: UNLIMITED INTERSTELLAR PROPELLANT COLLECTION</div>
          </div>
        </div>

        {/* Ramjet Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              MAGNETIC SCOOP RADIUS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Scoop Field Radius:</span>
              <span className="text-cyan-400 font-bold">{scoopRadiusKm} km</span>
            </div>
            <input
              type="range"
              min={500}
              max={2500}
              step={100}
              value={scoopRadiusKm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setScoopRadiusKm(val);
                setThrustMegaNewtons(+(val * 0.0024).toFixed(2));
                setRelativisticBeta(+(0.2 + val * 0.00015).toFixed(2));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No Propellant Mass Fraction:</strong> Collects diffuse interstellar neutral hydrogen ($1\text{ atom/cm}^3$) directly along the flight corridor!</div>
            <div>• <strong>Laser-ICF Compression:</strong> Overcomes the small p-p fusion cross-section by compressing collected deuterium into micro-pellets with high-rep laser drivers!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
