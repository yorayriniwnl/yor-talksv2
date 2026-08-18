import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Globe2, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CmbSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [baryonDensityOmegaB, setBaryonDensityOmegaB] = useState(0.048);
  const [darkEnergyOmegaLambda, setDarkEnergyOmegaLambda] = useState(0.685);
  const [hubbleConstantH0, setHubbleConstantH0] = useState(67.4);

  const animFrameRef = useRef<number | null>(null);

  // CMB Mollweide Sky Map Projection Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const rx = 300;
      const ry = 160;

      // Dark Cosmic Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Save clipping path for Mollweide Oval Sky Map
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();

      // Render Simulated CMB Fluctuations (Microkelvin temperature anisotropies dT/T ~ 10^-5)
      const colors = ['#1d4ed8', '#0284c7', '#10b981', '#eab308', '#ea580c', '#dc2626'];
      const res = 14;

      for (let x = cx - rx; x <= cx + rx; x += res) {
        for (let y = cy - ry; y <= cy + ry; y += res) {
          // Acoustic peak multi-frequency harmonic synthesis
          const val = Math.sin(x * 0.04 + time) * Math.cos(y * 0.04 + time * 0.5) 
                    + Math.sin(x * 0.08 - y * 0.06) * 0.5;
          const colorIdx = Math.max(0, Math.min(colors.length - 1, Math.floor(((val + 1.5) / 3) * colors.length)));

          ctx.fillStyle = colors[colorIdx];
          ctx.fillRect(x, y, res, res);
        }
      }

      ctx.restore();

      // Oval Boundary Line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [baryonDensityOmegaB, darkEnergyOmegaLambda]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                COSMIC MICROWAVE BACKGROUND // PLANCK 2.725K ANISOTROPY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ACOUSTIC PEAK ℓ = 220
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Photon-baryon plasma sound waves & multipole expansion C_ℓ for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Temp */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">UNIVERSE BASELINE TEMP</div>
            <div className="text-xl font-bold text-cyan-400">2.7255 <span className="text-xs">KELVIN</span></div>
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
              <span className="text-cyan-400 font-bold">H₀: {hubbleConstantH0} km/s/Mpc</span>
              <span className="text-pink-400 font-bold">DARK ENERGY (Ω_Λ): {(darkEnergyOmegaLambda * 100).toFixed(1)}%</span>
            </div>
            <div>STATUS: RECOMBINATION EPOCH z = 1100</div>
          </div>
        </div>

        {/* Cosmological Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ΛCDM PARAMETERS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Baryon Density (Ω_b):</span>
              <span className="text-cyan-400 font-bold">{baryonDensityOmegaB}</span>
            </div>
            <input
              type="range"
              min={0.02}
              max={0.08}
              step={0.005}
              value={baryonDensityOmegaB}
              onChange={(e) => setBaryonDensityOmegaB(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">ACOUSTIC PEAKS:</span>
            <div>• First peak at ℓ ≈ 220 proves spatial geometry of the universe is flat (Ω_total = 1.0).</div>
            <div>• Relic snapshot from 380,000 years after the Big Bang.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
