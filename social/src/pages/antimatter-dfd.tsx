import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AntimatterDfd() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [antiprotonInjectionRate, setAntiprotonInjectionRate] = useState(2.5); // 2.5 ug/s antiproton injection
  const [frcMagneticFieldTesla, setFrcMagneticFieldTesla] = useState(8.5); // 8.5 Tesla FRC magnetic field
  const [specificImpulseSec, setSpecificImpulseSec] = useState(180000); // 180,000 s Isp
  const [directElectricPowerMw, setDirectElectricPowerMw] = useState(12); // 12 MW power

  const animFrameRef = useRef<number | null>(null);
  const chargedFusionExhaustRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Antimatter-Initiated Direct Fusion Drive (DFD) Canvas
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

      // Rotating Magnetic Coils (Linear FRC Channel: 120 to 380)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      for (let c = 0; c < 5; c++) {
        const cx_coil = 140 + c * 55;
        ctx.strokeRect(cx_coil - 8, cy - 65, 16, 130);
      }

      // Toroidal Closed Field-Reversed Configuration (FRC) Plasmoid (Center at 250, cy)
      ctx.fillStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.ellipse(250, cy, 75, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Antiproton Injection Stream (Left Inward Needle)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(60, cy); ctx.lineTo(200, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`p̄ Inject: ${antiprotonInjectionRate} µg/s`, 70, cy - 8);

      // Magnetic Expansion Nozzle (380 to 560)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(380, cy - 30); ctx.lineTo(560, cy - 85);
      ctx.moveTo(380, cy + 30); ctx.lineTo(560, cy + 85);
      ctx.stroke();

      // D-3He High-Speed Charged Fusion Exhaust Stream
      if (Math.random() < 0.5) {
        chargedFusionExhaustRef.current.push({
          x: 380,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 20 + (antiprotonInjectionRate / 2.5) * 6,
        });
      }

      chargedFusionExhaustRef.current.forEach((e) => {
        e.x += e.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      chargedFusionExhaustRef.current = chargedFusionExhaustRef.current.filter(e => e.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ANTIMATTER DFD: B = ${frcMagneticFieldTesla} T | I_sp = ${specificImpulseSec.toLocaleString()} s | ELECTRIC POWER = ${directElectricPowerMw} MW | ANEUTRONIC D-³He`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [antiprotonInjectionRate, frcMagneticFieldTesla, specificImpulseSec, directElectricPowerMw]);

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-indigo-300 to-cyan-400">
                ANTIMATTER DFD // DIRECT FUSION DRIVE FRC CRUISER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                180,000s Isp (MICHAEL PALUSZEK - PRINCETON & NASA NIAC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Antiproton-catalyzed FRC ignition, 12 MW direct electric power & D-3He thrust for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">DIRECT POWER</div>
            <div className="text-xl font-bold text-pink-400">{directElectricPowerMw} <span className="text-xs">MW</span></div>
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
              <span className="text-pink-400 font-bold">INJECTION: {antiprotonInjectionRate} µg/s</span>
              <span className="text-cyan-400 font-bold">FRC FIELD: {frcMagneticFieldTesla} T</span>
              <span className="text-emerald-400 font-bold">POWER: {directElectricPowerMw} MW</span>
            </div>
            <div>STATUS: DIRECT CHARGED PARTICLES CONVERSION ACTIVE</div>
          </div>
        </div>

        {/* DFD Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ANTIPROTON INJECTION
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Injection Rate:</span>
              <span className="text-pink-400 font-bold">{antiprotonInjectionRate} µg/s</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.5}
              value={antiprotonInjectionRate}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAntiprotonInjectionRate(val);
                setDirectElectricPowerMw(Math.floor(val * 4.8));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Instantaneous FRC Ignition:</strong> Antiprotons annihilate with fuel nuclei, producing high-energy charged pions that heat the FRC plasmoid to $100\text{ keV}$ in milliseconds!</div>
            <div>• <strong>Dual Thrust & Power:</strong> Direct energy conversion coils capture electricity from expanding plasma pulses while exhausted ions generate massive specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
