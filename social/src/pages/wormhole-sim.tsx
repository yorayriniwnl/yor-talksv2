import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, Play, Pause, RotateCcw, 
  Orbit, Eye, Sliders, ShieldCheck, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function WormholeSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [throatRadiusKm, setThroatRadiusKm] = useState(140);
  const [exoticEnergyDensity, setExoticEnergyDensity] = useState(-85.4); // Negative energy density
  const [traversalSpeedC, setTraversalSpeedC] = useState(0.85); // % speed of light
  const [isStable, setIsStable] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  // Morris-Thorne Wormhole Visualizer
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

      // Deep Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield Gravitational Distortion Lensing Rings
      for (let r = 240; r >= 50; r -= 15) {
        const distort = Math.sin(time + r * 0.05) * 8;
        const grad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r + distort);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.15)');
        grad.addColorStop(1, 'rgba(236, 72, 153, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r + distort, 0, Math.PI * 2);
        ctx.fill();
      }

      // Einstein-Rosen Throat Center (Portal Horizon to Alternate Galaxy)
      const throatGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 70);
      throatGrad.addColorStop(0, '#ffffff');
      throatGrad.addColorStop(0.3, '#06b6d4');
      throatGrad.addColorStop(0.7, '#8b5cf6');
      throatGrad.addColorStop(1, '#000000');

      ctx.fillStyle = throatGrad;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(cx, cy, 65, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Exotic Matter Ring Stabilization Jets
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 8; i++) {
        const angle = i * (Math.PI / 4) + time * 0.8;
        const x1 = cx + Math.cos(angle) * 75;
        const y1 = cy + Math.sin(angle) * 75;
        const x2 = cx + Math.cos(angle) * 140;
        const y2 = cy + Math.sin(angle) * 140;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [throatRadiusKm, exoticEnergyDensity]);

  const handleTraverse = () => {
    uiaudio.warp();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Orbit className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-300 to-pink-400">
                WORMHOLE // TRAVERSABLE MORRIS-THORNE BRIDGE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                EXOTIC MATTER STABILIZED
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Einstein-Rosen metric curvature & spacetime throat traversal for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={handleTraverse}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>ENTER SPACETIME THROAT</span>
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
              <span className="text-purple-400 font-bold">THROAT RADIUS: {throatRadiusKm} KM</span>
              <span className="text-cyan-400 font-bold">EXOTIC ENERGY: {exoticEnergyDensity} J/m³</span>
            </div>
            <div>STATUS: CAUCHY HORIZON STABLE</div>
          </div>
        </div>

        {/* Metric Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              METRIC TENSOR CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Throat Radius (r₀):</span>
              <span className="text-purple-400 font-bold">{throatRadiusKm} km</span>
            </div>
            <input
              type="range"
              min={50}
              max={500}
              value={throatRadiusKm}
              onChange={(e) => setThroatRadiusKm(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">GENERAL RELATIVITY:</span>
            <div>• ds² = -e^(2Φ(r)) c² dt² + dr² / (1 - b(r)/r) + r² dΩ²</div>
            <div>• Requires negative energy density (Casimir effect) to keep throat open against gravitational collapse.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
