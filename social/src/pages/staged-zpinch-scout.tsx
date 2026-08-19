import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function StagedZpinchScout() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stagedPinchCurrentMegaAmps, setStagedPinchCurrentMegaAmps] = useState(28); // 28 MA pulsed pinch current
  const [linerImplosionVelocityKms, setLinerImplosionVelocityKms] = useState(420); // 420 km/s krypton liner
  const [specificImpulseSec, setSpecificImpulseSec] = useState(275000); // 275,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(4800); // 4,800 kN scout thrust

  const animFrameRef = useRef<number | null>(null);
  const stagedZpinchJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Staged Gas-Puff Liner Z-Pinch Canvas
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

      // Outer Shock-Heated Krypton Gas-Puff Liner (Imploding at 420 km/s) (Top & Bottom: 80 to 240)
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.fillRect(80, cy - 75, 160, 18);
      ctx.strokeRect(80, cy - 75, 160, 18);
      ctx.fillRect(80, cy + 57, 160, 18);
      ctx.strokeRect(80, cy + 57, 160, 18);

      // Inner Ultra-Dense Staged Fusion Plasmoid Core (at 160, cy)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(160, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Azimuthal B_theta Magnetic Pinch Lines (28 MA)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.ellipse(160, cy, 18, 8 + ring * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Magnetic Expansion Aerospike Nozzle (250 to 520)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(250, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(250, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // High-Velocity Staged Z-Pinch Exhaust Plasmoids
      if (Math.random() < 0.7) {
        stagedZpinchJetsRef.current.push({
          x: 250,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 26 + (stagedPinchCurrentMegaAmps / 28) * 8,
        });
      }

      stagedZpinchJetsRef.current.forEach((j) => {
        j.x += j.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      stagedZpinchJetsRef.current = stagedZpinchJetsRef.current.filter(j => j.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `STAGED Z-PINCH SCOUT: CURRENT = ${stagedPinchCurrentMegaAmps} MA | LINER VELOCITY = ${linerImplosionVelocityKms} km/s | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stagedPinchCurrentMegaAmps, linerImplosionVelocityKms, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-300 to-amber-400">
                STAGED Z-PINCH SCOUT // 28 MA LINER IMPLOSION DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                275,000s Isp (RAHMAN & WESSEL - UC IRVINE & MIFTI)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              420 km/s krypton gas-puff liner implosion & 4,800 kN high-current fusion scout for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SCOUT THRUST</div>
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
              <span className="text-cyan-400 font-bold">CURRENT: {stagedPinchCurrentMegaAmps} MA</span>
              <span className="text-pink-400 font-bold">LINER VELOCITY: {linerImplosionVelocityKms} km/s</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: SHOCK-HEATED LINER COMPRESSION NOMINAL</div>
          </div>
        </div>

        {/* Staged Z-Pinch Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PINCH CURRENT (MA)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Current Discharge:</span>
              <span className="text-cyan-400 font-bold">{stagedPinchCurrentMegaAmps} MA</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={2}
              value={stagedPinchCurrentMegaAmps}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStagedPinchCurrentMegaAmps(val);
                setThrustKiloNewtons(Math.floor(val * 171));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Staged Liner Stabilization:</strong> The high-Z outer krypton liner dampens Rayleigh-Taylor instabilities through continuous shock heating, maintaining uniform 1000:1 cylindrical compression!</div>
            <div>• <strong>Hyper-Velocity Exhaust:</strong> Direct Lorentz force ejection accelerates thermalized alpha particles through a diverging magnetic nozzle at 275,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
