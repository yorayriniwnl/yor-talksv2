import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HdltThruster() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [rfPowerW, setRfPowerW] = useState(800); // 800 W 13.56 MHz RF input
  const [doubleLayerDropV, setDoubleLayerDropV] = useState(38.5); // 38.5 V spontaneous electric double layer
  const [specificImpulseSec, setSpecificImpulseSec] = useState(4200); // 4,200 s Isp
  const [thrustMn, setThrustMn] = useState(48.2); // 48.2 mN thrust

  const animFrameRef = useRef<number | null>(null);
  const plasmaBeamRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Helicon Double Layer Thruster (HDLT) Canvas
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

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Quartz Glass Source Tube (Left 60-260)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(60, cy - 40, 200, 80);

      // Helicon RF Antenna (Wrap-around coils in Gold)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(120, cy - 46, 12, 92);
      ctx.fillRect(180, cy - 46, 12, 92);

      // Spontaneous Electric Double Layer (DL) Region (Narrow 1mm sheet at Exit 260)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(260, cy - 45); ctx.lineTo(260, cy + 45);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dense High-Beta Helicon Plasma Core inside Tube (Cyan Glow)
      const tubeGrad = ctx.createRadialGradient(160, cy, 5, 160, cy, 38);
      tubeGrad.addColorStop(0, '#ffffff');
      tubeGrad.addColorStop(0.5, '#06b6d4');
      tubeGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = tubeGrad;
      ctx.beginPath();
      ctx.arc(160, cy, 38, 0, Math.PI * 2);
      ctx.fill();

      // Spawn Supersonic Ion Beam Particles Accelerated by Double Layer Potential Drop
      for (let i = 0; i < 6; i++) {
        plasmaBeamRef.current.push({
          x: 260,
          y: cy + (Math.random() - 0.5) * 60,
          vx: Math.random() * 6 + 12,
          vy: (Math.random() - 0.5) * 1.5,
          life: 80,
        });
      }

      // Draw Self-Neutralized Ion Beam
      plasmaBeamRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1.5;

        if (p.life > 0) {
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      plasmaBeamRef.current = plasmaBeamRef.current.filter(p => p.life > 0 && p.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rfPowerW]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                HELICON DOUBLE LAYER // HDLT ELECTRODELESS PROPULSION (ANU/ESA)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CURRENT-FREE ELECTRIC DOUBLE LAYER
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Spontaneous potential drop acceleration & zero-grid erosion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">DOUBLE LAYER DROP</div>
            <div className="text-xl font-bold text-pink-400">{doubleLayerDropV} <span className="text-xs">VOLTS</span></div>
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
              <span className="text-cyan-400 font-bold">RF POWER: {rfPowerW} W</span>
              <span className="text-pink-400 font-bold">Isp: {specificImpulseSec} s</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustMn} mN</span>
            </div>
            <div>STATUS: CONTINUOUS CURRENT-FREE DOUBLE LAYER BREAKAWAY</div>
          </div>
        </div>

        {/* Thruster Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              RF GENERATOR
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Antenna Power:</span>
              <span className="text-cyan-400 font-bold">{rfPowerW} W</span>
            </div>
            <input
              type="range"
              min={200}
              max={1500}
              step={50}
              value={rfPowerW}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRfPowerW(val);
                setThrustMn(+(val * 0.06025).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No Electrodes or Neutralizer:</strong> The electric double layer forms spontaneously in the plasma without grids, completely eliminating physical erosion and cathode failure.</div>
            <div>• <strong>Self-Neutralized:</strong> Equal numbers of ions and electrons naturally cross the boundary, preventing the spacecraft from charging up in space!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
