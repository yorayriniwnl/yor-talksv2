import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CentrifugalMtfCarrier() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [centrifugalMachNumber, setCentrifugalMachNumber] = useState(3.4); // Mach 3.4 centrifugal ExB rotation
  const [liquidVortexCompressionMbar, setLiquidVortexCompressionMbar] = useState(150); // 150 Mbar acoustic vortex
  const [specificImpulseSec, setSpecificImpulseSec] = useState(300000); // 300,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(5500); // 5,500 kN fleet carrier thrust

  const animFrameRef = useRef<number | null>(null);
  const carrierPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Supersonic Centrifugal MTF Vortex Fusion Drive Canvas
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

      // Concentric Molten Pb-Li Vortex Cylinder (Left: 80 to 240)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(80, cy - 75, 160, 150);
      ctx.fillRect(80, cy - 75, 160, 150);

      // Rotating Liquid Vortex Swirl Lines
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      for (let s = 0; s < 4; s++) {
        const radius = 25 + s * 14;
        ctx.beginPath();
        ctx.arc(160, cy, radius, time * 2 + s, time * 2 + s + Math.PI);
        ctx.stroke();
      }

      // Supersonic Centrifugal Plasma Core (at 160, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(160, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magnetic Expansion Aerospike Divertor Nozzle (240 to 520)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(240, cy - 25); ctx.lineTo(520, cy - 85);
      ctx.moveTo(240, cy + 25); ctx.lineTo(520, cy + 85);
      ctx.stroke();

      // High-Velocity Centrifugal Fusion Exhaust Plasmoids
      if (Math.random() < 0.7) {
        carrierPlasmaJetsRef.current.push({
          x: 240,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 28 + (centrifugalMachNumber / 3.4) * 8,
        });
      }

      carrierPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      carrierPlasmaJetsRef.current = carrierPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CENTRIFUGAL MTF CARRIER: SPEED = Mach ${centrifugalMachNumber} | VORTEX PRESSURE = ${liquidVortexCompressionMbar} Mbar | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [centrifugalMachNumber, liquidVortexCompressionMbar, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-sky-300 to-pink-400">
                CENTRIFUGAL MTF CARRIER // 300,000s Isp VORTEX DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SIEMON, LINDEMUTH & ROMERO-TALAMAS (LANL & UMBC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Supersonic E×B centrifugal mirror & 150 Mbar acoustic vortex carrier starship for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CARRIER THRUST</div>
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
              <span className="text-amber-400 font-bold">ROTATION: Mach {centrifugalMachNumber}</span>
              <span className="text-cyan-400 font-bold">PRESSURE: {liquidVortexCompressionMbar} Mbar</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: CENTRIFUGAL SHEAR CONFINEMENT STABLE</div>
          </div>
        </div>

        {/* Centrifugal Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ROTATION (MACH)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>E×B Centrifugal Mach:</span>
              <span className="text-amber-400 font-bold">Mach {centrifugalMachNumber}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={6.0}
              step={0.2}
              value={centrifugalMachNumber}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCentrifugalMachNumber(val);
                setThrustKiloNewtons(Math.floor(val * 1617));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Centrifugal Shear Stabilization:</strong> Supersonic plasma rotation suppresses interchange and Kelvin-Helmholtz instabilities through velocity shear!</div>
            <div>• <strong>Acoustic Vortex Compression:</strong> Concentric liquid Pb-Li pistons compress the spinning magnetized core to 150 Mbar stagnation pressure without material liner degradation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
