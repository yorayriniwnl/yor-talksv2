import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Gauge
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AlcubierreSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [warpFactor, setWarpFactor] = useState(4.5); // Apparent velocity 4.5c
  const [casimirRingActive, setCasimirRingActive] = useState(true);
  const [bubbleRadiusM, setBubbleRadiusM] = useState(100);

  const animFrameRef = useRef<number | null>(null);

  // Alcubierre Metric Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04 * warpFactor;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Spacetime Background
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spacetime Grid Distortions (Contracting ahead, Expanding behind)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1.5;

      for (let x = 40; x < canvas.width - 40; x += 30) {
        ctx.beginPath();
        const distToCenter = (x - cx);
        // Warp metric expansion / contraction displacement
        const warpCurve = Math.sin((distToCenter / 120) + time) * 35 * Math.exp(-Math.pow(distToCenter / 140, 2));

        for (let y = 60; y < canvas.height - 60; y += 15) {
          const px = x + warpCurve * Math.sin(y * 0.05);
          if (y === 60) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        ctx.stroke();
      }

      // Toroidal Exotic Matter Casimir Ring (Negative Energy Density)
      if (casimirRingActive) {
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 140, 50, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Central Flat-Spacetime Passenger Craft
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(cx + 35, cy);
      ctx.lineTo(cx - 25, cy - 18);
      ctx.lineTo(cx - 15, cy);
      ctx.lineTo(cx - 25, cy + 18);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [warpFactor, casimirRingActive]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                ALCUBIERRE WARP DRIVE // SPACETIME METRIC EXPANSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SUPERLUMINAL v_s = {warpFactor}c
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Negative energy Casimir field ring & flat spacetime passenger bubble for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Velocity Banner */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">APPARENT VELOCITY</div>
            <div className="text-xl font-bold text-cyan-400">{warpFactor} <span className="text-xs">× SPEED OF LIGHT (c)</span></div>
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
              <span className="text-cyan-400 font-bold">WARP BUBBLE: {bubbleRadiusM}m RADIUS</span>
              <span className="text-pink-400 font-bold">LOCAL PROPER TIME: 1.00s / s</span>
            </div>
            <div>STATUS: ZERO INTERNAL G-FORCE INERTIAL FRAME</div>
          </div>
        </div>

        {/* Metric Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              WARP METRIC CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Warp Speed Factor:</span>
              <span className="text-cyan-400 font-bold">{warpFactor}c</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={10.0}
              step={0.5}
              value={warpFactor}
              onChange={(e) => setWarpFactor(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">MIGUEL ALCUBIERRE 1994:</span>
            <div>• Contracts spacetime ahead and expands spacetime behind.</div>
            <div>• The ship stays locally motionless inside a flat bubble, avoiding relativistic time dilation and infinite mass barriers.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
