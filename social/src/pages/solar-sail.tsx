import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SolarSail() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [sailAreaM2, setSailAreaM2] = useState(1600); // 1,600 m^2 (40m x 40m aluminized Mylar sail)
  const [sailTiltDeg, setSailTiltDeg] = useState(35); // 35 deg pitch angle relative to Sun
  const [radiationPressureUn, setRadiationPressureUn] = useState(9.1); // 9.1 uN/m^2 at 1 AU
  const [isStatiteHover, setIsStatiteHover] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const photonsRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  const toggleStatite = () => {
    uiaudio.warp();
    setIsStatiteHover(prev => !prev);
  };

  // Solar Radiation Pressure & Photonic Reflection Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // The Sun (Left 0, cy)
      const sunGrad = ctx.createRadialGradient(0, cy, 10, 0, cy, 140);
      sunGrad.addColorStop(0, '#ffffff');
      sunGrad.addColorStop(0.3, '#f59e0b');
      sunGrad.addColorStop(0.8, '#ef4444');
      sunGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(0, cy, 140, 0, Math.PI * 2);
      ctx.fill();

      // Ultra-Thin Reflective Solar Sail (Position ~ 360, cy)
      const sailX = 360;
      const sailLen = 140;
      const rad = (sailTiltDeg * Math.PI) / 180;

      const sx1 = sailX - Math.sin(rad) * (sailLen / 2);
      const sy1 = cy - Math.cos(rad) * (sailLen / 2);
      const sx2 = sailX + Math.sin(rad) * (sailLen / 2);
      const sy2 = cy + Math.cos(rad) * (sailLen / 2);

      // Sail Membrane (Aluminized Polyimide with Neon Cyan / Silver Sheen)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1); ctx.lineTo(sx2, sy2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Center Payload Bus (CubeSat)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sailX - 8, cy - 8, 16, 16);

      // Spawn Incident Solar Photons from the Sun
      for (let i = 0; i < 6; i++) {
        photonsRef.current.push({
          x: 40,
          y: cy + (Math.random() - 0.5) * 180,
          vx: Math.random() * 4 + 8,
          vy: 0,
          life: 70,
        });
      }

      // Draw Incident & Specularly Reflected Photons
      photonsRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1.5;

        // Reflection off Sail
        if (p.x >= sailX - 10 && p.x <= sailX + 10 && p.vx > 0) {
          // Specular reflection angle 2*theta
          p.vx = -Math.cos(rad * 2) * 8;
          p.vy = Math.sin(rad * 2) * 8;
        }

        if (p.life > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      photonsRef.current = photonsRef.current.filter(p => p.life > 0 && p.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sailTiltDeg, sailAreaM2]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Sun className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400">
                SOLAR PHOTONIC SAIL // RADIATION PRESSURE PROPULSION (IKAROS/ACS3)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                P = 2 S_0 / c ≈ 9.1 μN/m²
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Zero-propellant photon momentum transfer & non-Keplerian statite levitation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleStatite}
            className={cn(
              "px-6 py-3 rounded-xl font-bold shadow-lg flex items-center space-x-2 transition-all",
              isStatiteHover ? "bg-cyan-600 text-white shadow-cyan-500/30" : "bg-gradient-to-r from-amber-500 to-yellow-600 text-black"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>{isStatiteHover ? 'STATITE LEVITATION ACTIVE (RADIATION EQUALS GRAVITY)' : 'HOVER AS NON-KEPLERIAN STATITE'}</span>
          </button>
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
              <span className="text-amber-400 font-bold">SAIL AREA: {sailAreaM2} m²</span>
              <span className="text-cyan-400 font-bold">TOTAL FORCE: {((radiationPressureUn * sailAreaM2) / 1000).toFixed(2)} mN</span>
              <span className="text-pink-400 font-bold">TILT: {sailTiltDeg}°</span>
            </div>
            <div>STATUS: {isStatiteHover ? 'NON-KEPLERIAN STATITE EQUILIBRIUM' : 'CONTINUOUS HELIOCENTRIC ORBIT RAISING'}</div>
          </div>
        </div>

        {/* Sail Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PITCH ANGLE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Sail Tilt Angle (θ):</span>
              <span className="text-amber-400 font-bold">{sailTiltDeg}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={sailTiltDeg}
              onChange={(e) => setSailTiltDeg(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Infinite Delta-V:</strong> Solar sails require zero reaction propellant. Sunlight delivers continuous radiation pressure (2S₀/c) for perpetual acceleration across the Solar System!</div>
            <div>• <strong>Statites:</strong> By balancing solar gravity with solar radiation pressure, a solar sail can hover motionless above a planet's poles without falling into orbit!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
