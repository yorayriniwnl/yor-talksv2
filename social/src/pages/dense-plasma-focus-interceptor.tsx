import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DensePlasmaFocusInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pinchCurrentMegaAmperes, setPinchCurrentMegaAmperes] = useState(4.8); // 4.8 MA DPF pinch current
  const [plasmoidDensityTrillion, setPlasmoidDensityTrillion] = useState(1.4); // 1.4 x 10^19 cm^-3 plasmoid density
  const [specificImpulseSec, setSpecificImpulseSec] = useState(680000); // 680,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(26000); // 26,000 kN interceptor thrust

  const animFrameRef = useRef<number | null>(null);
  const interceptorPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Dense Plasma Focus Interceptor Fusion Canvas
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

      // Coaxial Mather-Type DPF Gun Anode & Cathode (Left: 60 to 190, cy)
      // Outer Cathode Rods (Top & Bottom)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(60, cy - 35); ctx.lineTo(190, cy - 35);
      ctx.moveTo(60, cy + 35); ctx.lineTo(190, cy + 35);
      ctx.stroke();

      // Solid Copper Center Anode Rod
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(60, cy - 8, 120, 16);

      // Current Sheath Parabolic Run-Down Vortex Wave
      const sheathX = 180 + Math.sin(time * 4) * 6;
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sheathX, cy - 35);
      ctx.lineTo(sheathX + 12, cy);
      ctx.lineTo(sheathX, cy + 35);
      ctx.stroke();

      // Ultra-Dense Magnetic Pinch Focus Plasmoid at Anode Tip (at 200, cy)
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 32;
      ctx.beginPath();
      ctx.arc(200, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('4.8 MA', 188, cy + 2.5);

      // Magnetic Aerospike Expansion Divertor Nozzle (215 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(215, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(215, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        interceptorPlasmaJetsRef.current.push({
          x: 215,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 56 + (pinchCurrentMegaAmperes / 4.8) * 10,
        });
      }

      interceptorPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      interceptorPlasmaJetsRef.current = interceptorPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DPF INTERCEPTOR: CURRENT = ${pinchCurrentMegaAmperes.toFixed(1)} MA | DENSITY = ${plasmoidDensityTrillion.toFixed(1)}x10^19 | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pinchCurrentMegaAmperes, plasmoidDensityTrillion, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-amber-300 to-pink-400">
                STAGED DPF // 680,000s Isp INTERCEPTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                BOSTICK, LERNER & PERATT (STEVENS INSTITUTE & LLNL)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              4.8 MA staged Dense Plasma Focus vortex sheath aneutronic fusion interceptor for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">INTERCEPTOR THRUST</div>
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
              <span className="text-cyan-400 font-bold">PINCH CURRENT: {pinchCurrentMegaAmperes.toFixed(1)} MA</span>
              <span className="text-pink-400 font-bold">PLASMOID: {plasmoidDensityTrillion.toFixed(1)}x10^19</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: VORTEX CURRENT SHEATH RUN-DOWN PINCH CONVERGED</div>
          </div>
        </div>

        {/* DPF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PINCH CURRENT (MA)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Peak Focus Current:</span>
              <span className="text-emerald-400 font-bold">{pinchCurrentMegaAmperes.toFixed(1)} MA</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={8.0}
              step={0.2}
              value={pinchCurrentMegaAmperes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPinchCurrentMegaAmperes(val);
                setPlasmoidDensityTrillion(val * 0.291);
                setThrustKiloNewtons(Math.floor(val * 5416.6));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Parabolic Current Sheath:</strong> Lorentz J×B forces accelerate an ionization sheath down coaxial electrodes, collapsing into a sub-millimeter plasmoid core at the anode tip!</div>
            <div>• <strong>Quantum Magnetic Field Ignition:</strong> Generates self-collimating magnetic pinch fields exceeding 1,000 Tesla, igniting aneutronic p-11B fusion at 680,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
