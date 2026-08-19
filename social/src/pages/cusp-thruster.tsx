import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CuspThruster() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [anodeVoltageV, setAnodeVoltageV] = useState(1200); // 1200 V acceleration
  const [magneticCuspsNum, setMagneticCuspsNum] = useState(4); // 4 periodic magnetic cusp rings
  const [specificImpulseSec, setSpecificImpulseSec] = useState(5200); // 5,200 s Isp
  const [thrustMn, setThrustMn] = useState(68.0); // 68 mN thrust

  const animFrameRef = useRef<number | null>(null);
  const ionsRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string }[]>([]);

  // Periodic Magnetic Cusp Confinement (HEMP Thruster) Canvas
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

      // Ceramic Discharge Channel Wall (60 to 440)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.fillRect(60, cy - 65, 380, 130);
      ctx.strokeRect(60, cy - 65, 380, 130);

      // Anode Gas Distributor at Base (Left 60, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(60, cy - 50, 14, 100);

      // Periodic Permanent Magnet Cusp Rings (Alternating N-S-N-S on Upper & Lower Walls)
      for (let i = 0; i < magneticCuspsNum; i++) {
        const mx = 120 + i * 85;
        const isNorth = i % 2 === 0;

        // Upper cusp magnet
        ctx.fillStyle = isNorth ? '#ef4444' : '#3b82f6';
        ctx.fillRect(mx, cy - 85, 20, 20);

        // Lower cusp magnet
        ctx.fillRect(mx, cy + 65, 20, 20);

        // Magnetic Cusp Arc Field Lines inside channel
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx + 10, cy - 65, 35, 0, Math.PI);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(mx + 10, cy + 65, 35, Math.PI, 0);
        ctx.stroke();
      }

      // Exit Neutralizer Hollow Cathode (450, cy + 80)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(450, cy + 70, 18, 24);

      // Spawn Xenon (Xe+) Ions Accelerated down Channel
      if (Math.random() < 0.4) {
        ionsRef.current.push({
          x: 80,
          y: cy + (Math.random() - 0.5) * 60,
          vx: Math.random() * 3 + 8,
          vy: (Math.random() - 0.5) * 1.5,
          color: '#38bdf8',
        });
      }

      // Draw & Propagate Xenon Ions
      ionsRef.current.forEach((ion) => {
        ion.x += ion.vx;
        ion.y += ion.vy;

        // Acceleration jump at exit double layer (420)
        if (ion.x > 400 && ion.vx < 16) ion.vx += 1.2;

        ctx.fillStyle = ion.color;
        ctx.shadowColor = ion.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ion.x, ion.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ionsRef.current = ionsRef.current.filter(ion => ion.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [anodeVoltageV, magneticCuspsNum]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                MAGNETIC CUSP THRUSTER // HIGH-EFFICIENCY MULTISTAGE (HEMP)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                100,000-HOUR CUSP CONFINEMENT (NASA/DLR)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Periodic magnetic cusp wall loss suppression & electrostatic ion acceleration for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-cyan-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-cyan-400 font-bold">VOLTAGE: {anodeVoltageV} V</span>
              <span className="text-pink-400 font-bold">CUSP RINGS: {magneticCuspsNum}</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustMn} mN</span>
            </div>
            <div>STATUS: ZERO GRID EROSION (100,000-HR LIFESPAN)</div>
          </div>
        </div>

        {/* Cusp Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ANODE VOLTAGE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Acceleration Voltage:</span>
              <span className="text-cyan-400 font-bold">{anodeVoltageV} V</span>
            </div>
            <input
              type="range"
              min={600}
              max={2500}
              step={100}
              value={anodeVoltageV}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAnodeVoltageV(val);
                setSpecificImpulseSec(Math.round(Math.sqrt(val) * 150));
                setThrustMn(+(val * 0.056).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Magnetic Cusp Shielding:</strong> Alternating magnetic cusps bounce electrons back into the core, reducing wall thermal collisions by &gt; 95% and eliminating channel erosion!</div>
            <div>• <strong>Electrodeless Acceleration:</strong> The self-consistent virtual cathode accelerates Xenon/Krypton ions electrostatically without requiring fragile physical grids!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
