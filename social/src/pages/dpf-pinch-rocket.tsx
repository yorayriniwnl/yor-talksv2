import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DpfPinchRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dischargeCurrentMegaAmps, setDischargeCurrentMegaAmps] = useState(3.2); // 3.2 MA DPF pinch current
  const [pulseRepetitionHz, setPulseRepetitionHz] = useState(25); // 25 Hz pulsed focus bursts
  const [specificImpulseSec, setSpecificImpulseSec] = useState(120000); // 120,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(480); // 480 kN direct alpha thrust

  const animFrameRef = useRef<number | null>(null);
  const alphaIonBeamsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Dense Plasma Focus (DPF) Aneutronic p-11B Canvas
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

      // Coaxial Anode & Cathode Electrode Assembly (Left: 80 to 280)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;

      // Outer Cathode Rods
      ctx.beginPath();
      ctx.moveTo(80, cy - 60); ctx.lineTo(280, cy - 60);
      ctx.moveTo(80, cy + 60); ctx.lineTo(280, cy + 60);
      ctx.stroke();

      // Central Solid Anode Rod
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(260, cy);
      ctx.stroke();

      // Dense Sub-Millimeter Plasmoid Pinch Core at Tip of Anode (at 280, cy)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(280, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Direct Magnetic Deceleration & Ion Acceleration Nozzle (280 to 480)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(280, cy - 30); ctx.lineTo(480, cy - 80);
      ctx.moveTo(280, cy + 30); ctx.lineTo(480, cy + 80);
      ctx.stroke();

      // Aneutronic Helium-4 (Alpha Particle) Direct Ion Beam Ejection
      if (Math.random() < 0.5) {
        alphaIonBeamsRef.current.push({
          x: 280,
          y: cy + (Math.random() - 0.5) * 14,
          vx: 18 + dischargeCurrentMegaAmps * 2.5,
        });
      }

      alphaIonBeamsRef.current.forEach((a) => {
        a.x += a.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      alphaIonBeamsRef.current = alphaIonBeamsRef.current.filter(a => a.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DPF ANEUTRONIC p-¹¹B: PINCH CURRENT = ${dischargeCurrentMegaAmps} MA (I_sp = ${specificImpulseSec.toLocaleString()} s | F = ${thrustKiloNewtons} kN | ZERO NEUTRONS)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dischargeCurrentMegaAmps, pulseRepetitionHz, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Zap className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-cyan-300 to-pink-400">
                DPF PINCH ROCKET // ANEUTRONIC P-¹¹B FUSION PROPULSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                120,000s Isp (ERIC LERNER - LPPF / NASA NIAC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3.2 MA coaxial plasmoid pinch & direct alpha ion beam ejection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-amber-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-amber-400 font-bold">CURRENT: {dischargeCurrentMegaAmps} MA</span>
              <span className="text-cyan-400 font-bold">REP RATE: {pulseRepetitionHz} Hz</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: CLEAN ANEUTRONIC ALPHA ION BEAM THRUST</div>
          </div>
        </div>

        {/* DPF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PINCH CURRENT
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Discharge Peak Current:</span>
              <span className="text-amber-400 font-bold">{dischargeCurrentMegaAmps} MA</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={6.0}
              step={0.2}
              value={dischargeCurrentMegaAmps}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDischargeCurrentMegaAmps(val);
                setThrustKiloNewtons(Math.floor(val * 150));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Aneutronic Fusion Reaction:</strong> Fusing natural Decaborane (${}^{11}\text{B}$) with protons releases three energetic Alpha particles ($3 \times \text{He}^4$) with zero destructive neutrons!</div>
            <div>• <strong>Direct Kinetic Conversion:</strong> Because all fusion products are charged ions, they are accelerated directly out the magnetic nozzle without requiring steam turbines or cooling towers!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
