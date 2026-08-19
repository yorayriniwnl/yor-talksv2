import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Sun
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PmnsOscillation() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [matterDensityGcm3, setMatterDensityGcm3] = useState(150); // 150 g/cm^3 solar core
  const [energyMev, setEnergyMev] = useState(8.5); // 8.5 MeV solar neutrino
  const [mswResonance, setMswResonance] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerMswCrossing = () => {
    uiaudio.warp();
    setMswResonance(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1100);
  };

  const handleReset = () => {
    uiaudio.click();
    setMswResonance(false);
  };

  // PMNS Neutrino Flavor Oscillation & MSW Matter Conversion Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Stellar Interior Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Solar Core Radial Gradient (High electron density on left -> vacuum on right)
      const sunGrad = ctx.createLinearGradient(60, 0, canvas.width - 60, 0);
      sunGrad.addColorStop(0, 'rgba(239, 68, 68, 0.25)'); // Dense Core
      sunGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)'); // Radiative Zone
      sunGrad.addColorStop(1, 'rgba(6, 182, 212, 0.05)'); // Vacuum Outer Space
      ctx.fillStyle = sunGrad;
      ctx.fillRect(60, 60, canvas.width - 120, 360);

      // MSW Resonance Critical Density Layer (Dotted White Vertical Line)
      const resX = 280;
      ctx.strokeStyle = mswResonance ? '#ffffff' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(resX, 60); ctx.lineTo(resX, 420);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.fillText('MSW RESONANCE DENSITY (N_e,res)', resX - 85, 50);

      // Electron Neutrino (ν_e) Flavor Probability Curve (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let x = 60; x <= canvas.width - 60; x += 4) {
        const normX = (x - 60) / (canvas.width - 120);
        // Adiabatic flavor conversion from nu_e -> nu_mu/nu_tau
        let p_e = 1.0;
        if (mswResonance) {
          if (x < resX) {
            p_e = 0.95 - (x - 60) * 0.0015;
          } else {
            p_e = 0.32 + Math.sin(x * 0.15 + time * 3) * 0.08; // Converted to mass eigenstate nu_2
          }
        } else {
          // Standard vacuum oscillation
          p_e = 0.5 + 0.45 * Math.cos(x * 0.08 - time * 2);
        }

        const py = cy + (0.5 - p_e) * 200;
        if (x === 60) ctx.moveTo(x, py); else ctx.lineTo(x, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Muon/Tau Neutrino (ν_μ / ν_τ) Flavor Probability Curve (Magenta)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 60; x <= canvas.width - 60; x += 4) {
        let p_e = 1.0;
        if (mswResonance) {
          if (x < resX) {
            p_e = 0.95 - (x - 60) * 0.0015;
          } else {
            p_e = 0.32 + Math.sin(x * 0.15 + time * 3) * 0.08;
          }
        } else {
          p_e = 0.5 + 0.45 * Math.cos(x * 0.08 - time * 2);
        }
        const p_mu = 1.0 - p_e;
        const py = cy + (0.5 - p_mu) * 200;
        if (x === 60) ctx.moveTo(x, py); else ctx.lineTo(x, py);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mswResonance, matterDensityGcm3, energyMev]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                NEUTRINO OSCILLATION // PMNS MATRIX & MSW MATTER EFFECT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                U_PMNS 3×3 LEPTON MIXING
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Mikheyev-Smirnov-Wolfenstein matter resonance & solar neutrino flavor transition for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMswCrossing}
            disabled={mswResonance}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{mswResonance ? 'MSW RESONANCE CROSSING ACTIVATED (P_ee = 0.32)' : 'PROPAGATE THROUGH SOLAR CORE'}</span>
          </button>

          {mswResonance && (
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
              <span className="text-cyan-400 font-bold">P(ν_e): {mswResonance ? '0.32' : '0.95'}</span>
              <span className="text-pink-400 font-bold">P(ν_μ,τ): {mswResonance ? '0.68' : '0.05'}</span>
              <span className="text-amber-400 font-bold">CORE DENSITY: {matterDensityGcm3} g/cm³</span>
            </div>
            <div>STATUS: {mswResonance ? 'ADIABATIC FLAVOR TRANSITION RESOLVED' : 'VACUUM MIXING REGIME'}</div>
          </div>
        </div>

        {/* Neutrino Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              NEUTRINO ENERGY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Energy (E_ν):</span>
              <span className="text-cyan-400 font-bold">{energyMev} MeV</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={15.0}
              step={0.5}
              value={energyMev}
              onChange={(e) => setEnergyMev(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Solar Neutrino Problem Solved:</strong> Ray Davis observed only 1/3 of predicted solar neutrinos. The MSW effect proved ν_e converts to undetectable ν_μ and ν_τ when traversing dense solar electrons!</div>
            <div>• <strong>Noble Prize 2015:</strong> Super-Kamiokande and SNO confirmed that neutrinos possess non-zero mass and oscillate between flavors!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
