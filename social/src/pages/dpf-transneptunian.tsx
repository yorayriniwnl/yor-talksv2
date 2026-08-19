import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DpfTransneptunian() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [capacitorBankVoltageKv, setCapacitorBankVoltageKv] = useState(45); // 45 kV pulsed capacitor bank
  const [plasmoidTempGigaKelvin, setPlasmoidTempGigaKelvin] = useState(1.8); // 1.8 Billion K (150 keV p-11B peak)
  const [specificImpulseSec, setSpecificImpulseSec] = useState(140000); // 140,000 s Isp
  const [transitTimeYearsSedna, setTransitTimeYearsSedna] = useState(2.2); // 2.2 years to Sedna

  const animFrameRef = useRef<number | null>(null);
  const alphaParticlesRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // DPF p-11B Aneutronic Plasmoid Fusion Canvas
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

      // Coaxial DPF Anode & Cathode Electrodes (Left: 80 to 240)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      // Outer Cathode Rods
      ctx.moveTo(80, cy - 50); ctx.lineTo(240, cy - 50);
      ctx.moveTo(80, cy + 50); ctx.lineTo(240, cy + 50);
      ctx.stroke();

      // Central Anode Tube
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(235, cy);
      ctx.stroke();

      // Dense Pinched Plasmoid Core (at 250, cy)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(250, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magnetic Thrust Nozzle (260 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(260, cy - 25); ctx.lineTo(520, cy - 80);
      ctx.moveTo(260, cy + 25); ctx.lineTo(520, cy + 80);
      ctx.stroke();

      // Relativistic Alpha Particle Exhaust Streams (p + 11B -> 3 4He + 8.7 MeV)
      if (Math.random() < 0.6) {
        alphaParticlesRef.current.push({
          x: 260,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 18 + (capacitorBankVoltageKv / 45) * 8,
        });
      }

      alphaParticlesRef.current.forEach((a) => {
        a.x += a.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      alphaParticlesRef.current = alphaParticlesRef.current.filter(a => a.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DPF ANEUTRONIC SCOUT: V_bank = ${capacitorBankVoltageKv} kV | T_plasmoid = ${plasmoidTempGigaKelvin} GK | I_sp = ${specificImpulseSec.toLocaleString()} s | SEDNA TRANSIT = ${transitTimeYearsSedna} YEARS`,
        55,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [capacitorBankVoltageKv, plasmoidTempGigaKelvin, specificImpulseSec, transitTimeYearsSedna]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-400">
                DPF TRANS-NEPTUNIAN SCOUT // ANEUTRONIC BORON FUSION DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                140,000s Isp (LPPF & NASA NIAC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              1.8 Billion Kelvin plasmoid pinch & 2.2-year fast trajectory to Sedna for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SEDNA TRANSIT</div>
            <div className="text-xl font-bold text-amber-400">{transitTimeYearsSedna} <span className="text-xs">YEARS</span></div>
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
              <span className="text-amber-400 font-bold">VOLTAGE: {capacitorBankVoltageKv} kV</span>
              <span className="text-pink-400 font-bold">TEMP: {plasmoidTempGigaKelvin} GK</span>
              <span className="text-emerald-400 font-bold">I_sp: {specificImpulseSec.toLocaleString()} s</span>
            </div>
            <div>STATUS: CLEAN ANEUTRONIC ALPHA EXHAUST</div>
          </div>
        </div>

        {/* DPF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CAPACITOR BANK (kV)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Discharge Voltage:</span>
              <span className="text-amber-400 font-bold">{capacitorBankVoltageKv} kV</span>
            </div>
            <input
              type="range"
              min={20}
              max={80}
              step={5}
              value={capacitorBankVoltageKv}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCapacitorBankVoltageKv(val);
                setTransitTimeYearsSedna(+(100 / val).toFixed(1));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Aneutronic Fusion Power:</strong> The p-11B reaction yields three charged alpha particles (3 He-4) and zero prompt neutrons, eliminating heavy biological and thermal radiation shielding!</div>
            <div>• <strong>Rapid Deep-Space Cruise:</strong> Generating continuous I_sp = 140,000 s thrust cuts travel times to outer trans-Neptunian objects from 30+ years down to only 2.2 years!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
