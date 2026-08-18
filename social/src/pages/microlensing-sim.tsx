import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Globe2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MicrolensingSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [impactParamU0, setImpactParamU0] = useState(0.15); // Closest approach in Einstein radii
  const [planetMassRatioQ, setPlanetMassRatioQ] = useState(0.001); // Jupiter mass ratio
  const [peakMagnification, setPeakMagnification] = useState(6.8);

  const animFrameRef = useRef<number | null>(null);

  // Microlensing Einstein Ring & Light Curve Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = 180;

      // Dark Cosmic Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background Source Star Path (Moving horizontally across lens)
      const sourceX = cx - 200 + ((time * 40) % 400);
      const sourceY = cy + impactParamU0 * 70;

      // Einstein Ring Boundary (Radius theta_E = 70px)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Central Lens Star (Foreground Star)
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Orbiting Exoplanet (Small companion creating Caustic)
      const planetX = cx + 55;
      const planetY = cy - 25;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(planetX, planetY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Distorted Lensed Images (Two curved arcs)
      const dx = sourceX - cx;
      const dy = sourceY - cy;
      const u = Math.sqrt(dx * dx + dy * dy) / 70;

      if (u > 0.05) {
        // Image A (Major arc outside ring)
        const rA = (u + Math.sqrt(u * u + 4)) / 2 * 70;
        const angA = Math.atan2(dy, dx);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angA) * rA, cy + Math.sin(angA) * rA, 5, 0, Math.PI * 2);
        ctx.fill();

        // Image B (Minor arc inside ring)
        const rB = Math.abs(u - Math.sqrt(u * u + 4)) / 2 * 70;
        const angB = angA + Math.PI;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angB) * rB, cy + Math.sin(angB) * rB, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Paczyński Magnification Light Curve at bottom
      const curveY = 380;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, curveY); ctx.lineTo(canvas.width - 60, curveY);
      ctx.stroke();

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 8;
      ctx.beginPath();

      for (let x = 60; x < canvas.width - 60; x += 3) {
        const uVal = Math.abs((x - cx) / 70);
        // Paczynski magnification A(u) = (u^2 + 2) / (u * sqrt(u^2 + 4))
        let A = (uVal * uVal + 2) / (Math.max(0.1, uVal) * Math.sqrt(uVal * uVal + 4));
        // Add planetary secondary anomaly spike at x = cx + 55
        if (Math.abs(x - (cx + 55)) < 15) {
          A += 2.8;
        }

        const y = curveY - Math.min(100, (A - 1) * 22);
        if (x === 60) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [impactParamU0, planetMassRatioQ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Globe2 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                GRAVITATIONAL MICROLENSING // EXOPLANET CAUSTIC CROSSING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                EINSTEIN RADIUS θ_E
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Paczyński magnification curve & planetary secondary caustic spike for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Peak */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">PEAK MAGNIFICATION (A_max)</div>
            <div className="text-xl font-bold text-amber-400">{peakMagnification} <span className="text-xs">× FLUX</span></div>
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
              <span className="text-amber-400 font-bold">IMPACT PARAMETER: u₀ = {impactParamU0} θ_E</span>
              <span className="text-cyan-400 font-bold">PLANET MASS RATIO: q = {planetMassRatioQ}</span>
            </div>
            <div>STATUS: PLANETARY CAUSTIC ANOMALY DETECTED</div>
          </div>
        </div>

        {/* Microlensing Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LENSING GEOMETRY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Impact Parameter (u_0):</span>
              <span className="text-amber-400 font-bold">{impactParamU0} θ_E</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.01}
              value={impactParamU0}
              onChange={(e) => {
                const val = Number(e.target.value);
                setImpactParamU0(val);
                setPeakMagnification(+((val * val + 2) / (val * Math.sqrt(val * val + 4))).toFixed(1));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">MICROLENSING ADVANTAGE:</span>
            <div>• Detects cold Earth/Jupiter-mass exoplanets at 1-10 AU from their host stars.</div>
            <div>• Sensitive to planets without requiring light from either the planet or the lens star!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
