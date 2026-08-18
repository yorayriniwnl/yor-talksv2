import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Zap, Play, Pause, RotateCcw, 
  Wind, ShieldCheck, Activity, Sliders, Rocket
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MpdThruster() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [arcCurrentKa, setArcCurrentKa] = useState(12.5); // 12.5 kA
  const [lorentzThrustN, setLorentzThrustN] = useState(240); // 240 N
  const [plasmaTempEv, setPlasmaTempEv] = useState(45); // eV

  const animFrameRef = useRef<number | null>(null);
  const plasmaSparks = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // MPD Lorentz Arcjet Canvas
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

      // Dark Space Vacuum
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Anode Chamber Walls (Top & Bottom)
      ctx.fillStyle = '#475569';
      ctx.fillRect(60, cy - 90, 140, 25);
      ctx.fillRect(60, cy + 65, 140, 25);

      // Central Cathode Rod (Thoriated Tungsten)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(40, cy - 10, 120, 20);

      // Spawn Lorentz-Accelerated Plasma Sparks (j x B force)
      for (let i = 0; i < 3; i++) {
        plasmaSparks.current.push({
          x: 160,
          y: cy + (Math.random() - 0.5) * 60,
          vx: Math.random() * 12 + 16,
          vy: (Math.random() - 0.5) * 4,
          life: 80,
        });
      }

      // Draw Plasma Sparks
      plasmaSparks.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 2;

        if (p.life > 0) {
          ctx.fillStyle = '#a855f7';
          ctx.shadowColor = '#ec4899';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      plasmaSparks.current = plasmaSparks.current.filter(p => p.life > 0 && p.x < canvas.width);

      // High-Temperature Arc Discharge (Purple/Magenta Plume)
      const arcGrad = ctx.createLinearGradient(160, cy, canvas.width, cy);
      arcGrad.addColorStop(0, '#ffffff');
      arcGrad.addColorStop(0.2, '#ec4899');
      arcGrad.addColorStop(0.6, '#a855f7');
      arcGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = arcGrad;
      ctx.beginPath();
      ctx.moveTo(160, cy - 65);
      ctx.lineTo(canvas.width, cy - 140);
      ctx.lineTo(canvas.width, cy + 140);
      ctx.lineTo(160, cy + 65);
      ctx.closePath();
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [arcCurrentKa]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                MPD THRUSTER // LORENTZ FORCE PLASMA PROPULSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                MEGAWATT ELECTROMAGNETIC THRUST
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Radial arc current & azimuthal self-induced magnetic acceleration for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Thrust Banner */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">ELECTROMAGNETIC THRUST</div>
            <div className="text-xl font-bold text-pink-400">{lorentzThrustN} <span className="text-xs">NEWTONS</span></div>
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
              <span className="text-purple-400 font-bold">ARC CURRENT: {arcCurrentKa} kA</span>
              <span className="text-pink-400 font-bold">PLASMA TEMP: {plasmaTempEv} eV</span>
            </div>
            <div>STATUS: CONTINUOUS LORENTZ ACCELERATION</div>
          </div>
        </div>

        {/* Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DISCHARGE CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Arc Current:</span>
              <span className="text-purple-400 font-bold">{arcCurrentKa} kA</span>
            </div>
            <input
              type="range"
              min={5.0}
              max={30.0}
              step={0.5}
              value={arcCurrentKa}
              onChange={(e) => {
                const val = Number(e.target.value);
                setArcCurrentKa(val);
                setLorentzThrustN(Math.round(val * val * 1.5));
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">LORENTZ FORCE (j × B):</span>
            <div>• High current creates its own azimuthal magnetic field B_θ, accelerating ionized propellant to &gt;60 km/s!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
