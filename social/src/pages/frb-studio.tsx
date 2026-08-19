import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Sun, ShieldCheck, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FrbStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dispersionMeasureDm, setDispersionMeasureDm] = useState(540); // 540 pc/cm^3
  const [pulseWidthMs, setPulseWidthMs] = useState(1.8); // 1.8 ms duration
  const [peakFluxJy, setPeakFluxJy] = useState(12.4); // 12.4 Jansky
  const [burstFired, setBurstFired] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const sweepProgress = useRef(0);

  const triggerFastRadioBurst = () => {
    uiaudio.warp();
    setBurstFired(true);
    sweepProgress.current = 0;

    const interval = setInterval(() => {
      sweepProgress.current += 0.05;
      if (sweepProgress.current >= 1.0) {
        clearInterval(interval);
        uiaudio.success();
        setTimeout(() => {
          setBurstFired(false);
          sweepProgress.current = 0;
        }, 1000);
      }
    }, 30);
  };

  // FRB Dynamic Dynamic Spectrum (Waterfall Frequency vs Time) Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Spectrograph Matrix Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Radio Spectrograph Grid (CHIME / ASKAP Waterfall Plot)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      // Frequency Grid Lines (400 MHz to 800 MHz)
      for (let y = 60; y <= 420; y += 40) {
        ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(canvas.width - 60, y); ctx.stroke();
      }
      // Time Grid Lines (0 ms to 500 ms)
      for (let x = 60; x <= canvas.width - 60; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 420); ctx.stroke();
      }

      // Axis Labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('800 MHz (HIGH FREQ)', 60, 50);
      ctx.fillText('400 MHz (LOW FREQ)', 60, 440);
      ctx.fillText('TIME DELAY (Δt ∝ DM · ν⁻²)', canvas.width / 2 - 80, 460);

      // Dispersion Measure Sweep Curve (Quadratic Chirp Waterfall)
      if (burstFired) {
        const curT = sweepProgress.current;

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        const startX = 100;
        const maxSweepX = 540;

        for (let y = 60; y <= 420; y += 4) {
          // Cold Plasma Dispersion Law: t(nu) = 4.15e3 * DM * nu^-2
          const normFreq = 1.0 - (y - 60) / 360; // 1.0 at 800MHz, 0.0 at 400MHz
          const delayX = startX + Math.pow(1.0 - normFreq, 2) * (dispersionMeasureDm * 0.7);

          if (delayX <= startX + curT * maxSweepX) {
            if (y === 60) ctx.moveTo(delayX, y);
            else ctx.lineTo(delayX, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Current sweeping bright pulse head
        const headY = 60 + curT * 360;
        const normFreq = 1.0 - (headY - 60) / 360;
        const headX = startX + Math.pow(1.0 - normFreq, 2) * (dispersionMeasureDm * 0.7);

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(headX, headY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [burstFired, dispersionMeasureDm]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-400">
                FAST RADIO BURST // MAGNETAR CRUST QUAKE & DISPERSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                CHIME 400-800 MHz SPECTROGRAPH
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Coherent curvature synchrotron radio burst & intergalactic plasma dispersion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFastRadioBurst}
            disabled={burstFired}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{burstFired ? 'INTERGALACTIC PLASMA SWEEPING (ν⁻²)...' : 'DETECT EXTRAGALACTIC FRB'}</span>
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
            height={480}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-pink-400 font-bold">DISPERSION: {dispersionMeasureDm} pc/cm³</span>
              <span className="text-cyan-400 font-bold">PULSE: {pulseWidthMs} ms</span>
              <span className="text-amber-400 font-bold">FLUX: {peakFluxJy} Jy</span>
            </div>
            <div>STATUS: {burstFired ? 'COHERENT DISPERSED WATERFALL LOGGED' : 'ANTENNA ARRAY MONITORING'}</div>
          </div>
        </div>

        {/* FRB Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PLASMA DISPERSION
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Dispersion Measure (DM):</span>
              <span className="text-pink-400 font-bold">{dispersionMeasureDm} pc/cm³</span>
            </div>
            <input
              type="range"
              min={100}
              max={1200}
              step={20}
              value={dispersionMeasureDm}
              onChange={(e) => setDispersionMeasureDm(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Magnetar Origin:</strong> Magnetic stresses rupture the crust of a 10¹⁵ Gauss magnetar, unleashing 10³⁸ ergs of coherent radio waves in a millisecond.</div>
            <div>• <strong>Cosmological Weighing:</strong> The frequency-dependent delay (DM) precisely measures all free electrons along billions of light-years, weighing the "missing baryon" matter of the universe!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
