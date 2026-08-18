import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Globe2, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface SatStatite {
  radius: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
}

export default function DysonSwarm() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [statiteCount, setStatiteCount] = useState(160);
  const [harvestedYottawatts, setHarvestedYottawatts] = useState(384.6); // 10^24 W
  const [kardashevLevel, setKardashevLevel] = useState(2.14);
  const [isBeaming, setIsBeaming] = useState(true);

  const statitesRef = useRef<SatStatite[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const initSwarm = () => {
    const arr: SatStatite[] = [];
    const colors = ['#38bdf8', '#06b6d4', '#eab308', '#f59e0b', '#ffffff'];

    for (let i = 0; i < statiteCount; i++) {
      arr.push({
        radius: 70 + Math.random() * 190,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 2 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    statitesRef.current = arr;
  };

  useEffect(() => {
    initSwarm();
  }, [statiteCount]);

  // Dyson Swarm Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Space
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Central Host Star (Solar Luminosity Core)
      const starGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 75);
      starGrad.addColorStop(0, '#ffffff');
      starGrad.addColorStop(0.3, '#f59e0b');
      starGrad.addColorStop(0.7, '#ea580c');
      starGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');

      ctx.fillStyle = starGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.arc(cx, cy, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Update & Draw Dyson Statites Orbiting in Rings
      statitesRef.current.forEach((sat) => {
        sat.angle += sat.speed;
        const x = cx + Math.cos(sat.angle) * sat.radius;
        const y = cy + Math.sin(sat.angle) * (sat.radius * 0.65); // 3D tilt

        ctx.fillStyle = sat.color;
        ctx.shadowColor = sat.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(x, y, sat.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Microwave Power Beaming Rays to Rectenna Array
        if (isBeaming && Math.random() > 0.96) {
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(cx + 260, cy + 140);
          ctx.stroke();
        }
      });

      // Receiver Rectenna Hub
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.fillRect(cx + 250, cy + 130, 20, 20);
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isBeaming]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Sun className="w-8 h-8 text-black animate-spin" style={{ animationDuration: '24s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400">
                DYSON SWARM // KARDASHEV TYPE II MEGASTRUCTURE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                3.84 × 10²⁶ WATTS HARVESTED
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              100,000+ statite solar collector array & phased-array microwave power beaming for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Level */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CIVILIZATION SCALE</div>
            <div className="text-xl font-bold text-amber-400">K = {kardashevLevel} (TYPE II)</div>
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
            height={500}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-amber-400 font-bold">SWARM STATITES: {statitesRef.current.length}</span>
              <span className="text-cyan-400 font-bold">POWER FLUX: {harvestedYottawatts} YW</span>
            </div>
            <div>STATUS: PHASED-ARRAY MICROWAVE BEAMING ACTIVE</div>
          </div>
        </div>

        {/* Megastructure Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SWARM CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Swarm Statite Density:</span>
              <span className="text-amber-400 font-bold">{statiteCount} Statites</span>
            </div>
            <input
              type="range"
              min={50}
              max={300}
              step={10}
              value={statiteCount}
              onChange={(e) => setStatiteCount(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">DYSON CONCEPT:</span>
            <div>• Freeman Dyson 1960: A swarm of independent light-sail mirrors capturing 100% of star's radiation.</div>
            <div>• Infinite clean energy to power planetary computing networks and interstellar warp gates.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
