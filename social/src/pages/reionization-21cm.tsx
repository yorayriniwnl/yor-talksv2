import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Globe2, ShieldCheck, Sun, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Reionization21cm() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [redshiftZ, setRedshiftZ] = useState(14.2); // z = 14.2 Cosmic Dawn
  const [neutralFractionXHI, setNeutralFractionXHI] = useState(0.72); // 72% neutral hydrogen
  const [eorBubblePercolation, setEorBubblePercolation] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerBubblePercolation = () => {
    uiaudio.warp();
    setEorBubblePercolation(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1100);
  };

  const handleReset = () => {
    uiaudio.click();
    setEorBubblePercolation(false);
  };

  // 21cm Cosmic Dawn Neutral Hydrogen Tomography Canvas
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

      // Dark Primordial Cosmos Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dense Neutral Hydrogen (HI) Background Gas (Deep Indigo / Cyan Web)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.fillRect(60, 40, canvas.width - 120, 240);

      // Expanding Ionized HII Bubbles around first Pop III Stars (Black / Transparent Holes in HI)
      const bubbleCenters = [
        { x: cx - 140, y: cy - 30, r: eorBubblePercolation ? 75 : 25 },
        { x: cx + 120, y: cy - 40, r: eorBubblePercolation ? 90 : 30 },
        { x: cx, y: cy + 40, r: eorBubblePercolation ? 110 : 35 },
        { x: cx - 200, y: cy + 30, r: eorBubblePercolation ? 65 : 20 },
        { x: cx + 180, y: cy + 25, r: eorBubblePercolation ? 80 : 25 },
      ];

      bubbleCenters.forEach((b) => {
        // Pop III First Star Cluster in Center of Bubble (Golden Pinpoint)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Ionized Bubble (HII Zone - Cleared Neutral Hydrogen)
        ctx.fillStyle = '#010309';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Bottom Global 21cm Brightness Temperature Absorption Trough Delta T_b(nu)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(60, 290, canvas.width - 120, 140);

      // Absorption Trough (EDGES -500 mK trough at 78 MHz)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 60; x <= canvas.width - 60; x += 4) {
        const normFreq = 50 + ((x - 60) / (canvas.width - 120)) * 150; // 50 to 200 MHz
        // Gaussian absorption trough centered at 78 MHz (z = 17)
        const dF = normFreq - 78;
        const deltaTb = -220 * Math.exp(-(dF * dF) / 350.0);

        const plotY = 350 - deltaTb * 0.35;
        if (x === 60) ctx.moveTo(x, plotY); else ctx.lineTo(x, plotY);
      }
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('COSMIC DAWN 21cm ABSORPTION TROUGH (78 MHz / z ~ 17)', cx - 130, 310);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [eorBubblePercolation, redshiftZ]);

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
                COSMIC DAWN 21CM // EPOCH OF REIONIZATION (EoR) TOMOGRAPHY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                1420 MHZ HYPERFINE TRANSITION (SKA/HERA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Pop III star formation, Lyman-alpha spin coupling & ionization bubble percolation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerBubblePercolation}
            disabled={eorBubblePercolation}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{eorBubblePercolation ? 'IONIZED HII BUBBLES PERCOLATED (REIONIZATION COMPLETE)' : 'TRIGGER POP III STAR FORMATION'}</span>
          </button>

          {eorBubblePercolation && (
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
              <span className="text-cyan-400 font-bold">REDSHIFT: z = {redshiftZ}</span>
              <span className="text-pink-400 font-bold">NEUTRAL GAS: {eorBubblePercolation ? '0%' : (neutralFractionXHI * 100).toFixed(0) + '%'}</span>
            </div>
            <div>STATUS: {eorBubblePercolation ? 'COSMIC REIONIZATION COMPLETED (z ~ 6)' : 'NEUTRAL HYDROGEN WEB MAPPED'}</div>
          </div>
        </div>

        {/* EoR Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              COSMIC REDSHIFT
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Redshift (z):</span>
              <span className="text-cyan-400 font-bold">z = {redshiftZ}</span>
            </div>
            <input
              type="range"
              min={6.0}
              max={25.0}
              step={0.5}
              value={redshiftZ}
              onChange={(e) => setRedshiftZ(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hyperfine 21cm Line:</strong> The spin-flip transition of neutral hydrogen (1420 MHz) redshifts into low-frequency radio (50–200 MHz), revealing the birth of the very first stars!</div>
            <div>• <strong>Wouthuysen-Field Effect:</strong> Resonant scattering of Lyα photons couples the spin temperature to gas temperature, creating a deep absorption signature against the CMB!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
