import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function KerrBlackHole() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [spinParameterA, setSpinParameterA] = useState(0.95); // Spin a/M (0 to 0.99)
  const [extractedEnergyPct, setExtractedEnergyPct] = useState(20.7); // Up to 29% via Penrose process
  const [frameDraggingRpm, setFrameDraggingRpm] = useState(1420);

  const animFrameRef = useRef<number | null>(null);

  // Kerr Spacetime Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04 * (1 + spinParameterA * 2);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Cosmic Spacetime Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Frame Dragging Swirl Vector Lines (Lense-Thirring effect)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1.5;
      for (let r = 240; r >= 80; r -= 20) {
        ctx.beginPath();
        const swirlAngle = (240 - r) * 0.02 * spinParameterA + time;
        for (let a = 0; a < Math.PI * 2; a += 0.1) {
          const x = cx + Math.cos(a + swirlAngle) * r;
          const y = cy + Math.sin(a + swirlAngle) * (r * 0.7); // Tilt
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Outer Ergosphere (Oblate Spheroid where spacetime moves faster than light)
      const ergoGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 110);
      ergoGrad.addColorStop(0, 'rgba(236, 72, 153, 0.4)');
      ergoGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.2)');
      ergoGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      ctx.fillStyle = ergoGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 110, 80, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer Event Horizon r+ = M + sqrt(M^2 - a^2)
      const rPlus = 45 * (1 + Math.sqrt(Math.max(0, 1 - spinParameterA * spinParameterA)));
      ctx.fillStyle = '#000000';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(cx, cy, rPlus, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Relativistic Accretion Ring Inner Edge
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 140, 45, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [spinParameterA]);

  const triggerPenroseProcess = () => {
    uiaudio.warp();
    setExtractedEnergyPct(+(20.7 + spinParameterA * 8.3).toFixed(1));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Orbit className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                KERR BLACK HOLE // ROTATING ERGOSPHERE & PENROSE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                SPIN a/M = {spinParameterA}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Lense-Thirring frame dragging & Penrose energy extraction for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerPenroseProcess}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>EXTRACT ROTATIONAL ENERGY</span>
          </button>
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
              <span className="text-pink-400 font-bold">PENROSE EFFICIENCY: +{extractedEnergyPct}%</span>
              <span className="text-cyan-400 font-bold">FRAME DRAGGING: {frameDraggingRpm} RPM</span>
            </div>
            <div>STATUS: ERGOSPHERE BOUNDARY ACTIVE</div>
          </div>
        </div>

        {/* Kerr Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              KERR METRIC CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Spin Parameter (a/M):</span>
              <span className="text-purple-400 font-bold">{spinParameterA}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.99}
              step={0.01}
              value={spinParameterA}
              onChange={(e) => setSpinParameterA(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">PENROSE PROCESS:</span>
            <div>• Roger Penrose 1969: A particle entering the ergosphere splits into two; one falls into the horizon with negative energy, allowing the escaping particle to emerge with up to 29% more energy than initial!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
