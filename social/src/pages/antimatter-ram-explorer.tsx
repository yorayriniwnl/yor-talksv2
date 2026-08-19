import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AntimatterRamExplorer() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [antiprotonInjectionRatePps, setAntiprotonInjectionRatePps] = useState(10); // 10^12 antiprotons/sec
  const [specificImpulseSec, setSpecificImpulseSec] = useState(250000); // 250,000 s Isp
  const [thrustMegaNewtons, setThrustMegaNewtons] = useState(1.8); // 1.8 MN thrust
  const [relativisticBeta, setRelativisticBeta] = useState(0.42); // 0.42c interstellar cruise

  const animFrameRef = useRef<number | null>(null);
  const pionBeamRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // ACMF Antimatter-Catalyzed Micro-Fission/Fusion Starship Canvas
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

      // Dark Interstellar Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starship Main Structural Truss & Antiproton Storage Penning Traps (80 to 280)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(280, cy);
      ctx.stroke();

      // Dual Superconducting Penning Trap Rings (at 120 and 200)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(140, cy, 14, 0, Math.PI * 2);
      ctx.arc(220, cy, 14, 0, Math.PI * 2);
      ctx.fill();

      // ACMF Catalyzed Micro-Fission/Fusion Reaction Chamber (280 to 400)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 18;
      ctx.fillRect(280, cy - 30, 120, 60);
      ctx.strokeRect(280, cy - 30, 120, 60);
      ctx.shadowBlur = 0;

      // Gigawatt Superconducting Magnetic Expansion Nozzle Coils (400 to 560)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(400, cy - 25); ctx.lineTo(560, cy - 85);
      ctx.moveTo(400, cy + 25); ctx.lineTo(560, cy + 85);
      ctx.stroke();

      // Relativistic Charged Pion / Fusion Fragment Exhaust Stream
      if (Math.random() < 0.45) {
        pionBeamRef.current.push({
          x: 400,
          y: cy + (Math.random() - 0.5) * 30,
          vx: 18 + antiprotonInjectionRatePps * 0.4,
        });
      }

      pionBeamRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      pionBeamRef.current = pionBeamRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ACMF RAM-EXPLORER: p̄ INJECTION = ${antiprotonInjectionRatePps}×10¹² /s (I_sp = ${specificImpulseSec.toLocaleString()} s | F = ${thrustMegaNewtons} MN | v = ${relativisticBeta}c)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [antiprotonInjectionRatePps, specificImpulseSec, thrustMegaNewtons, relativisticBeta]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Magnet className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                ACMF RAM-EXPLORER // ANTIMATTER-CATALYZED MICRO-FISSION/FUSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                250,000s Isp (GERALD SMITH & HOWE - PENN STATE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Antiproton Penning traps & relativistic magnetic nozzle expansion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">RELATIVISTIC VELOCITY</div>
            <div className="text-xl font-bold text-pink-400">{relativisticBeta} <span className="text-xs">c</span></div>
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
              <span className="text-pink-400 font-bold">INJECTION: {antiprotonInjectionRatePps}×10¹² p̄/s</span>
              <span className="text-amber-400 font-bold">I_sp: {specificImpulseSec.toLocaleString()} s</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustMegaNewtons} MN</span>
            </div>
            <div>STATUS: CONTINUOUS 0.42c RELATIVISTIC ACCELERATION</div>
          </div>
        </div>

        {/* ACMF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ANTIPROTON FLUX
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>p̄ Injection Rate:</span>
              <span className="text-pink-400 font-bold">{antiprotonInjectionRatePps}×10¹² /s</span>
            </div>
            <input
              type="range"
              min={2}
              max={30}
              step={2}
              value={antiprotonInjectionRatePps}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAntiprotonInjectionRatePps(val);
                setThrustMegaNewtons(+(val * 0.18).toFixed(2));
                setRelativisticBeta(+(0.2 + val * 0.015).toFixed(2));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hyper-Catalyzed Micro-Fission:</strong> Antiproton annihilation inside heavy U-238 / Deuterium target pellets deposits 100% fission energy instantly without requiring critical mass!</div>
            <div>• <strong>Magnetic Nozzle Expansion:</strong> A 10-Tesla superconducting magnetic coil guides expanding charged pion products into a collimated relativistic exhaust vector!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
