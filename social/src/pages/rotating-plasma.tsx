import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, RotateCw
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RotatingPlasma() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [rotationVelocityKms, setRotationVelocityKms] = useState(300); // 300 km/s supersonic E x B rotation
  const [radialVoltageKv, setRadialVoltageKv] = useState(50); // 50 kV radial electric field
  const [specificImpulseSec, setSpecificImpulseSec] = useState(45000); // 45,000 s Isp
  const [thrustN, setThrustN] = useState(140.0); // 140 N thrust

  const animFrameRef = useRef<number | null>(null);
  const plasmaRingsRef = useRef<{ r: number; angle: number; speed: number; color: string }[]>([]);

  // Centrifugal Magnetic Confinement & Supersonic ExB Rotation Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Initialize Rotating Plasma Particles
    if (plasmaRingsRef.current.length === 0) {
      for (let i = 0; i < 48; i++) {
        plasmaRingsRef.current.push({
          r: 30 + Math.random() * 110,
          angle: Math.random() * Math.PI * 2,
          speed: (Math.random() * 0.05 + 0.05),
          color: i % 2 === 0 ? '#06b6d4' : '#ec4899',
        });
      }
    }

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Central High-Voltage Core Electrode (Cathode at cx, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('+50kV', cx - 14, cy + 3);

      // Outer Grounded Anode Cylinder (Radius 160)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 160, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Rotating Supersonic E x B Plasma Vortices
      plasmaRingsRef.current.forEach((p) => {
        p.angle += p.speed * (rotationVelocityKms / 300);

        const px = cx + Math.cos(p.angle) * p.r;
        const py = cy + Math.sin(p.angle) * p.r;

        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Centrifugal Magnetic Confinement Equipotential Rings
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1.5;
      for (let r = 50; r <= 140; r += 30) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('SUPERSONIC E×B AZIMUTHAL ROTATION (v_θ = 300 km/s)', cx - 160, cy + 190);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rotationVelocityKms]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <RotateCw className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                ROTATING PLASMA THRUSTER // CENTRIFUGAL CONFINEMENT (MCX)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                300 KM/S SUPERSONIC E×B DRIFT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Centrifugal hydrodynamic stabilization & high-Isp ion exhaust for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-cyan-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-cyan-400 font-bold">ROTATION: {rotationVelocityKms} km/s</span>
              <span className="text-pink-400 font-bold">VOLTAGE: {radialVoltageKv} kV</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustN} N</span>
            </div>
            <div>STATUS: CENTRIFUGAL FLUID TRAPPING & VELOCITY SHEAR STABILIZATION</div>
          </div>
        </div>

        {/* Rotating Plasma Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              RADIAL VOLTAGE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Core Voltage:</span>
              <span className="text-cyan-400 font-bold">{radialVoltageKv} kV</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              step={5}
              value={radialVoltageKv}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRadialVoltageKv(val);
                setRotationVelocityKms(val * 6);
                setThrustN(+(val * 2.8).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Centrifugal Trapping:</strong> Applying a radial electric field across an axial magnetic field drives plasma into supersonic rotation, creating centrifugal pseudogravity that pins ions into the central midplane!</div>
            <div>• <strong>Velocity Shear Stabilization:</strong> Differential rotation rates shear apart turbulent interchange eddies, suppressing heat loss and sustaining steady-state propulsion!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
