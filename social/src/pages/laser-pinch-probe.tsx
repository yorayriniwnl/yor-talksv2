import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function LaserPinchProbe() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [petawattLaserPowerPw, setPetawattLaserPowerPw] = useState(15); // 15 PW petawatt driver
  const [pulseRepetitionHz, setPulseRepetitionHz] = useState(50); // 50 Hz micro-bursts
  const [specificImpulseSec, setSpecificImpulseSec] = useState(350000); // 350,000 s Isp
  const [relativisticBeta, setRelativisticBeta] = useState(0.48); // 0.48c cruise velocity

  const animFrameRef = useRef<number | null>(null);
  const pinchPelletStreamRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Laser-Driven Micro-Fission/Fusion Pinch Canvas
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

      // Petawatt Laser Concentrator Beams (Left: Top & Bottom converging at 260, cy)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(60, cy - 100); ctx.lineTo(260, cy);
      ctx.moveTo(60, cy + 100); ctx.lineTo(260, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Micro-Fission/Fusion Pellet Implosion Core (at 260, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(260, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Mega-Tesla Azimuthal Magnetic Pinch Coil & Magnetic Nozzle (260 to 480)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(260, cy - 25); ctx.lineTo(480, cy - 75);
      ctx.moveTo(260, cy + 25); ctx.lineTo(480, cy + 75);
      ctx.stroke();

      // Relativistic Ultra-Narrow Ejection Jet
      if (Math.random() < 0.5) {
        pinchPelletStreamRef.current.push({
          x: 260,
          y: cy + (Math.random() - 0.5) * 8,
          vx: 24 + (petawattLaserPowerPw / 15) * 6,
        });
      }

      pinchPelletStreamRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      pinchPelletStreamRef.current = pinchPelletStreamRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `LASER-PINCH PROBE: P_laser = ${petawattLaserPowerPw} PW (I_sp = ${specificImpulseSec.toLocaleString()} s | v = ${relativisticBeta}c | REP = ${pulseRepetitionHz} Hz)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [petawattLaserPowerPw, pulseRepetitionHz, specificImpulseSec, relativisticBeta]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
                LASER-PINCH PROBE // PETAWATT MICRO-FISSION/FUSION STARSHIP
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                350,000s Isp (WINTERBERG & LLNL)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              15 PW laser ignition, mega-Tesla azimuthal magnetic pinch & 0.48c relativistic cruise for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-red-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-red-400 font-bold">LASER: {petawattLaserPowerPw} PW</span>
              <span className="text-amber-400 font-bold">REP: {pulseRepetitionHz} Hz</span>
              <span className="text-emerald-400 font-bold">SPEED: {relativisticBeta}c</span>
            </div>
            <div>STATUS: RELATIVISTIC MEGA-TESLA AZIMUTHAL PINCH ACTIVE</div>
          </div>
        </div>

        {/* Laser Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PETAWATT LASER POWER
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Driver Power:</span>
              <span className="text-red-400 font-bold">{petawattLaserPowerPw} PW</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={2}
              value={petawattLaserPowerPw}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPetawattLaserPowerPw(val);
                setRelativisticBeta(+(0.3 + val * 0.012).toFixed(2));
              }}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Micro-Fission Catalyst:</strong> High-energy laser ablation compresses sub-critical Curium/Deuterium pellets, initiating explosive thermonuclear burn!</div>
            <div>• <strong>Magnetic Wall Protection:</strong> Self-generated mega-Tesla azimuthal magnetic fields prevent relativistic ions from touching physical spacecraft walls!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
