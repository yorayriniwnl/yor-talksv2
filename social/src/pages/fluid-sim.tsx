import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Waves, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Palette, Droplets, Wind
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface FluidParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export default function FluidSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [viscosity, setViscosity] = useState(0.96);
  const [vorticity, setVorticity] = useState(1.2);
  const [particleDensity, setParticleDensity] = useState(800);
  const [activePaletteIndex, setActivePaletteIndex] = useState(0);
  const [isInjecting, setIsInjecting] = useState(false);

  const PALETTES = [
    ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'],
    ['#10b981', '#14b8a6', '#06b6d4', '#f59e0b'],
    ['#f43f5e', '#fb923c', '#facc15', '#a855f7'],
  ];

  const particlesRef = useRef<FluidParticle[]>([]);
  const mousePosRef = useRef({ x: 300, y: 250, px: 300, py: 250, down: false });
  const animFrameRef = useRef<number | null>(null);

  // Initialize Particles
  const initFluid = () => {
    const pts: FluidParticle[] = [];
    const colors = PALETTES[activePaletteIndex];
    for (let i = 0; i < particleDensity; i++) {
      pts.push({
        x: Math.random() * 700,
        y: Math.random() * 500,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
        maxLife: Math.random() * 80 + 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3 + 1.5,
      });
    }
    particlesRef.current = pts;
  };

  useEffect(() => {
    initFluid();
  }, [particleDensity, activePaletteIndex]);

  // Mouse Interactivity
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const m = mousePosRef.current;
    m.px = m.x;
    m.py = m.y;
    m.x = x;
    m.y = y;

    // Inject particles on drag
    if (m.down) {
      const colors = PALETTES[activePaletteIndex];
      const dx = m.x - m.px;
      const dy = m.y - m.py;

      for (let i = 0; i < 8; i++) {
        particlesRef.current.push({
          x: m.x + (Math.random() - 0.5) * 20,
          y: m.y + (Math.random() - 0.5) * 20,
          vx: dx * 0.8 + (Math.random() - 0.5) * 4,
          vy: dy * 0.8 + (Math.random() - 0.5) * 4,
          life: 1,
          maxLife: 60,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 4 + 2,
        });
      }
    }
  };

  // Navier-Stokes Particle Fluid Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.02;

      // Slight trail persistence
      ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const m = mousePosRef.current;
      const mouseSpeedX = m.x - m.px;
      const mouseSpeedY = m.y - m.py;

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];

        // 1. Fluid Velocity Field (Perlin-like Curl Noise & Vorticity)
        const angle = Math.sin(p.x * 0.01 + time) * Math.cos(p.y * 0.01 + time) * Math.PI * vorticity;
        p.vx += Math.cos(angle) * 0.2;
        p.vy += Math.sin(angle) * 0.2;

        // 2. Mouse Hydrodynamic Force Injection
        const distToMouse = Math.hypot(p.x - m.x, p.y - m.y);
        if (distToMouse < 90) {
          const force = (1 - distToMouse / 90) * 2.5;
          p.vx += mouseSpeedX * force * 0.3;
          p.vy += mouseSpeedY * force * 0.3;
        }

        // 3. Viscosity Damping
        p.vx *= viscosity;
        p.vy *= viscosity;

        p.x += p.vx;
        p.y += p.vy;

        // Boundary reflection
        if (p.x < 0 || p.x > canvas.width) p.vx *= -0.8;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -0.8;

        // Draw Fluid Particle Node
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [viscosity, vorticity, activePaletteIndex]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Droplets className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                FLUID SIM // NAVIER-STOKES HYDRODYNAMICS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CURL NOISE VORTICITY
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Interactive incompressible fluid dynamics & neon dye injection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => {
              uiaudio.warp();
              initFluid();
            }}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Reset Fluid Field"
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
            height={520}
            onMouseDown={() => { mousePosRef.current.down = true; }}
            onMouseUp={() => { mousePosRef.current.down = false; }}
            onMouseMove={handleMouseMove}
            className="w-full h-auto block cursor-crosshair"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div>CLICK & DRAG TO INJECT HIGH-VELOCITY DYE STREAMS</div>
            <div>PARTICLES: {particlesRef.current.length} ACTIVE</div>
          </div>
        </div>

        {/* Fluid Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              HYDRODYNAMIC CONTROLS
            </h3>
          </div>

          {/* Viscosity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Kinematic Viscosity:</span>
              <span className="text-cyan-400 font-bold">{viscosity}</span>
            </div>
            <input
              type="range"
              min={0.90}
              max={0.99}
              step={0.005}
              value={viscosity}
              onChange={(e) => setViscosity(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Vorticity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Vorticity Confinement:</span>
              <span className="text-indigo-400 font-bold">{vorticity}x</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.1}
              value={vorticity}
              onChange={(e) => setVorticity(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Palette Selector */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <span className="text-zinc-400 font-bold">CHROMATIC DYE SPECTRUM:</span>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {PALETTES.map((pal, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    uiaudio.hover();
                    setActivePaletteIndex(idx);
                  }}
                  className={cn(
                    "p-2 rounded-xl border flex items-center justify-center space-x-1",
                    activePaletteIndex === idx ? "bg-zinc-800 border-cyan-400 shadow-md" : "bg-zinc-950 border-white/5"
                  )}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pal[0] }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pal[3] }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
