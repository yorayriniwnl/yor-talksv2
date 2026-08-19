import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CmmCorvette() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [machRotationNumberM, setMachRotationNumberM] = useState(4.2); // M = 4.2 supersonic ExB rotation
  const [mirrorRatioR, setMirrorRatioR] = useState(12); // R = 12 mirror ratio
  const [specificImpulseSec, setSpecificImpulseSec] = useState(175000); // 175,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(1800); // 1,800 kN corvette thrust

  const animFrameRef = useRef<number | null>(null);
  const cmmExhaustJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Centrifugal Magnetic Mirror (CMM) Supersonic Plasma Canvas
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

      // Superconducting Solenoid Mirror Coils (Left: 80 to 240)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.beginPath();
      // Choke Coils
      ctx.arc(100, cy, 45, -Math.PI / 2, Math.PI / 2);
      ctx.arc(240, cy, 45, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();

      // High-Voltage Biased Central Core Electrode (Center line)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(240, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Supersonic Rotating Plasma Vortex (Mach M = 4.2)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      for (let ring = 0; ring < 4; ring++) {
        const ry = 14 + ring * 8;
        ctx.beginPath();
        ctx.ellipse(170, cy, 55, ry, time * (ring % 2 === 0 ? 1 : -1), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Asymmetric Mirror Magnetic Thrust Nozzle (250 to 520)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(250, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(250, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // High-Velocity Centrifugal Exhaust Plasma Jet
      if (Math.random() < 0.6) {
        cmmExhaustJetsRef.current.push({
          x: 250,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 22 + (machRotationNumberM / 4.2) * 8,
        });
      }

      cmmExhaustJetsRef.current.forEach((j) => {
        j.x += j.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      cmmExhaustJetsRef.current = cmmExhaustJetsRef.current.filter(j => j.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CMM FAST CORVETTE: ROTATION MACH M = ${machRotationNumberM} | MIRROR RATIO R = ${mirrorRatioR} | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [machRotationNumberM, mirrorRatioR, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-amber-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Magnet className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-amber-300 to-emerald-400">
                CMM FUSION CORVETTE // CENTRIFUGAL MAGNETIC MIRROR DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                175,000s Isp (HASSAM - UNIV OF MARYLAND & NASA MSFC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Mach 4.2 supersonic ExB velocity shear & 1,800 kN strike corvette propulsion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CORVETTE THRUST</div>
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
              <span className="text-cyan-400 font-bold">ROTATION: MACH {machRotationNumberM}</span>
              <span className="text-amber-400 font-bold">MIRROR RATIO: R = {mirrorRatioR}</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: SHEARED ROTATIONAL CONFINEMENT STABLE</div>
          </div>
        </div>

        {/* CMM Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ROTATION MACH (M)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>ExB Supersonic Mach:</span>
              <span className="text-cyan-400 font-bold">M = {machRotationNumberM}</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={8.0}
              step={0.2}
              value={machRotationNumberM}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMachRotationNumberM(val);
                setThrustKiloNewtons(Math.floor(val * 428));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Centrifugal Confinement:</strong> Supersonic $E \times B$ plasma rotation introduces centrifugal pseudo-gravity potential wells that dramatically enhance classical mirror confinement!</div>
            <div>• <strong>Velocity Shear Stabilization:</strong> Rapid radial shear gradients tear apart interchange MHD turbulence, allowing steady high-beta fusion operation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
