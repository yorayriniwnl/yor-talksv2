import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Orbit, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Globe2, Radio, ShieldCheck, Sun
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ExomoonSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [moonMassRatio, setMoonMassRatio] = useState(0.015); // 1.5% mass ratio (Earth-Moon or Jupiter-Io)
  const [moonSeparationR, setMoonSeparationR] = useState(4.2); // 4.2 planetary radii
  const [exomoonDetected, setExomoonDetected] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerDetectionScan = () => {
    uiaudio.warp();
    setExomoonDetected(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1100);
  };

  const handleReset = () => {
    uiaudio.click();
    setExomoonDetected(false);
  };

  // Exomoon Microlensing Caustic & Light Curve Canvas
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
      const cy = canvas.height / 2 - 40;

      // Dark Galactic Center Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background Star Field
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 37) % canvas.width;
        const sy = (i * 53) % 240;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Host Planet (Large Cyan Sphere)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx - 30, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Orbiting Exomoon (Small Amber Sphere)
      const moonX = cx - 30 + Math.cos(time * 2) * (moonSeparationR * 12);
      const moonY = cy + Math.sin(time * 2) * (moonSeparationR * 12);

      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Caustic Curves (Closed Relativistic Diamond Shapes in Magenta)
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 60, cy - 35, 70, 70);
      if (exomoonDetected) {
        ctx.strokeStyle = '#ec4899';
        ctx.strokeRect(moonX - 10, moonY - 10, 20, 20);
      }

      // Bottom Photometric Light Curve Graph (y: 280 to 440)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(60, 290, canvas.width - 120, 140);

      // Baseline Light Curve
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 60; x <= canvas.width - 60; x += 4) {
        const relX = (x - (canvas.width / 2)) / 80;
        // Paczynski Main Peak
        let mag = 1.0 / Math.sqrt(relX * relX + 0.05);

        // Exomoon Secondary Spike
        if (exomoonDetected && Math.abs(relX - 0.7) < 0.2) {
          mag += 4.5 * (moonMassRatio / 0.015);
        }

        const plotY = 410 - Math.min(100, mag * 22);
        if (x === 60) ctx.moveTo(x, plotY);
        else ctx.lineTo(x, plotY);
      }
      ctx.stroke();

      if (exomoonDetected) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('EXOMOON SECONDARY CAUSTIC SPIKE', canvas.width / 2 + 30, 310);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [exomoonDetected, moonMassRatio, moonSeparationR]);

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
                EXOMOON MICROLENSING // CAUSTIC CROSSING & TTV
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SUB-PERCENT MASS RATIO q_moon
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Planetary satellite caustic perturbation & transit timing variations for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerDetectionScan}
            disabled={exomoonDetected}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{exomoonDetected ? 'EXOMOON CAUSTIC PERTURBATION CONFIRMED' : 'SEARCH EXOMOON SIGNATURE'}</span>
          </button>

          {exomoonDetected && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
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
              <span className="text-amber-400 font-bold">MASS RATIO: {(moonMassRatio * 100).toFixed(1)}%</span>
              <span className="text-cyan-400 font-bold">ORBIT: {moonSeparationR} R_p</span>
            </div>
            <div>STATUS: {exomoonDetected ? 'SECONDARY CAUSTIC TRANSIT DETECTED' : 'MONITORING PACZYNSKI MAGNIFICATION'}</div>
          </div>
        </div>

        {/* Orbit Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              EXOMOON SYSTEM
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Moon Mass Ratio (q_m):</span>
              <span className="text-amber-400 font-bold">{(moonMassRatio * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={0.005}
              max={0.05}
              step={0.005}
              value={moonMassRatio}
              onChange={(e) => setMoonMassRatio(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Extreme Sensitivity:</strong> Gravitational microlensing is the only astrophysical method capable of detecting Earth-mass and Mars-mass exomoons around distant exoplanets thousands of parsecs away.</div>
            <div>• <strong>Binary Caustics:</strong> When the source star crosses the secondary caustic created by the moon's gravity, it causes an unmistakable brief spike in the light curve!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
