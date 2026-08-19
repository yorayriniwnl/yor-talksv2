import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AcmfRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [antiprotonsPerPulse, setAntiprotonsPerPulse] = useState(1.0); // 1.0 x 10^11 antiprotons
  const [specificImpulseSec, setSpecificImpulseSec] = useState(100000); // 100,000 s Isp
  const [pulseRateHz, setPulseRateHz] = useState(10); // 10 Hz detonation rate
  const [thrustKn, setThrustKn] = useState(100); // 100 kN thrust

  const animFrameRef = useRef<number | null>(null);
  const detonationsRef = useRef<{ x: number; y: number; r: number; opacity: number }[]>([]);

  // ACMF Antimatter-Catalyzed Micro-Fission/Fusion Canvas
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

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Superconducting Magnetic Thrust Chamber Shell (120 to 340)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(220, cy, 100, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();

      // Magnetic Expansion Nozzle (320 to 480)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(320, cy - 80); ctx.lineTo(480, cy - 140);
      ctx.moveTo(320, cy + 80); ctx.lineTo(480, cy + 140);
      ctx.stroke();

      // Antiproton Penning Trap Injector (Left side at 100, cy)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.fillRect(80, cy - 15, 40, 30);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('p̄ TRAP', 82, cy + 30);

      // Trigger Periodic Micro-Fission/Fusion Detonations at 220, cy
      if (Math.random() < 0.2) {
        detonationsRef.current.push({
          x: 220,
          y: cy,
          r: 5,
          opacity: 1.0,
        });
      }

      // Draw Expanding Detonations & Superheated Plasma Exhaust
      detonationsRef.current.forEach((d) => {
        d.r += 3.5;
        d.opacity -= 0.04;

        ctx.strokeStyle = `rgba(236, 72, 153, ${d.opacity})`;
        ctx.fillStyle = `rgba(245, 158, 11, ${d.opacity * 0.6})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      detonationsRef.current = detonationsRef.current.filter(d => d.opacity > 0);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ANTIMATTER-CATALYZED MICRO-FISSION/FUSION: 10¹¹ p̄/PULSE (I_sp = ${specificImpulseSec.toLocaleString()} s | F = ${thrustKn} kN)`,
        80,
        cy + 160
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [antiprotonsPerPulse, specificImpulseSec, thrustKn]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                ANTIMATTER-CATALYZED MICRO-FISSION // ACMF FUSION ROCKET
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                100,000s Isp (PENN STATE / ICAN-II)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Antiproton-induced hyper-dense U-235 fission & D-T fusion micro-explosions for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-pink-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-pink-400 font-bold">p̄ / PULSE: {antiprotonsPerPulse} × 10¹¹</span>
              <span className="text-cyan-400 font-bold">RATE: {pulseRateHz} Hz</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustKn} kN</span>
            </div>
            <div>STATUS: HYPER-DENSE DETONATION VIA PICOGRAM ANTIMATTER</div>
          </div>
        </div>

        {/* ACMF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ANTIPROTON INJECTION
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Antiprotons per Shot (×10¹¹):</span>
              <span className="text-pink-400 font-bold">{antiprotonsPerPulse}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.5}
              value={antiprotonsPerPulse}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAntiprotonsPerPulse(val);
                setThrustKn(Math.round(val * 100));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hyper-Dense Fission:</strong> When an antiproton annihilates on a U-235 nucleus, it releases ~2 GeV of energy and induces 100% instantaneous fission with 3.5 fast neutrons!</div>
            <div>• <strong>Micro-Fusion Ignition:</strong> The extreme local temperature and pressure compress surrounding Deuterium-Tritium to fusion ignition conditions with only picograms of antimatter!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
