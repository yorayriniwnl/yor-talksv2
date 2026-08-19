import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DynamicScrewPinch() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [axialCurrentIzMegaAmps, setAxialCurrentIzMegaAmps] = useState(32); // 32 MA axial current
  const [azimuthalCurrentIthetaMegaAmps, setAzimuthalCurrentIthetaMegaAmps] = useState(18); // 18 MA theta current
  const [specificImpulseSec, setSpecificImpulseSec] = useState(520000); // 520,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(13000); // 13,000 kN battleship thrust

  const animFrameRef = useRef<number | null>(null);
  const screwPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Helical Dynamic Screw-Pinch Fusion Canvas
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

      // Coaxial Outer Return Path Conductors (Left: 60 to 220)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, cy - 45); ctx.lineTo(220, cy - 45);
      ctx.moveTo(60, cy + 45); ctx.lineTo(220, cy + 45);
      ctx.stroke();

      // Helical Magnetic Field Lines (Screw-Pinch B_z + B_theta)
      const numHelices = 6;
      for (let h = 0; h < numHelices; h++) {
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 60; x <= 220; x += 4) {
          const phase = (x / 20) + (h * Math.PI / 3) + time * 2;
          const y = cy + Math.sin(phase) * 26;
          if (x === 60) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Ultra-Dense Compressed Dynamic Helical Core (at 140, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.ellipse(140, cy, 75, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('HELICAL SCREW-PINCH (2.2 GK)', 75, cy + 3);

      // Magnetic Aerospike Expansion Divertor Nozzle (220 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(220, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(220, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        screwPlasmaJetsRef.current.push({
          x: 220,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 42 + (axialCurrentIzMegaAmps / 32) * 10,
        });
      }

      screwPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      screwPlasmaJetsRef.current = screwPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DYNAMIC SCREW-PINCH: I_z = ${axialCurrentIzMegaAmps} MA | I_theta = ${azimuthalCurrentIthetaMegaAmps} MA | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [axialCurrentIzMegaAmps, azimuthalCurrentIthetaMegaAmps, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-amber-400">
                DYNAMIC SCREW-PINCH // 520,000s Isp BATTLESHIP
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                BODNER, HAINES & CHITTENDEN (IMPERIAL COLLEGE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Simultaneous I_z (32 MA) + I_theta (18 MA) helical stabilized fusion battleship for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">BATTLESHIP THRUST</div>
            <div className="text-xl font-bold text-emerald-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-emerald-400 font-bold">AXIAL I_z: {axialCurrentIzMegaAmps} MA</span>
              <span className="text-pink-400 font-bold">THETA I_θ: {azimuthalCurrentIthetaMegaAmps} MA</span>
              <span className="text-cyan-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: DYNAMIC HELICAL SCREW STABILITY COMPLETE</div>
          </div>
        </div>

        {/* Screw-Pinch Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              AXIAL CURRENT (MA)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Axial Pinch Current:</span>
              <span className="text-emerald-400 font-bold">{axialCurrentIzMegaAmps} MA</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={2}
              value={axialCurrentIzMegaAmps}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAxialCurrentIzMegaAmps(val);
                setThrustKiloNewtons(Math.floor(val * 406.25));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dual-Current Helical Shear:</strong> Combining axial current ($I_z$) and azimuthal current ($I_\theta$) twists magnetic shear vectors, suppressing both $m=0$ sausage and $m=1$ kink instabilities simultaneously!</div>
            <div>• <strong>2.2 GK Thermonuclear Core:</strong> Ignites aneutronic proton-boron fusion fuel in an ultra-dense Z-pinch column, achieving 520,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
