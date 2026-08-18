import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Orbit, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Compass, Sun, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  color: string;
  trail: { x: number; y: number }[];
  captured: boolean;
}

export default function BlackHoleSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [blackHoleMass, setBlackHoleMass] = useState(4000);
  const [spinParameter, setSpinParameter] = useState(0.85); // Kerr spin (0 to 1)
  const [accretionRate, setAccretionRate] = useState(1.5);
  const [isSimulating, setIsSimulating] = useState(true);
  const [starsCount, setStarsCount] = useState(120);

  const starsRef = useRef<StarParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize N-body Starfield in Stable Keplerian Orbits
  const initStars = () => {
    const stars: StarParticle[] = [];
    for (let i = 0; i < starsCount; i++) {
      const radius = 60 + Math.random() * 260;
      const angle = Math.random() * Math.PI * 2;
      const orbitSpeed = Math.sqrt(blackHoleMass / radius) * 0.95;

      const colors = ['#38bdf8', '#818cf8', '#f43f5e', '#fbbf24', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      stars.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: -Math.sin(angle) * orbitSpeed,
        vy: Math.cos(angle) * orbitSpeed,
        mass: Math.random() * 2 + 1,
        color,
        trail: [],
        captured: false,
      });
    }
    starsRef.current = stars;
  };

  useEffect(() => {
    initStars();
  }, [starsCount, blackHoleMass]);

  // Physics Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let accretionAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const eventHorizonRadius = Math.max(12, (blackHoleMass / 4000) * 22);
      const photonSphereRadius = eventHorizonRadius * 1.5;

      // Dark Cosmic Void Background
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Relativistic Accretion Disk (Doppler Beamed Lensing)
      accretionAngle += 0.03 * spinParameter;

      ctx.save();
      ctx.translate(cx, cy);

      // Upper & Lower Lensed Accretion Ring
      for (let r = eventHorizonRadius + 4; r < eventHorizonRadius + 90; r += 3) {
        const ringGrad = ctx.createLinearGradient(-r, 0, r, 0);
        // Relativistic Doppler Beaming: Approaching side (left) is blueshifted & brighter!
        ringGrad.addColorStop(0, '#38bdf8'); // Blue shifted
        ringGrad.addColorStop(0.4, '#f59e0b'); // Yellow peak
        ringGrad.addColorStop(1, '#ef444433'); // Red shifted & dimmed

        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.38, accretionAngle * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // 2. Event Horizon (Total Optical Blackout)
      ctx.fillStyle = '#000000';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(cx, cy, eventHorizonRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Photon Sphere (Gold Halo Ring)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, photonSphereRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. Update N-Body Star Trajectories (General Relativistic Gravitational Pull)
      if (isSimulating) {
        starsRef.current.forEach((star) => {
          if (star.captured) return;

          const dx = -star.x;
          const dy = -star.y;
          const distSq = star.x * star.x + star.y * star.y;
          const dist = Math.sqrt(distSq);

          // Event Horizon Capture Check
          if (dist < eventHorizonRadius) {
            star.captured = true;
            return;
          }

          // Inverse Square Gravitational Acceleration with relativistic cubic correction
          const force = (blackHoleMass / distSq) * (1 + (3 * eventHorizonRadius) / dist);
          const ax = (dx / dist) * force;
          const ay = (dy / dist) * force;

          star.vx += ax * 0.05;
          star.vy += ay * 0.05;

          star.x += star.vx * 0.05;
          star.y += star.vy * 0.05;

          // Record trail
          star.trail.push({ x: star.x, y: star.y });
          if (star.trail.length > 8) star.trail.shift();
        });
      }

      // 4. Render Stars and Gravitational Orbital Trails
      starsRef.current.forEach((star) => {
        if (star.captured) return;

        // Render Trail
        if (star.trail.length > 1) {
          ctx.strokeStyle = `${star.color}44`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          star.trail.forEach((pt, idx) => {
            const sx = cx + pt.x;
            const sy = cy + pt.y;
            if (idx === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          });
          ctx.stroke();
        }

        // Render Star Node
        const sx = cx + star.x;
        const sy = cy + star.y;

        ctx.fillStyle = star.color;
        ctx.shadowColor = star.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.5, star.mass), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [blackHoleMass, spinParameter, accretionRate, isSimulating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-sky-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(14,165,233,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400/40">
            <Sun className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-400">
                BLACK HOLE // GENERAL RELATIVITY & ACCRETION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                KERR METRIC SPIN
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Relativistic gravitational lensing, Doppler beaming & N-body orbital dynamics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => {
              uiaudio.click();
              setIsSimulating(!isSimulating);
            }}
            className={cn(
              "px-4 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-md",
              isSimulating ? "bg-sky-500/20 text-sky-300 border border-sky-400/40" : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
            )}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isSimulating ? 'SIMULATING ORBITS' : 'PAUSED'}</span>
          </button>
          <button
            onClick={() => {
              uiaudio.warp();
              initStars();
            }}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Reset Starfield"
          >
            <RotateCcw className="w-4 h-4" />
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
            height={530}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-sky-400 font-bold">MASS: {(blackHoleMass / 1000).toFixed(1)}M M☉</span>
              <span className="text-amber-400 font-bold">SPIN (a*): {spinParameter}c</span>
            </div>
            <div>STATUS: SCHWARZSCHILD PHOTON SPHERE STABLE</div>
          </div>
        </div>

        {/* Relativistic Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PHYSICS CONTROLS
            </h3>
          </div>

          {/* Mass */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Singularity Mass (M☉):</span>
              <span className="text-sky-400 font-bold">{blackHoleMass.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={10000}
              step={200}
              value={blackHoleMass}
              onChange={(e) => setBlackHoleMass(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Kerr Spin */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Kerr Spin Parameter (a*):</span>
              <span className="text-indigo-400 font-bold">{spinParameter}</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.99}
              step={0.01}
              value={spinParameter}
              onChange={(e) => setSpinParameter(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Accretion Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Accretion Luminosity:</span>
              <span className="text-amber-400 font-bold">{accretionRate}x Eddington</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.1}
              value={accretionRate}
              onChange={(e) => setAccretionRate(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">RELATIVISTIC PHENOMENA:</span>
            <div>• Left side shows intense Doppler boosting towards observer.</div>
            <div>• Relativistic frame dragging forces stars into prograde orbits.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
