import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SynchrotronSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [lorentzGamma, setLorentzGamma] = useState(18); // Lorentz factor Gamma = 18 (0.998c)
  const [viewAngleDeg, setViewAngleDeg] = useState(4.5); // 4.5 degrees off line of sight
  const [dopplerFactorDelta, setDopplerFactorDelta] = useState(14.2);
  const [boostedLuminosityRatio, setBoostedLuminosityRatio] = useState('4.06e4');

  const animFrameRef = useRef<number | null>(null);

  // Synchrotron Jet Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = 120;
      const cy = canvas.height / 2;

      // Dark Cosmic Spacetime
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Supermassive Black Hole Shadow Core
      ctx.fillStyle = '#000000';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Accretion Disk Edge-On
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 75, 18, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Relativistic Plasma Jet Cone (Doppler Boosted towards viewer)
      const jetGrad = ctx.createLinearGradient(cx, cy, canvas.width, cy);
      jetGrad.addColorStop(0, '#ffffff');
      jetGrad.addColorStop(0.2, '#06b6d4');
      jetGrad.addColorStop(0.6, '#a855f7');
      jetGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = jetGrad;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 8);
      ctx.lineTo(canvas.width, cy - 60);
      ctx.lineTo(canvas.width, cy + 60);
      ctx.lineTo(cx + 10, cy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Helical Synchrotron Magnetic Field Lines
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        for (let x = cx + 20; x < canvas.width; x += 10) {
          const progress = (x - cx) / (canvas.width - cx);
          const spread = 8 + progress * 50;
          const y = cy + Math.sin(x * 0.05 + time * 3 + i) * spread;
          if (x === cx + 20) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [lorentzGamma, viewAngleDeg]);

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                RELATIVISTIC JET // SYNCHROTRON BLAZAR EMISSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LORENTZ FACTOR Γ = {lorentzGamma}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Helical magnetic synchrotron beaming & Doppler amplification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Doppler Banner */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">DOPPLER BEAMING FACTOR (δ)</div>
            <div className="text-xl font-bold text-cyan-400">{dopplerFactorDelta} <span className="text-xs">× BOOST</span></div>
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
              <span className="text-cyan-400 font-bold">VIEWING ANGLE: {viewAngleDeg}°</span>
              <span className="text-purple-400 font-bold">LUMINOSITY BOOST: {boostedLuminosityRatio}×</span>
            </div>
            <div>STATUS: ULTRA-RELATIVISTIC BEAMING ACTIVE</div>
          </div>
        </div>

        {/* Relativistic Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              JET ASTROPHYSICS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Bulk Lorentz Factor (Γ):</span>
              <span className="text-cyan-400 font-bold">Γ = {lorentzGamma}</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={lorentzGamma}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLorentzGamma(val);
                setDopplerFactorDelta(+(val * 0.8).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">SYNCHROTRON BEAMING:</span>
            <div>• Relativistic electrons spiraling along magnetic field lines emit light focused into a narrow cone of angle θ ≈ 1/Γ.</div>
            <div>• Observed flux is amplified by Doppler factor δ^4, making blazars the brightest persistent sources in the universe.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
