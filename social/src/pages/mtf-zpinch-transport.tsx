import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MtfZpinchTransport() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [zPinchCurrentMegaAmperes, setZPinchCurrentMegaAmperes] = useState(25); // 25 MA pulsed power
  const [linerImplosionVelocityKmS, setLinerImplosionVelocityKmS] = useState(100); // 100 km/s liner implosion
  const [specificImpulseSec, setSpecificImpulseSec] = useState(195000); // 195,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(2400); // 2,400 kN heavy transport thrust

  const animFrameRef = useRef<number | null>(null);
  const mtfPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // MTF Liner-Driven Z-Pinch Fusion Canvas
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

      // Cylindrical Beryllium/Lithium Liner Shells (Top & Bottom: 100 to 240)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(100, cy - 65); ctx.lineTo(240, cy - 35);
      ctx.moveTo(100, cy + 65); ctx.lineTo(240, cy + 35);
      ctx.stroke();

      // 25 MA Pulsed Power Current Vector Lines (Cyan Arrows)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy - 85); ctx.lineTo(220, cy - 85);
      ctx.moveTo(80, cy + 85); ctx.lineTo(220, cy + 85);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`I_z = ${zPinchCurrentMegaAmperes} MA (PULSED)`, 90, cy - 95);

      // Magnetized Target Fusion Plasmoid Stagnation Core (at 250, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.ellipse(250, cy, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magnetic Expansion Thrust Nozzle (265 to 540)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(265, cy - 25); ctx.lineTo(540, cy - 85);
      ctx.moveTo(265, cy + 25); ctx.lineTo(540, cy + 85);
      ctx.stroke();

      // High-Velocity Fusion Exhaust Plasma Stream
      if (Math.random() < 0.6) {
        mtfPlasmaJetsRef.current.push({
          x: 265,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 20 + (zPinchCurrentMegaAmperes / 25) * 8,
        });
      }

      mtfPlasmaJetsRef.current.forEach((j) => {
        j.x += j.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      mtfPlasmaJetsRef.current = mtfPlasmaJetsRef.current.filter(j => j.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `MTF Z-PINCH TRANSPORT: I_z = ${zPinchCurrentMegaAmperes} MA | V_liner = ${linerImplosionVelocityKmS} km/s | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [zPinchCurrentMegaAmperes, linerImplosionVelocityKmS, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Magnet className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                MTF Z-PINCH TRANSPORT // MAGNETIZED TARGET FUSION DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                195,000s Isp (SLUTZ & VESEY - SANDIA & NASA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              25 MA electromagnetic liner implosion & 2,400 kN heavy transport thrust for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">HEAVY THRUST</div>
            <div className="text-xl font-bold text-cyan-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-cyan-400 font-bold">CURRENT: {zPinchCurrentMegaAmperes} MA</span>
              <span className="text-pink-400 font-bold">LINER: {linerImplosionVelocityKmS} km/s</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: HIGH-MASS INTERSTELLAR FREIGHT CRUISE ACTIVE</div>
          </div>
        </div>

        {/* MTF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PULSED POWER (MA)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Peak Current:</span>
              <span className="text-cyan-400 font-bold">{zPinchCurrentMegaAmperes} MA</span>
            </div>
            <input
              type="range"
              min={15}
              max={50}
              step={5}
              value={zPinchCurrentMegaAmperes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setZPinchCurrentMegaAmperes(val);
                setThrustKiloNewtons(Math.floor(val * 96));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Electromagnetic Liner Implosion:</strong> 25 Mega-Amperes of current crush a solid lithium liner at $100\text{ km/s}$, compressing embedded magnetic fields to 1,000+ Tesla!</div>
            <div>• <strong>High-Payload Capacity:</strong> The massive thrust ($2,400\text{ kN}$) enables accelerating multi-thousand-ton heavy colony transports to outer solar system outposts!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
