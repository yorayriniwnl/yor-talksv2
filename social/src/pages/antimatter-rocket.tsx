import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AntimatterRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [antimatterFlowUgSec, setAntimatterFlowUgSec] = useState(12.5); // 12.5 micrograms / sec
  const [specificImpulseSec, setSpecificImpulseSec] = useState(10000000); // 10 Million seconds Isp
  const [exhaustRelativisticV, setExhaustRelativisticV] = useState(0.33); // 0.33c relativistic exhaust velocity
  const [thrustKn, setThrustKn] = useState(185);

  const animFrameRef = useRef<number | null>(null);
  const pionBeamRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Beam-Core Antimatter Rocket Canvas
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

      // Superconducting Magnetic Coils (Magnetic Nozzle)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(80, cy - 100, 30, 200);
      ctx.fillRect(160, cy - 120, 30, 240);

      // Annihilation Reaction Chamber Core (Proton-Antiproton Point Source)
      const coreGrad = ctx.createRadialGradient(140, cy, 2, 140, cy, 40);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#ec4899');
      coreGrad.addColorStop(0.7, '#a855f7');
      coreGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = coreGrad;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(140, cy, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Spawn Relativistic Charged Pion Particles (pi+ / pi-)
      for (let i = 0; i < 4; i++) {
        pionBeamRef.current.push({
          x: 140,
          y: cy + (Math.random() - 0.5) * 20,
          vx: Math.random() * 15 + 20,
          vy: (Math.random() - 0.5) * 3,
          life: 80,
        });
      }

      // Draw Relativistic Charged Pion Exhaust Stream
      pionBeamRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 2;

        if (p.life > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      pionBeamRef.current = pionBeamRef.current.filter(p => p.life > 0 && p.x < canvas.width);

      // Collimated Magnetic Exhaust Jet
      const beamGrad = ctx.createLinearGradient(140, cy, canvas.width, cy);
      beamGrad.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
      beamGrad.addColorStop(0.3, 'rgba(6, 182, 212, 0.4)');
      beamGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(140, cy - 25);
      ctx.lineTo(canvas.width, cy - 60);
      ctx.lineTo(canvas.width, cy + 60);
      ctx.lineTo(140, cy + 25);
      ctx.closePath();
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [antimatterFlowUgSec]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Atom className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-400">
                BEAM-CORE ANTIMATTER ROCKET // RELATIVISTIC PION PROPULSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                10,000,000S SPECIFIC IMPULSE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              100% mass-to-energy conversion & magnetic nozzle pion collimation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Isp */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">EXHAUST VELOCITY</div>
            <div className="text-xl font-bold text-pink-400">{exhaustRelativisticV} <span className="text-xs">× SPEED OF LIGHT (c)</span></div>
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
              <span className="text-pink-400 font-bold">FLOW: {antimatterFlowUgSec} μg/s</span>
              <span className="text-cyan-400 font-bold">THRUST: {thrustKn} kN</span>
            </div>
            <div>STATUS: RELATIVISTIC CHARGED PION CONFINEMENT</div>
          </div>
        </div>

        {/* Engine Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ANTIPROTON FLOW
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Antiproton Mass Flow:</span>
              <span className="text-pink-400 font-bold">{antimatterFlowUgSec} μg/s</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={30.0}
              step={0.5}
              value={antimatterFlowUgSec}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAntimatterFlowUgSec(val);
                setThrustKn(Math.round(val * 14.8));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">ULTIMATE EFFICIENCY:</span>
            <div>• Proton-antiproton annihilation converts 100% of rest mass into energy, producing charged pions (π±) traveling at 0.94c.</div>
            <div>• Magnetic nozzle focuses pions to achieve 0.3c cruise speeds for interstellar flybys.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
