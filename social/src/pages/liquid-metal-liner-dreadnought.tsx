import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function LiquidMetalLinerDreadnought() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [liquidLithiumRpm, setLiquidLithiumRpm] = useState(3000); // 3,000 RPM vortex stabilization
  const [linerConvergenceRatio, setLinerConvergenceRatio] = useState(28); // 28:1 convergence ratio
  const [specificImpulseSec, setSpecificImpulseSec] = useState(580000); // 580,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(16000); // 16,000 kN super-dreadnought thrust

  const animFrameRef = useRef<number | null>(null);
  const superDreadnoughtPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Liquid-Lithium Liner Implosion Fusion Canvas
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

      // Rotating Liquid-Lithium Vortex Chamber (at 140, cy)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(140, cy, 68, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating Liquid Metal Swirl Lines
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 2;
      for (let s = 0; s < 4; s++) {
        const rad = 25 + s * 12;
        const angle = time * 3 * (liquidLithiumRpm / 3000) + (s * Math.PI / 2);
        ctx.beginPath();
        ctx.arc(140, cy, rad, angle, angle + Math.PI);
        ctx.stroke();
      }

      // Imploding Thermonuclear Core at Vortex Center (at 140, cy)
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(140, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('IGNITION', 123, cy + 2.5);

      // Magnetic Aerospike Expansion Divertor Nozzle (210 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(205, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(205, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        superDreadnoughtPlasmaJetsRef.current.push({
          x: 210,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 46 + (linerConvergenceRatio / 28) * 10,
        });
      }

      superDreadnoughtPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      superDreadnoughtPlasmaJetsRef.current = superDreadnoughtPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `LIQUID-METAL LINER DREADNOUGHT: VORTEX = ${liquidLithiumRpm} RPM | CONVERGENCE = ${linerConvergenceRatio}:1 | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [liquidLithiumRpm, linerConvergenceRatio, specificImpulseSec, thrustKiloNewtons]);

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-amber-400">
                LIQUID-METAL LINER // 580,000s Isp SUPER-DREADNOUGHT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                TURCHI, ROBSON & LINDEMUTH (NRL LINUS & LANL)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rotational liquid-lithium vortex stabilized FRC compression drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SUPER-DREADNOUGHT THRUST</div>
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
              <span className="text-amber-400 font-bold">VORTEX: {liquidLithiumRpm} RPM</span>
              <span className="text-cyan-400 font-bold">CONVERGENCE: {linerConvergenceRatio}:1</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: ROTATIONAL LIQUID LITHIUM IMPLOSION COMPLETE</div>
          </div>
        </div>

        {/* Liquid Metal Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              VORTEX SPEED (RPM)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Vortex Spin:</span>
              <span className="text-emerald-400 font-bold">{liquidLithiumRpm} RPM</span>
            </div>
            <input
              type="range"
              min={1000}
              max={5000}
              step={200}
              value={liquidLithiumRpm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLiquidLithiumRpm(val);
                setThrustKiloNewtons(Math.floor(val * 5.33));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Rayleigh-Taylor Vortex Stabilization:</strong> Fast rotation of the molten lithium liner creates a centrifugal barrier that completely suppresses Rayleigh-Taylor hydrodynamic instabilities during inward implosion!</div>
            <div>• <strong>Infinite Chamber Life:</strong> The liquid lithium acts as a self-healing First Wall, absorbing 100% of neutron damage while breeding tritium and channeling aneutronic alpha plasma!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
