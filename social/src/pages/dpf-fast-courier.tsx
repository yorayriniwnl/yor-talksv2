import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DpfFastCourier() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dpfPinchCurrentMegaAmperes, setDpfPinchCurrentMegaAmperes] = useState(3.2); // 3.2 MA pinch current
  const [coreTemperatureGigaKelvin, setCoreTemperatureGigaKelvin] = useState(2.2); // 2.2 GK p-11B ignition temp
  const [specificImpulseSec, setSpecificImpulseSec] = useState(165000); // 165,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(920); // 920 kN fast courier thrust

  const animFrameRef = useRef<number | null>(null);
  const alphaParticlesRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Dense Plasma Focus (DPF) Coaxial Aneutronic Pinch Canvas
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

      // Coaxial Anode & Cathode Cylinders (Left: 80 to 240)
      // Outer Cylindrical Cathode Rods
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 60); ctx.lineTo(240, cy - 60);
      ctx.moveTo(80, cy + 60); ctx.lineTo(240, cy + 60);
      ctx.stroke();

      // Central Solid Anode Rod
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(220, cy);
      ctx.stroke();

      // 2.2 GK Pinched Plasmoid Vortex (at 240, cy)
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(240, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Superconducting Magnetic Collimator (255 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(255, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(255, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // Ejected Aneutronic Alpha Particle Beam (4He2+ ions)
      if (Math.random() < 0.6) {
        alphaParticlesRef.current.push({
          x: 255,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 24 + (dpfPinchCurrentMegaAmperes / 3.2) * 8,
        });
      }

      alphaParticlesRef.current.forEach((a) => {
        a.x += a.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      alphaParticlesRef.current = alphaParticlesRef.current.filter(a => a.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DPF FAST COURIER: I_pinch = ${dpfPinchCurrentMegaAmperes} MA | T_core = ${coreTemperatureGigaKelvin} GK | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dpfPinchCurrentMegaAmperes, coreTemperatureGigaKelvin, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-red-300 to-cyan-400">
                DPF FAST COURIER // ANEUTRONIC PROTON-BORON PINCH
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                165,000s Isp (LERNER & MURALI - LPP & NASA NIAC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3.2 MA dense plasma focus pinch & 2.2 GK aneutronic p-11B propulsion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">COURIER THRUST</div>
            <div className="text-xl font-bold text-amber-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-amber-400 font-bold">CURRENT: {dpfPinchCurrentMegaAmperes} MA</span>
              <span className="text-red-400 font-bold">TEMP: {coreTemperatureGigaKelvin} GK</span>
              <span className="text-cyan-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: ANEUTRONIC ALPHA JET EMISSION STEADY</div>
          </div>
        </div>

        {/* DPF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PINCH CURRENT (MA)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Coaxial Current:</span>
              <span className="text-amber-400 font-bold">{dpfPinchCurrentMegaAmperes} MA</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={6.0}
              step={0.2}
              value={dpfPinchCurrentMegaAmperes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDpfPinchCurrentMegaAmperes(val);
                setThrustKiloNewtons(Math.floor(val * 287));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Aneutronic Proton-Boron Ignition:</strong> $p + {}^{11}\text{B} \to 3\alpha + 8.7\text{ MeV}$ produces charged helium nuclei without harmful neutron activation!</div>
            <div>• <strong>Fast Express Planetary Courier:</strong> High specific impulse ($165,000\text{ s}$) allows reaching Mars in 14 days and Jupiter in 45 days!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
