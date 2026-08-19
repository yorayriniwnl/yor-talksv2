import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AntimatterCore() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [magneticFieldTesla, setMagneticFieldTesla] = useState(12.5); // 12.5 Tesla superconducting mirror nozzle
  const [annihilationRateUgSec, setAnnihilationRateUgSec] = useState(25); // 25 ug/s antiproton injection
  const [specificImpulseSec, setSpecificImpulseSec] = useState(10000000); // 10,000,000 s Isp
  const [thrustKn, setThrustKn] = useState(4.8); // 4.8 kN relativistic thrust

  const animFrameRef = useRef<number | null>(null);
  const pionBeamRef = useRef<{ x: number; y: number; vx: number; vy: number; charge: number; life: number }[]>([]);

  // Beam-Core Antimatter Annihilation & Relativistic Pion Jet Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Deep Space
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Antiproton Storage Penning Trap & Injection Rail (Left 60-180)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.strokeRect(60, cy - 25, 120, 50);

      // Superconducting Magnetic Mirror Throat (12 Tesla Coils at 180-220)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(180, cy - 45, 14, 90);
      ctx.fillRect(210, cy - 55, 14, 110);

      // Annihilation Reaction Zone at Nozzle Throat (200, cy)
      const coreGrad = ctx.createRadialGradient(200, cy, 2, 200, cy, 24);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#ec4899');
      coreGrad.addColorStop(0.7, '#8b5cf6');
      coreGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(200, cy, 24, 0, Math.PI * 2);
      ctx.fill();

      // Spawn Charged Pions (pi+ and pi- Relativistic Exhaust at 0.67c)
      for (let i = 0; i < 6; i++) {
        pionBeamRef.current.push({
          x: 205,
          y: cy + (Math.random() - 0.5) * 12,
          vx: Math.random() * 5 + 14, // 0.67c relativistic velocity
          vy: (Math.random() - 0.5) * 2.5,
          charge: Math.random() < 0.5 ? 1 : -1,
          life: 70,
        });
      }

      // Draw Magnetic Divergent Nozzle Lines (Dotted Cyan/Purple)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(210, cy - 55); ctx.quadraticCurveTo(340, cy - 85, 480, cy - 110);
      ctx.moveTo(210, cy + 55); ctx.quadraticCurveTo(340, cy + 85, 480, cy + 110);
      ctx.stroke();

      // Draw Relativistic Charged Pion Particles
      pionBeamRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1.5;

        // Helical deflection along magnetic lines
        p.vy += Math.sin(p.x * 0.1) * 0.4 * p.charge;

        if (p.life > 0) {
          ctx.fillStyle = p.charge > 0 ? '#38bdf8' : '#ec4899';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      pionBeamRef.current = pionBeamRef.current.filter(p => p.life > 0 && p.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [magneticFieldTesla]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                BEAM-CORE ANTIMATTER // RELATIVISTIC PION EXHAUST (0.67c)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Isp = 10,000,000s (NASA NIAC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Antiproton-proton annihilation & 12 Tesla magnetic mirror pion collimation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">EXHAUST VELOCITY</div>
            <div className="text-xl font-bold text-pink-400">0.67 <span className="text-xs">c (200,000 km/s)</span></div>
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
              <span className="text-purple-400 font-bold">MAGNETIC NOZZLE: {magneticFieldTesla} Tesla</span>
              <span className="text-pink-400 font-bold">INJECTION: {annihilationRateUgSec} μg/s</span>
              <span className="text-cyan-400 font-bold">THRUST: {thrustKn} kN</span>
            </div>
            <div>STATUS: DIRECT RELATIVISTIC CHARGED PION (π±) CONFINEMENT</div>
          </div>
        </div>

        {/* Antimatter Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              MAGNETIC FIELD
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Nozzle Field (B):</span>
              <span className="text-purple-400 font-bold">{magneticFieldTesla} Tesla</span>
            </div>
            <input
              type="range"
              min={5.0}
              max={25.0}
              step={0.5}
              value={magneticFieldTesla}
              onChange={(e) => setMagneticFieldTesla(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>100% Mass-Energy Conversion:</strong> Matter-antimatter annihilation converts 100% of rest mass directly into pure kinetic energy according to E = mc²!</div>
            <div>• <strong>Direct Magnetic Channeling:</strong> Charged pions (π⁺, π⁻) carry 60% of the annihilation energy and are guided directly by magnetic mirror fields at 0.67c!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
