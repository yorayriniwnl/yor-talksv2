import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function IcfFissionHybrid() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [laserPulseEnergyMegajoules, setLaserPulseEnergyMegajoules] = useState(4.5); // 4.5 MJ UV Excimer Laser
  const [fissileShellMaterial, setFissileShellMaterial] = useState<'Californium-252' | 'Curium-245'>('Californium-252');
  const [specificImpulseSec, setSpecificImpulseSec] = useState(280000); // 280,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(1200); // 1,200 kN thrust

  const animFrameRef = useRef<number | null>(null);
  const chargedFragmentsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // ICF Fission-Fusion Hybrid Laser Magnetic Drive Canvas
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

      // Symmetrical Multi-Beam UV Laser Arrays (Left: 80 to 220)
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      // 4 Converging UV Laser Beams
      ctx.moveTo(80, cy - 80); ctx.lineTo(240, cy);
      ctx.moveTo(80, cy - 30); ctx.lineTo(240, cy);
      ctx.moveTo(80, cy + 30); ctx.lineTo(240, cy);
      ctx.moveTo(80, cy + 80); ctx.lineTo(240, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Fissile Cf-252 Encased D-T Fuel Pellet (at 240, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(240, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Superconducting Magnetic Thrust Mirror Nozzle (250 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(250, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(250, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // Relativistic Charged Fission Fragment & Fusion Plasma Jet
      if (Math.random() < 0.6) {
        chargedFragmentsRef.current.push({
          x: 250,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 22 + (laserPulseEnergyMegajoules / 4.5) * 8,
        });
      }

      chargedFragmentsRef.current.forEach((f) => {
        f.x += f.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      chargedFragmentsRef.current = chargedFragmentsRef.current.filter(f => f.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ICF FISSION-FUSION HYBRID: E_laser = ${laserPulseEnergyMegajoules} MJ | SHELL: ${fissileShellMaterial} | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [laserPulseEnergyMegajoules, fissileShellMaterial, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-amber-300 to-cyan-400">
                ICF FISSION-FUSION HYBRID // PETAWATT LASER INTERSTELLAR DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                280,000s Isp (WINTERBERG - UNIV OF NEVADA & NASA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              4.5 MJ UV laser compression & sub-critical fissile shell ignition for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">THRUST OUTPUT</div>
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
              <span className="text-purple-400 font-bold">LASER: {laserPulseEnergyMegajoules} MJ</span>
              <span className="text-amber-400 font-bold">SHELL: {fissileShellMaterial}</span>
              <span className="text-emerald-400 font-bold">I_sp: {specificImpulseSec.toLocaleString()} s</span>
            </div>
            <div>STATUS: RELATIVISTIC CHARGED PARTICLES DIRECT NOZZLE EXPANSION</div>
          </div>
        </div>

        {/* ICF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LASER DRIVER (MJ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Pulse Energy:</span>
              <span className="text-purple-400 font-bold">{laserPulseEnergyMegajoules} MJ</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={10.0}
              step={0.5}
              value={laserPulseEnergyMegajoules}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLaserPulseEnergyMegajoules(val);
                setThrustKiloNewtons(Math.floor(val * 266));
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Micro-Fission/Fusion Coupling:</strong> Fissile Californium-252 shells reflect thermonuclear neutrons back into the core, multiplying fusion burn rates by 100x!</div>
            <div>• <strong>Magnetic Nozzle Redirection:</strong> Superconducting magnetic coils collimate high-energy charged fission fragments directly into thrust without mechanical nozzle erosion!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
