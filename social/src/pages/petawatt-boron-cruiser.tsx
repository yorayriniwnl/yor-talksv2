import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PetawattBoronCruiser() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [laserIntensityPetawattCm2, setLaserIntensityPetawattCm2] = useState(18); // 18 x 10^18 W/cm2
  const [ponderomotiveAlphaYieldRatio, setPonderomotiveAlphaYieldRatio] = useState(94); // 94% alpha energy conversion
  const [specificImpulseSec, setSpecificImpulseSec] = useState(260000); // 260,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(4200); // 4,200 kN heavy cruiser thrust

  const animFrameRef = useRef<number | null>(null);
  const alphaExhaustJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Petawatt Laser Block-Ignition Proton-Boron (p-11B) Canvas
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

      // Petawatt Laser Pulse Driver Beams (Left: 40 to 140)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(40, cy - 25); ctx.lineTo(140, cy - 5);
      ctx.moveTo(40, cy + 25); ctx.lineTo(140, cy + 5);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Solid Decaborane (B10H14) Target Pellet (at 150, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(150, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Non-Linear Ponderomotive Force Block Ignition Shockwave (at 170, cy)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(170, cy, 32, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magnetic Relativistic Exhaust Divertor Nozzle (220 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(220, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(220, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // Triple Alpha Particle Exhaust Streams (p + 11B -> 3 alpha + 8.7 MeV)
      if (Math.random() < 0.7) {
        alphaExhaustJetsRef.current.push({
          x: 220,
          y: cy + (Math.random() - 0.5) * 18,
          vx: 26 + (laserIntensityPetawattCm2 / 18) * 8,
        });
      }

      alphaExhaustJetsRef.current.forEach((a) => {
        a.x += a.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      alphaExhaustJetsRef.current = alphaExhaustJetsRef.current.filter(a => a.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PETAWATT p-11B CRUISER: INTENSITY = ${laserIntensityPetawattCm2}x10¹⁸ W/cm² | ALPHA YIELD = ${ponderomotiveAlphaYieldRatio}% | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [laserIntensityPetawattCm2, ponderomotiveAlphaYieldRatio, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-red-300 to-cyan-400">
                PETAWATT BORON CRUISER // ANEUTRONIC BLOCK-IGNITION DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                260,000s Isp (HORA & MILEY - UNSW & UNIV OF ILLINOIS)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Non-linear ponderomotive block ignition & 4,200 kN aneutronic star-cruiser drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CRUISER THRUST</div>
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
              <span className="text-amber-400 font-bold">INTENSITY: {laserIntensityPetawattCm2}x10¹⁸ W/cm²</span>
              <span className="text-pink-400 font-bold">ALPHA YIELD: {ponderomotiveAlphaYieldRatio}%</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: ZERO NEUTRON ANEUTRONIC PROPULSION NOMINAL</div>
          </div>
        </div>

        {/* Petawatt Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LASER INTENSITY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Ponderomotive Field:</span>
              <span className="text-amber-400 font-bold">{laserIntensityPetawattCm2}x10¹⁸ W/cm²</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={2}
              value={laserIntensityPetawattCm2}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLaserIntensityPetawattCm2(val);
                setThrustKiloNewtons(Math.floor(val * 233));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Ponderomotive Block Ignition:</strong> Gigawatt-per-micron electrodynamic forces accelerate solid plasma blocks in picoseconds, bypassing thermal Maxwellian equilibration limits!</div>
            <div>• <strong>Clean Aneutronic Thrust:</strong> 100% of the fusion energy is released into charged alpha particles, enabling direct magnetic nozzle thrust without radiation shielding!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
