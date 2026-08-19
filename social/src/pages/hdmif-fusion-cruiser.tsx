import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HdmifFusionCruiser() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gasPuffStagingPressureMbar, setGasPuffStagingPressureMbar] = useState(150); // 150 Mbar peak staged pressure
  const [preheatLaserEnergyKilojoules, setPreheatLaserEnergyKilojoules] = useState(400); // 400 kJ pre-heat laser
  const [specificImpulseSec, setSpecificImpulseSec] = useState(210000); // 210,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(3200); // 3,200 kN heavy cruiser thrust

  const animFrameRef = useRef<number | null>(null);
  const hdmifPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // High-Density Magneto-Inertial Fusion (HD-MIF) Staged Z-Pinch Canvas
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

      // Staged Outer Krypton/Xenon Gas-Puff Liner Shell (Left: 80 to 240)
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(80, cy - 75); ctx.lineTo(240, cy - 35);
      ctx.moveTo(80, cy + 75); ctx.lineTo(240, cy + 35);
      ctx.stroke();

      // Axial Pre-Heat Laser Injection (Left needle)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(60, cy); ctx.lineTo(220, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magnetized D-T Core Plasmoid (at 250, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(250, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magnetic Thrust Mirror Nozzle (265 to 540)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(265, cy - 25); ctx.lineTo(540, cy - 85);
      ctx.moveTo(265, cy + 25); ctx.lineTo(540, cy + 85);
      ctx.stroke();

      // High-Velocity Fusion Exhaust Plasma Stream
      if (Math.random() < 0.6) {
        hdmifPlasmaJetsRef.current.push({
          x: 265,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 22 + (gasPuffStagingPressureMbar / 150) * 8,
        });
      }

      hdmifPlasmaJetsRef.current.forEach((j) => {
        j.x += j.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      hdmifPlasmaJetsRef.current = hdmifPlasmaJetsRef.current.filter(j => j.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `HD-MIF STAGED Z-PINCH: P_staged = ${gasPuffStagingPressureMbar} Mbar | E_laser = ${preheatLaserEnergyKilojoules} kJ | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gasPuffStagingPressureMbar, preheatLaserEnergyKilojoules, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Magnet className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400">
                HD-MIF FUSION CRUISER // STAGED Z-PINCH INTERSTELLAR DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                210,000s Isp (SLUTZ & AWE - SANDIA & ARPA-E ALPHA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              150 Mbar staged gas-puff implosion & 3,200 kN heavy battlecruiser propulsion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CRUISER THRUST</div>
            <div className="text-xl font-bold text-purple-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-purple-400 font-bold">STAGING: {gasPuffStagingPressureMbar} Mbar</span>
              <span className="text-pink-400 font-bold">LASER PREHEAT: {preheatLaserEnergyKilojoules} kJ</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: STAGED MAGNETO-INERTIAL BURN STABLE</div>
          </div>
        </div>

        {/* HDMIF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              STAGING PRESSURE (Mbar)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Peak Staging Pressure:</span>
              <span className="text-purple-400 font-bold">{gasPuffStagingPressureMbar} Mbar</span>
            </div>
            <input
              type="range"
              min={50}
              max={300}
              step={25}
              value={gasPuffStagingPressureMbar}
              onChange={(e) => {
                const val = Number(e.target.value);
                setGasPuffStagingPressureMbar(val);
                setThrustKiloNewtons(Math.floor(val * 21.3));
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Staged Gas-Puff Physics:</strong> Compressing an outer annular high-Z gas shell onto an inner magnetized fuel core creates a shock boundary that cushions Rayleigh-Taylor instabilities!</div>
            <div>• <strong>Relativistic Cruiser Propulsion:</strong> Exhausting $150\text{ Mbar}$ thermal ions through superconducting magnetic nozzles yields $3,200\text{ kN}$ thrust for heavy capital starships!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
