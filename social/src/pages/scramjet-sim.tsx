import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Wind, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Compass, Gauge
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ScramjetSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [inletMach, setInletMach] = useState(7.2);
  const [fuelEquivalenceRatio, setFuelEquivalenceRatio] = useState(1.05); // Hydrogen equivalence
  const [combustorTempK, setCombustorTempK] = useState(2680); // Kelvin
  const [netThrustKn, setNetThrustKn] = useState(145.8); // kN

  const animFrameRef = useRef<number | null>(null);

  // Scramjet Supersonic Flow Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Hypersonic Wind Tunnel Chamber
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Scramjet Upper & Lower Walls (Convergent-Divergent Supersonic Duct)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 14;
      ctx.beginPath();
      // Upper Wall
      ctx.moveTo(0, cy - 140);
      ctx.lineTo(240, cy - 65);
      ctx.lineTo(500, cy - 65);
      ctx.lineTo(canvas.width, cy - 150);
      // Lower Wall
      ctx.moveTo(0, cy + 140);
      ctx.lineTo(240, cy + 65);
      ctx.lineTo(500, cy + 65);
      ctx.lineTo(canvas.width, cy + 150);
      ctx.stroke();

      // Oblique Shockwave Diamonds (Mach Cones)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, cy - 140); ctx.lineTo(240, cy + 65);
      ctx.moveTo(0, cy + 140); ctx.lineTo(240, cy - 65);
      ctx.moveTo(240, cy - 65); ctx.lineTo(360, cy + 65);
      ctx.moveTo(240, cy + 65); ctx.lineTo(360, cy - 65);
      ctx.stroke();

      // Supersonic Hydrogen Combustion Flame in Cavity
      const flameGrad = ctx.createLinearGradient(280, cy, 650, cy);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, '#f59e0b');
      flameGrad.addColorStop(0.7, '#ef4444');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = flameGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.ellipse(400, cy, 140, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Fuel Injection Strut
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(270, cy - 25, 12, 50);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [inletMach, combustorTempK]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                SCRAMJET // MACH 7+ SUPERSONIC COMBUSTION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                OBLIQUE SHOCK TRAIN
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Supersonic internal flow & hydrogen auto-ignition dynamics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Net Thrust Banner */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">NET THRUST</div>
            <div className="text-xl font-bold text-amber-400">{netThrustKn} <span className="text-xs">kN</span></div>
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
              <span className="text-amber-400 font-bold">INLET: MACH {inletMach}</span>
              <span className="text-rose-400 font-bold">COMBUSTOR TEMP: {combustorTempK} K</span>
            </div>
            <div>STATUS: SUPERSONIC COMBUSTION SUSTAINED</div>
          </div>
        </div>

        {/* Scramjet Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              AEROTHERMODYNAMICS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Flight Inflow Mach:</span>
              <span className="text-amber-400 font-bold">Mach {inletMach}</span>
            </div>
            <input
              type="range"
              min={5.0}
              max={10.0}
              step={0.1}
              value={inletMach}
              onChange={(e) => setInletMach(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">SCRAMJET ADVANTAGE:</span>
            <div>• Avoids turbine rotordynamics; airflow stays supersonic throughout combustion duct.</div>
            <div>• Air residence time in combustor is under 1 millisecond.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
