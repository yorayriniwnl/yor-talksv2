import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Snowflake
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function BcsSuperconductor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tempKelvin, setTempKelvin] = useState(4.2); // 4.2 K (Liquid Helium)
  const [criticalTempTc, setCriticalTempTc] = useState(9.2); // 9.2 K (Niobium Nb)
  const [energyGapDeltaMev, setEnergyGapDeltaMev] = useState(1.4); // 1.4 meV BCS gap

  const isSuperconducting = tempKelvin < criticalTempTc;
  const animFrameRef = useRef<number | null>(null);
  const cooperPairsRef = useRef<{ x: number; y: number; vx: number; vy: number; spin: number }[]>([]);

  // BCS Theory Cooper Pair Condensation & Meissner Flux Expulsion Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Initialize Cooper Pairs / Free Electrons
    if (cooperPairsRef.current.length === 0) {
      for (let i = 0; i < 30; i++) {
        cooperPairsRef.current.push({
          x: Math.random() * (canvas.width - 120) + 60,
          y: Math.random() * (canvas.height - 120) + 60,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          spin: i % 2 === 0 ? 1 : -1,
        });
      }
    }

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Cryogenic Lattice Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Superconductor Crystal Block (Niobium / YBCO Slab in Center)
      ctx.strokeStyle = isSuperconducting ? '#06b6d4' : '#475569';
      ctx.lineWidth = 3;
      ctx.shadowColor = isSuperconducting ? '#06b6d4' : 'transparent';
      ctx.shadowBlur = isSuperconducting ? 15 : 0;
      ctx.strokeRect(80, 60, canvas.width - 160, canvas.height - 120);
      ctx.shadowBlur = 0;

      // External Magnetic Field Lines (Meissner Effect: Expelled around slab if Superconducting)
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 2;
      for (let y = 30; y <= canvas.height - 30; y += 30) {
        ctx.beginPath();
        if (isSuperconducting && y > 70 && y < canvas.height - 70) {
          // Field expelled around superconductor (Diamagnetic screening)
          ctx.moveTo(30, y);
          ctx.quadraticCurveTo(cx, y < cy ? 35 : canvas.height - 35, canvas.width - 30, y);
        } else {
          // Normal state: field penetrates completely
          ctx.moveTo(30, y);
          ctx.lineTo(canvas.width - 30, y);
        }
        ctx.stroke();
      }

      // Draw Electrons & Bound Cooper Pairs (k↑, -k↓)
      cooperPairsRef.current.forEach((e, idx) => {
        if (isSuperconducting) {
          // Bound into Coherent Cooper Pairs orbiting together
          const pairIdx = Math.floor(idx / 2);
          const pAngle = pairIdx * 0.9 + time * 1.5;
          const pcx = cx + Math.cos(pAngle) * 140;
          const pcy = cy + Math.sin(pAngle) * 80;

          const spinOffset = (idx % 2 === 0 ? 1 : -1) * 10;
          e.x = pcx + Math.cos(time * 3) * spinOffset;
          e.y = pcy + Math.sin(time * 3) * spinOffset;

          // Phonon Attraction Line between Cooper Pair Electrons
          if (idx % 2 === 0 && idx + 1 < cooperPairsRef.current.length) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(cooperPairsRef.current[idx + 1].x, cooperPairsRef.current[idx + 1].y);
            ctx.stroke();
          }
        } else {
          // Normal State: Random thermal scattering (Ohmic Resistance)
          e.x += e.vx;
          e.y += e.vy;

          if (e.x < 90 || e.x > canvas.width - 90) e.vx *= -1;
          if (e.y < 70 || e.y > canvas.height - 70) e.vy *= -1;
        }

        ctx.fillStyle = isSuperconducting ? '#38bdf8' : '#ef4444';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (isSuperconducting) {
        ctx.fillText('BCS CONDENSATION GAP Δ(T) OPEN: COOPER PAIRS CONDENSED (R = 0 Ω)', 120, cy + 130);
      } else {
        ctx.fillText('NORMAL RESISTIVE PHASE (T > Tc): COOPER PAIRS BROKEN BY THERMAL PHONONS', 80, cy + 130);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tempKelvin, criticalTempTc, isSuperconducting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Snowflake className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                SUPERCONDUCTIVITY // BCS COOPER PAIR CONDENSATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Δ(T) = 1.764 kB Tc (NOBEL 1972)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Electron-phonon attraction & Meissner magnetic flux expulsion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">STATE RESISTANCE</div>
            <div className={cn("text-xl font-bold", isSuperconducting ? "text-cyan-400" : "text-amber-400")}>
              {isSuperconducting ? '0.0000 Ω (ZERO)' : '18.42 Ω (NORMAL)'}
            </div>
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
              <span className="text-cyan-400 font-bold">TEMP: {tempKelvin} K</span>
              <span className="text-pink-400 font-bold">Tc: {criticalTempTc} K</span>
              <span className="text-amber-400 font-bold">GAP Δ: {isSuperconducting ? `${energyGapDeltaMev} meV` : '0 meV'}</span>
            </div>
            <div>STATUS: {isSuperconducting ? 'PERFECT DIAMAGNETISM (MEISSNER EFFECT)' : 'NORMAL METALLIC RESISTIVITY'}</div>
          </div>
        </div>

        {/* Superconductor Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TEMPERATURE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Lattice Temp (T):</span>
              <span className="text-cyan-400 font-bold">{tempKelvin} K</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={15.0}
              step={0.1}
              value={tempKelvin}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTempKelvin(val);
                if (val < criticalTempTc) {
                  setEnergyGapDeltaMev(+(1.764 * 0.086 * Math.sqrt(1 - val / criticalTempTc) * 10).toFixed(2));
                } else {
                  setEnergyGapDeltaMev(0);
                }
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Cooper Pairing (BCS):</strong> Even a weak attractive interaction mediated by crystal lattice phonons binds electrons into singlet pairs (k↑, -k↓) that behave as composite bosons!</div>
            <div>• <strong>Meissner Flux Expulsion:</strong> Below Tc, screening supercurrents cancel all internal magnetic fields (B = 0), enabling magnetic levitation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
