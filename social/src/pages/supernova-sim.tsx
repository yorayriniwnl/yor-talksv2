import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Award, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const SHELLS = [
  { name: 'Hydrogen (¹H)', color: '#38bdf8', r: 240 },
  { name: 'Helium (⁴He)', color: '#06b6d4', r: 200 },
  { name: 'Carbon (¹²C)', color: '#10b981', r: 160 },
  { name: 'Neon (²⁰Ne)', color: '#eab308', r: 120 },
  { name: 'Oxygen (¹⁶O)', color: '#f97316', r: 85 },
  { name: 'Silicon (²⁸Si)', color: '#ef4444', r: 55 },
  { name: 'Iron Core (⁵⁶Fe)', color: '#a855f7', r: 28 },
];

export default function SupernovaSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [starMassSolar, setStarMassSolar] = useState(25);
  const [coreDensityGcm3, setCoreDensityGcm3] = useState('1.2e9');
  const [exploded, setExploded] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const explosionParticles = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);

  const triggerSupernova = () => {
    uiaudio.warp();
    setExploded(true);

    const parts = [];
    const colors = ['#ffffff', '#06b6d4', '#ec4899', '#f59e0b', '#8b5cf6'];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 4;
      parts.push({
        x: 370,
        y: 250,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: Math.random() * 80 + 40,
      });
    }
    explosionParticles.current = parts;
  };

  const handleReset = () => {
    uiaudio.click();
    setExploded(false);
    explosionParticles.current = [];
  };

  // Supernova Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!exploded) {
        // Render Onion Shells
        SHELLS.forEach((sh) => {
          ctx.strokeStyle = sh.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = sh.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, sh.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        });

        // Glowing Iron Core
        const coreGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 30);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.6, '#a855f7');
        coreGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Render Expanding Supernova Shockwave Particles
        explosionParticles.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.5;

          if (p.life > 0) {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });

        // Central Neutron Star / Black Hole Remnant
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [exploded]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Sun className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                SUPERNOVA // STELLAR CORE COLLAPSE 25 M☉
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                CHANDRASEKHAR LIMIT 1.44 M☉
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Onion-shell fusion layers & rapid neutron capture r-process nucleosynthesis for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerSupernova}
            disabled={exploded}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{exploded ? 'SUPERNOVA DETONATED' : 'TRIGGER CORE COLLAPSE'}</span>
          </button>

          {exploded && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={740}
            height={500}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-amber-400 font-bold">STELLAR MASS: {starMassSolar} M☉</span>
              <span className="text-rose-400 font-bold">CORE DENSITY: {coreDensityGcm3} g/cm³</span>
            </div>
            <div>STATUS: {exploded ? 'REMNANT: NEUTRON STAR CREATED' : 'ONION SHELL EQUILIBRIUM'}</div>
          </div>
        </div>

        {/* Onion Shell Layers (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            FUSION SHELLS
          </h3>

          <div className="space-y-1.5">
            {SHELLS.map((s) => (
              <div
                key={s.name}
                className="p-2.5 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-zinc-300 font-bold">{s.name}</span>
                </div>
                <span className="text-zinc-500 text-[10px]">r = {s.r}px</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
