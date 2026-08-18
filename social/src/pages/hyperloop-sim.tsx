import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Gauge, Play, Pause, RotateCcw, 
  Wind, ShieldCheck, Activity, Sliders, Flame
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HyperloopSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [podSpeedKmh, setPodSpeedKmh] = useState(1180);
  const [tubePressurePa, setTubePressurePa] = useState(100); // 100 Pa low vacuum
  const [gForce, setGForce] = useState(1.15);
  const [isAccelerating, setIsAccelerating] = useState(true);

  const podRef = useRef({ x: 200, speed: 1180 });
  const animFrameRef = useRef<number | null>(null);

  // Hyperloop Physics Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      const p = podRef.current;

      if (isAccelerating) {
        p.x = (p.x + (podSpeedKmh / 1200) * 12) % canvas.width;
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Evacuated Vacuum Tunnel Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Steel Tube Walls (Top and Bottom)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(0, cy - 80); ctx.lineTo(canvas.width, cy - 80);
      ctx.moveTo(0, cy + 80); ctx.lineTo(canvas.width, cy + 80);
      ctx.stroke();

      // Magnetic Levitation Track Guide Rails
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, cy + 65); ctx.lineTo(canvas.width, cy + 65);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Maglev Pod (Sub-Atmospheric Bullet Craft)
      ctx.save();
      ctx.translate(p.x, cy);

      // Pod Body
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.roundRect(-60, -25, 120, 50, 16);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Compressor Fan Nose Intake
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(45, -15, 15, 30);

      // Windows
      ctx.fillStyle = '#ffffff';
      for (let w = -30; w <= 20; w += 15) {
        ctx.fillRect(w, -10, 8, 8);
      }

      // Airflow Bypass Particles
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      for (let i = 0; i < 12; i++) {
        const px = -60 - (Math.random() * 80 + 10);
        const py = (Math.random() - 0.5) * 40;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAccelerating, podSpeedKmh]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-rose-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Zap className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-rose-300 to-amber-400">
              HYPERLOOP // 1,200 KM/H VACUUM MAGLEV
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Kantrowitz limit compressor & linear induction propulsion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">VELOCITY</div>
            <div className="text-xl font-bold text-cyan-400">{podSpeedKmh} <span className="text-xs">KM/H</span></div>
          </div>
        </div>
      </div>

      {/* Canvas Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={740}
          height={380}
          className="w-full h-auto block"
        />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
          <div className="bg-zinc-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-emerald-400">
            TUBE PRESSURE: {tubePressurePa} PA (0.001 ATM)
          </div>

          <div className="bg-zinc-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-amber-400">
            PASSENGER COMFORT: {gForce} G (OPTIMAL)
          </div>
        </div>
      </div>
    </div>
  );
}
