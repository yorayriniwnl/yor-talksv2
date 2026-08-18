import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Zap, Play, Pause, RotateCcw, 
  Sun, Activity, Sliders, ShieldCheck, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TokamakSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [plasmaTempMillionC, setPlasmaTempMillionC] = useState(150); // 150 Million C (10x Sun's Core)
  const [toroidalFieldTesla, setToroidalFieldTesla] = useState(5.3); // Tesla
  const [plasmaCurrentMa, setPlasmaCurrentMa] = useState(15.0); // Mega-Amperes
  const [qFactor, setQFactor] = useState(10.2); // Q > 1 = Net gain
  const [isConfined, setIsConfined] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  // Tokamak Toroidal Plasma Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Reactor Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tokamak Outer D-Shaped Vacuum Vessel Shell
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 260, 180, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Magnetic Poloidal Field Coils (Top, Bottom, Side Rings)
      ctx.fillStyle = '#0284c7';
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 10;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        const x = cx + Math.cos(a) * 280;
        const y = cy + Math.sin(a) * 200;
        ctx.fillRect(x - 8, y - 8, 16, 16);
      }
      ctx.shadowBlur = 0;

      // Glowing Toroidal Plasma Ribbon (150 Million °C D-T Fusion)
      if (isConfined) {
        for (let r = 100; r < 200; r += 6) {
          const plasmaGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
          plasmaGrad.addColorStop(0, '#ffffff');
          plasmaGrad.addColorStop(0.3, '#f43f5e');
          plasmaGrad.addColorStop(0.7, '#8b5cf6');
          plasmaGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

          ctx.strokeStyle = plasmaGrad;
          ctx.lineWidth = 4;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r * 0.65, Math.sin(time + r * 0.05) * 0.1, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Helical Magnetic Field Pitch Lines
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const aOffset = i * (Math.PI / 3) + time * 2;
          ctx.beginPath();
          for (let th = 0; th < Math.PI * 2; th += 0.1) {
            const rx = 150 + Math.sin(th * 3 + aOffset) * 25;
            const ry = 95 + Math.cos(th * 3 + aOffset) * 18;
            const px = cx + Math.cos(th) * rx;
            const py = cy + Math.sin(th) * ry;

            if (th === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isConfined, plasmaTempMillionC, toroidalFieldTesla]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-rose-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(244,63,94,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-500/30 border border-rose-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400">
                TOKAMAK // MAGNETIC CONFINEMENT FUSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                LAWSON CRITERION Q = 10.2
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              150M °C Deuterium-Tritium plasma confinement & helical magnetic stabilization for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Net Gain Status */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">ENERGY GAIN FACTOR (Q)</div>
            <div className="text-lg font-bold text-emerald-400">Q = {qFactor} (NET POWER IGNITION)</div>
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
            height={500}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-rose-400 font-bold">CORE: {plasmaTempMillionC}M °C</span>
              <span className="text-cyan-400 font-bold">MAGNETIC FIELD: {toroidalFieldTesla} TESLA</span>
            </div>
            <div>STATUS: GRAD-SHAFRANOV EQUILIBRIUM LOCKED</div>
          </div>
        </div>

        {/* Fusion Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PLASMA PARAMETERS
            </h3>
          </div>

          {/* Temperature */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Core Temperature:</span>
              <span className="text-rose-400 font-bold">{plasmaTempMillionC}M °C</span>
            </div>
            <input
              type="range"
              min={80}
              max={200}
              step={5}
              value={plasmaTempMillionC}
              onChange={(e) => setPlasmaTempMillionC(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Toroidal Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Toroidal Magnetic Field:</span>
              <span className="text-cyan-400 font-bold">{toroidalFieldTesla} T</span>
            </div>
            <input
              type="range"
              min={3.0}
              max={12.0}
              step={0.2}
              value={toroidalFieldTesla}
              onChange={(e) => setToroidalFieldTesla(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">D-T FUSION REACTION:</span>
            <div>• ²H + ³H → ⁴He (3.5 MeV) + n (14.1 MeV).</div>
            <div>• Superconducting coils prevent 150M °C plasma from touching reactor walls.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
