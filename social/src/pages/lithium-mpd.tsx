import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function LithiumMpd() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [arcCurrentAmps, setArcCurrentAmps] = useState(2500); // 2,500 Amps arc
  const [specificImpulseSec, setSpecificImpulseSec] = useState(6500); // 6,500 s Isp
  const [thrustN, setThrustN] = useState(38.5); // 38.5 N thrust
  const [appliedFieldTesla, setAppliedFieldTesla] = useState(0.45); // 0.45 T

  const animFrameRef = useRef<number | null>(null);
  const lithiumPlume = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Applied-Field Lithium MPD Thruster Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Space Vacuum
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Copper Anode Cylinder (Gray-Orange)
      ctx.fillStyle = '#b45309';
      ctx.fillRect(80, cy - 70, 140, 20);
      ctx.fillRect(80, cy + 50, 140, 20);

      // Central Thoriated Tungsten Cathode Rod
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(50, cy - 8, 120, 16);

      // Outer Superconducting Applied-Field Magnet Coils
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(90, cy - 110, 120, 25);
      ctx.fillRect(90, cy + 85, 120, 25);

      // Cathode Arc Discharge (Blinding White/Cyan Arc Attachment)
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(170, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Spawn Accelerated Lithium Ion Plasma Stream (j x B Lorentz Force)
      for (let i = 0; i < 6; i++) {
        lithiumPlume.current.push({
          x: 170,
          y: cy + (Math.random() - 0.5) * 16,
          vx: Math.random() * 8 + 14,
          vy: (Math.random() - 0.5) * 2.5,
          life: 70,
        });
      }

      // Draw Relativistic Lithium Plasma Particles (Crimson/Pink Lithium Glow)
      lithiumPlume.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1.5;

        if (p.life > 0) {
          ctx.fillStyle = '#ec4899';
          ctx.shadowColor = '#ec4899';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      lithiumPlume.current = lithiumPlume.current.filter(p => p.life > 0 && p.x < canvas.width);

      // Hypersonic Lorentz Exhaust Plume
      const plumeGrad = ctx.createLinearGradient(170, cy, canvas.width, cy);
      plumeGrad.addColorStop(0, '#ffffff');
      plumeGrad.addColorStop(0.3, 'rgba(236, 72, 153, 0.7)');
      plumeGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.moveTo(170, cy - 20);
      ctx.lineTo(canvas.width, cy - 90);
      ctx.lineTo(canvas.width, cy + 90);
      ctx.lineTo(170, cy + 20);
      ctx.closePath();
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [arcCurrentAmps]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-400">
                LITHIUM MPD // APPLIED-FIELD LORENTZ THRUSTER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                6,500S SPECIFIC IMPULSE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              200 kW self-field & applied magnetic j × B electromagnetic plasma acceleration for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Isp */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE (Isp)</div>
            <div className="text-xl font-bold text-pink-400">{specificImpulseSec} <span className="text-xs">SECONDS</span></div>
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
              <span className="text-pink-400 font-bold">ARC CURRENT: {arcCurrentAmps} A</span>
              <span className="text-cyan-400 font-bold">THRUST: {thrustN} N</span>
            </div>
            <div>STATUS: STEADY-STATE LORENTZ ACCELERATION</div>
          </div>
        </div>

        {/* Thruster Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DISCHARGE CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Cathode Arc Current:</span>
              <span className="text-pink-400 font-bold">{arcCurrentAmps} A</span>
            </div>
            <input
              type="range"
              min={1000}
              max={5000}
              step={100}
              value={arcCurrentAmps}
              onChange={(e) => {
                const val = Number(e.target.value);
                setArcCurrentAmps(val);
                setThrustN(+(val * 0.0154).toFixed(1));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">WHY LITHIUM?</span>
            <div>• Lowest ionization potential of all metals (5.39 eV) reduces frozen flow losses.</div>
            <div>• Achieves record 60% electrical-to-thrust conversion efficiency for multi-megawatt deep space tugs.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
