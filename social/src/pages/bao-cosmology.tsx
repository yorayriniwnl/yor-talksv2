import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Orbit, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Globe2, Radio, ShieldCheck, Sun, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function BaoCosmology() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [soundHorizonMpc, setSoundHorizonMpc] = useState(147.5); // 147.5 Mpc standard cosmological ruler (Planck/DESI)
  const [baryonDensityOmegaB, setBaryonDensityOmegaB] = useState(0.049); // 4.9% baryonic matter
  const [baoRulerLocked, setBaoRulerLocked] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerBaoLock = () => {
    uiaudio.warp();
    setBaoRulerLocked(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1100);
  };

  const handleReset = () => {
    uiaudio.click();
    setBaoRulerLocked(false);
  };

  // Primordial Plasma Sound Wave & BAO Galaxy Correlation Canvas
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

      // Dark Cosmic Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Central Dark Matter Overdensity (Cold Gravitational Well in Indigo)
      ctx.fillStyle = '#6366f1';
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Expanding Primordial Photon-Baryon Acoustic Sound Shell (Radius ~ 120)
      const shellR = 110 + (soundHorizonMpc - 140) * 3;

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = baoRulerLocked ? 20 : 8;
      ctx.beginPath();
      ctx.arc(cx, cy, shellR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Galaxies Clustered along BAO Sound Horizon Ring (DESI / SDSS Galaxy Points in Gold)
      for (let i = 0; i < 28; i++) {
        const angle = (i * Math.PI * 2) / 28 + Math.sin(i * 3 + time) * 0.08;
        const dist = shellR + (Math.sin(i * 7) * 8);
        const gx = cx + Math.cos(angle) * dist;
        const gy = cy + Math.sin(angle) * dist;

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(gx, gy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distance Ruler Dimension Line (Standard Cosmological Ruler: 147.5 Mpc)
      if (baoRulerLocked) {
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(cx + shellR, cy);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`r_s = ${soundHorizonMpc} Mpc (DARK ENERGY RULER)`, cx + 15, cy - 8);
      }

      // Bottom 2-Point Galaxy Correlation Function Graph xi(r) (y: 290 to 440)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(60, 290, canvas.width - 120, 140);

      // Correlation Function Curve with Characteristic BAO Bump at 147.5 Mpc
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 60; x <= canvas.width - 60; x += 4) {
        const normR = 50 + ((x - 60) / (canvas.width - 120)) * 150; // 50 to 200 Mpc
        // Power law baseline
        let xi = 80.0 / Math.pow(normR / 50, 1.6);
        // BAO Gaussian Bump at soundHorizonMpc
        const dR = normR - soundHorizonMpc;
        xi += 22.0 * Math.exp(-(dR * dR) / 90.0);

        const plotY = 410 - Math.min(110, xi * 1.1);
        if (x === 60) ctx.moveTo(x, plotY); else ctx.lineTo(x, plotY);
      }
      ctx.stroke();

      if (baoRulerLocked) {
        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('BAO ACOUSTIC PEAK BUMP (147.5 Mpc)', canvas.width / 2 - 40, 310);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [baoRulerLocked, soundHorizonMpc]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Globe2 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                BARYON ACOUSTIC OSCILLATIONS // BAO COSMOLOGICAL STANDARD RULER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                147.5 MPC SOUND HORIZON (DESI/SDSS)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Primordial sound horizon decoupling & dark energy cosmic expansion mapping for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerBaoLock}
            disabled={baoRulerLocked}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{baoRulerLocked ? 'BAO SOUND HORIZON RULER LOCKED (147.5 MPC)' : 'MEASURE 2-POINT GALAXY CORRELATION'}</span>
          </button>

          {baoRulerLocked && (
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
              <span className="text-cyan-400 font-bold">SOUND HORIZON: {soundHorizonMpc} Mpc</span>
              <span className="text-amber-400 font-bold">Ω_b: {(baryonDensityOmegaB * 100).toFixed(1)}%</span>
            </div>
            <div>STATUS: {baoRulerLocked ? 'DARK ENERGY EXPANSION HISTORY CALIBRATED' : 'ACOUSTIC PLASMA SHELL EXPANSION'}</div>
          </div>
        </div>

        {/* Cosmology Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SOUND HORIZON (r_s)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Sound Horizon Scale:</span>
              <span className="text-cyan-400 font-bold">{soundHorizonMpc} Mpc</span>
            </div>
            <input
              type="range"
              min={135.0}
              max={160.0}
              step={0.5}
              value={soundHorizonMpc}
              onChange={(e) => setSoundHorizonMpc(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Frozen Relic Waves:</strong> Before recombination (z ~ 1060), sound waves travelled through the plasma at c/√3. When the universe neutralized, the sound waves froze into 147.5 Mpc spherical shells of matter!</div>
            <div>• <strong>Dark Energy Standard Ruler:</strong> Measuring this fixed shell size across redshift slices allows DESI and Euclid to track how dark energy accelerated the universe!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
