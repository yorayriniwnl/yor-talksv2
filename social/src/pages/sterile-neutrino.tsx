import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SterileNeutrino() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [deltaM41SqEv2, setDeltaM41SqEv2] = useState(1.2); // 1.2 eV^2 sterile mass squared splitting
  const [mixingAngleSinSq2Theta, setMixingAngleSinSq2Theta] = useState(0.045); // sin^2(2theta_mu_s)
  const [shortBaselineActive, setShortBaselineActive] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerSterileDisappearance = () => {
    uiaudio.warp();
    setShortBaselineActive(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1100);
  };

  const handleReset = () => {
    uiaudio.click();
    setShortBaselineActive(false);
  };

  // 3+1 Sterile Neutrino Short-Baseline Disappearance Canvas
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

      // Dark Neutrino Detector Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // MiniBooNE / MicroBooNE Liquid Argon Detector Tank (Right 540-660)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(540, cy - 80, 140, 160);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('LArTPC DETECTOR (540m)', 545, cy - 90);

      // Booster Neutrino Beam Source at Left (40, cy)
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(60, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('BNB SOURCE', 30, cy + 30);

      // Neutrino Beam Trajectory with Fast Short-Baseline eV-scale Oscillations
      // P(nu_mu -> nu_s) = sin^2(2theta) * sin^2(1.27 * Delta m^2 * L / E)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = shortBaselineActive ? 15 : 6;
      ctx.beginPath();

      for (let x = 60; x <= 540; x += 3) {
        const normL = (x - 60) * 1.1; // Baseline in meters
        const oscPhase = 1.27 * deltaM41SqEv2 * (normL / 800.0) * Math.PI;
        const p_sterile = shortBaselineActive ? mixingAngleSinSq2Theta * Math.pow(Math.sin(oscPhase + time * 3), 2) : 0;

        const wy = cy + (p_sterile * 1200) * Math.sin(x * 0.1);
        if (x === 60) ctx.moveTo(x, wy); else ctx.lineTo(x, wy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Invisible Sterile States Disappearing into Bulk Space (Ghostly Dashed Cyan Lines)
      if (shortBaselineActive) {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        for (let i = 0; i < 4; i++) {
          const sx = 140 + i * 90;
          ctx.beginPath();
          ctx.moveTo(sx, cy); ctx.lineTo(sx + 40, cy - 80);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('ACTIVE ν_μ → STERILE ν_s DISAPPEARANCE (Δm² ~ 1 eV²)', 120, 60);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [shortBaselineActive, deltaM41SqEv2, mixingAngleSinSq2Theta]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                STERILE NEUTRINO // 3+1 SHORT-BASELINE OSCILLATION (MICROBOONE)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Δm²₄₁ ~ 1.2 eV² (LSND/MiniBooNE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Right-handed gauge singlet neutrino mixing & keV dark matter candidate exploration for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerSterileDisappearance}
            disabled={shortBaselineActive}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{shortBaselineActive ? 'STERILE NEUTRINO EV DISAPPEARANCE ACTIVE' : 'TEST 3+1 STERILE MIXING'}</span>
          </button>

          {shortBaselineActive && (
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
              <span className="text-purple-400 font-bold">Δm²₄₁: {deltaM41SqEv2} eV²</span>
              <span className="text-pink-400 font-bold">sin²(2θ): {mixingAngleSinSq2Theta}</span>
            </div>
            <div>STATUS: {shortBaselineActive ? 'SHORT-BASELINE ANOMALOUS OSCILLATION MAPPED' : 'STANDARD 3-FLAVOR REGIME'}</div>
          </div>
        </div>

        {/* Sterile Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              STERILE MASS SPLITTING
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Δm²₄₁:</span>
              <span className="text-purple-400 font-bold">{deltaM41SqEv2} eV²</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.1}
              value={deltaM41SqEv2}
              onChange={(e) => setDeltaM41SqEv2(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Beyond Standard Model:</strong> Sterile neutrinos have no weak interactions (gauge singlets) and only mix gravitationally and quantum-mechanically with active neutrinos!</div>
            <div>• <strong>Warm Dark Matter:</strong> keV-scale sterile neutrinos produced in the early universe are leading candidates to explain galactic dark matter halos!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
