import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PuffFusionRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [zPinchCurrentMegaAmps, setZPinchCurrentMegaAmps] = useState(2.8); // 2.8 MA pulsed current
  const [specificImpulseSec, setSpecificImpulseSec] = useState(20000); // 20,000 s Isp
  const [thrustKn, setThrustKn] = useState(400); // 400 kN thrust
  const [fissionFractionPercent, setFissionFractionPercent] = useState(12); // 12% fission spark booster

  const animFrameRef = useRef<number | null>(null);
  const zPinchPulsesRef = useRef<{ x: number; y: number; r: number; opacity: number }[]>([]);

  // PuFF Pulsed Fission-Fusion Z-Pinch Canvas
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

      // Anode & Cathode Coaxial Electrodes (120 to 280)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(120, cy - 90); ctx.lineTo(280, cy - 40);
      ctx.moveTo(120, cy + 90); ctx.lineTo(280, cy + 40);
      ctx.stroke();

      // Magnetic Nozzle Throat & Divergent Cone (280 to 520)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(280, cy - 40); ctx.lineTo(520, cy - 120);
      ctx.moveTo(280, cy + 40); ctx.lineTo(520, cy + 120);
      ctx.stroke();

      // Spawn Megampere Z-Pinch Fission-Fusion Micro-Detonation
      if (Math.random() < 0.22) {
        zPinchPulsesRef.current.push({
          x: 280,
          y: cy,
          r: 5,
          opacity: 1.0,
        });
      }

      // Draw Expanding Z-Pinch Plasma Column & Exhaust Jet
      zPinchPulsesRef.current.forEach((p) => {
        p.r += 4.6;
        p.opacity -= 0.04;

        ctx.strokeStyle = `rgba(236, 72, 153, ${p.opacity})`;
        ctx.fillStyle = `rgba(6, 182, 212, ${p.opacity * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      zPinchPulsesRef.current = zPinchPulsesRef.current.filter(p => p.opacity > 0);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PuFF ROCKET: ${zPinchCurrentMegaAmps} MA Z-PINCH (I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKn} kN)`,
        80,
        cy + 175
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [zPinchCurrentMegaAmps, specificImpulseSec, thrustKn]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Magnet className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                PuFF ROCKET // PULSED FISSION-FUSION Z-PINCH DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                20,000s Isp (NASA MSFC / UAH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Megampere magnetic Z-pinch plasma compression & direct induction recovery for {currentUser?.name}
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
              <span className="text-cyan-400 font-bold">CURRENT: {zPinchCurrentMegaAmps} MA</span>
              <span className="text-pink-400 font-bold">FISSION SPARK: {fissionFractionPercent}%</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustKn} kN</span>
            </div>
            <div>STATUS: DIRECT INDUCTIVE POWER RECHARGES PULSE CAPACITORS</div>
          </div>
        </div>

        {/* PuFF Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PULSED CURRENT
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Z-Pinch Current:</span>
              <span className="text-cyan-400 font-bold">{zPinchCurrentMegaAmps} MA</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={5.0}
              step={0.2}
              value={zPinchCurrentMegaAmps}
              onChange={(e) => {
                const val = Number(e.target.value);
                setZPinchCurrentMegaAmps(val);
                setThrustKn(Math.round(val * 140));
                setSpecificImpulseSec(Math.round(val * 7100));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Fission-Assisted Pinch:</strong> A thin fissile sheath heats the D-T core prior to Lorentz force stagnation, dropping required pinch currents to readily achievable levels!</div>
            <div>• <strong>Self-Sustaining Direct Power:</strong> Direct inductive coils along the magnetic nozzle harvest pulse energy, eliminating massive external turbogenerators!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
