import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FrcSpheromakDrive() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [rmfFrequencyKilohertz, setRmfFrequencyKilohertz] = useState(120); // 120 kHz Rotating Magnetic Field
  const [plasmaBetaParameter, setPlasmaBetaParameter] = useState(0.88); // Beta = 0.88 high-beta plasmoid
  const [specificImpulseSec, setSpecificImpulseSec] = useState(185000); // 185,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(2100); // 2,100 kN heavy thruster

  const animFrameRef = useRef<number | null>(null);
  const spheromakPlasmoidsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // FRC Spheromak RMF Propulsion Canvas
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

      // Rotating Magnetic Field (RMF) Saddle Coils (Top & Bottom: 80 to 240)
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(80, cy - 65); ctx.lineTo(240, cy - 65);
      ctx.moveTo(80, cy + 65); ctx.lineTo(240, cy + 65);
      ctx.stroke();

      // Closed Poloidal Flux Spheromak Toroid (at 160, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.ellipse(160, cy, 38, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Core Field Null Line (Green loop)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(160, cy, 22, 10, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Magnetic Expansion Nozzle (250 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(250, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(250, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // High-Velocity Ejected FRC Plasmoid Jets
      if (Math.random() < 0.6) {
        spheromakPlasmoidsRef.current.push({
          x: 250,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 22 + (rmfFrequencyKilohertz / 120) * 8,
        });
      }

      spheromakPlasmoidsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      spheromakPlasmoidsRef.current = spheromakPlasmoidsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRC SPHEROMAK DRIVE: RMF = ${rmfFrequencyKilohertz} kHz | PLASMA BETA β = ${plasmaBetaParameter} | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rmfFrequencyKilohertz, plasmaBetaParameter, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-amber-300 to-cyan-400">
                FRC SPHEROMAK DRIVE // ROTATING MAGNETIC FIELD PROPULSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                185,000s Isp (SLOUGH & KIRTLEY - MSNW & UNIV OF WASHINGTON)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              High-beta closed poloidal flux sustainment & 2,100 kN plasmoid propulsion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">PLASMOID THRUST</div>
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
              <span className="text-purple-400 font-bold">RMF: {rmfFrequencyKilohertz} kHz</span>
              <span className="text-amber-400 font-bold">BETA: β = {plasmaBetaParameter}</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: CLOSED POLOIDAL FLUX PLASMOID ACCELERATION ACTIVE</div>
          </div>
        </div>

        {/* FRC Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              RMF DRIVER (kHz)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Coil Frequency:</span>
              <span className="text-purple-400 font-bold">{rmfFrequencyKilohertz} kHz</span>
            </div>
            <input
              type="range"
              min={60}
              max={300}
              step={10}
              value={rmfFrequencyKilohertz}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRmfFrequencyKilohertz(val);
                setThrustKiloNewtons(Math.floor(val * 17.5));
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Rotating Magnetic Field (RMF) Drive:</strong> Synchronously drives azimuthal electron current rings, creating self-contained closed magnetic field topologies!</div>
            <div>• <strong>High Plasma Beta (beta approx 0.9):</strong> Confinement efficiency nears unity, preventing cyclotron radiation losses while delivering 2,100 kN thrust!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
