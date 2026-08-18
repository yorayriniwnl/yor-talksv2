import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Compass, Globe2, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ExoplanetSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [planetRadiusRatio, setPlanetRadiusRatio] = useState(0.18); // Rp / R*
  const [orbitalPeriodDays, setOrbitalPeriodDays] = useState(4.2);
  const [semiMajorAxisAu, setSemiMajorAxisAu] = useState(0.05); // AU
  const [stellarType, setStellarType] = useState<'G-TYPE (SOLAR)' | 'M-DWARF (RED)' | 'F-TYPE (WHITE)'>('G-TYPE (SOLAR)');
  const [isOrbiting, setIsOrbiting] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  // Transit & Radial Velocity Canvas Loop
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
      const starY = 160;
      const starRadius = 55;

      // Dark Cosmic Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Star Glow
      const starColor = stellarType === 'M-DWARF (RED)' ? '#ef4444' : (stellarType === 'F-TYPE (WHITE)' ? '#38bdf8' : '#f59e0b');
      const starGrad = ctx.createRadialGradient(cx, starY, 10, cx, starY, starRadius * 1.6);
      starGrad.addColorStop(0, '#ffffff');
      starGrad.addColorStop(0.4, starColor);
      starGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = starGrad;
      ctx.beginPath();
      ctx.arc(cx, starY, starRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Star Core Disk
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(cx, starY, starRadius, 0, Math.PI * 2);
      ctx.fill();

      // Exoplanet Transit Orbit Position
      const orbitX = cx + Math.sin(time) * 220;
      const orbitZ = Math.cos(time);
      const planetRadius = starRadius * planetRadiusRatio;

      // Draw Planet if in front of star (Transit Phase)
      if (orbitZ > 0) {
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(orbitX, starY, Math.max(3, planetRadius), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Draw Transit Photometry Light Curve (Bottom Half)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const curveStartY = 380;
      const transitDepth = (planetRadiusRatio * planetRadiusRatio) * 120;

      for (let x = 60; x < canvas.width - 60; x += 3) {
        const t = ((x - 60) / (canvas.width - 120)) * Math.PI * 2;
        const inTransit = Math.abs(Math.sin(t - time)) < 0.25 && Math.cos(t - time) > 0;
        const dip = inTransit ? transitDepth : 0;
        const y = curveStartY + dip;

        if (x === 60) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Baseline Flux Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(60, curveStartY);
      ctx.lineTo(canvas.width - 60, curveStartY);
      ctx.stroke();
      ctx.setLineDash([]);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [planetRadiusRatio, stellarType, isOrbiting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Globe2 className="w-8 h-8 text-black animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400">
                EXOPLANET // TRANSIT PHOTOMETRY SPECTROGRAPH
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                KEPLER / TESS LIGHT CURVES
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              High-precision stellar transit dips & atmospheric absorption spectroscopy for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">TRANSIT DEPTH (ΔF/F)</div>
            <div className="text-base font-bold text-amber-400">{((planetRadiusRatio * planetRadiusRatio) * 100).toFixed(2)}%</div>
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
              <span className="text-amber-400 font-bold">ORBITAL PERIOD: {orbitalPeriodDays} DAYS</span>
              <span className="text-cyan-400 font-bold">SEMI-MAJOR AXIS: {semiMajorAxisAu} AU</span>
            </div>
            <div>STATUS: PHOTOMETRIC FLUX LOCKED</div>
          </div>
        </div>

        {/* Planet Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ORBITAL CONTROLS
            </h3>
          </div>

          {/* Planet Radius Ratio */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Radius Ratio (Rp / R*):</span>
              <span className="text-amber-400 font-bold">{planetRadiusRatio}</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.30}
              step={0.01}
              value={planetRadiusRatio}
              onChange={(e) => setPlanetRadiusRatio(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Stellar Type */}
          <div className="space-y-1.5 pt-1">
            <span className="text-zinc-400">Host Star Type:</span>
            <div className="space-y-1.5">
              {(['G-TYPE (SOLAR)', 'M-DWARF (RED)', 'F-TYPE (WHITE)'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => { uiaudio.click(); setStellarType(st); }}
                  className={cn(
                    "w-full text-left p-2.5 rounded-xl font-bold uppercase transition-all border text-[11px]",
                    stellarType === st ? "bg-amber-500 text-black border-amber-400 shadow-sm" : "bg-zinc-950 text-zinc-400 border-white/5"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
