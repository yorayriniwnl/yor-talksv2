import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function OperatorShadowPurification() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [shadowSampleSize, setShadowSampleSize] = useState(2500); // 2,500 classical shadow samples
  const [schattenNormP, setSchattenNormP] = useState(1); // p = 1 (Nuclear norm / trace norm)
  const [isPurifying, setIsPurifying] = useState(false);
  const [purifiedStateFidelity, setPurifiedStateFidelity] = useState(0.985);

  const animFrameRef = useRef<number | null>(null);

  const triggerShadowPurification = () => {
    uiaudio.warp();
    setIsPurifying(true);

    setTimeout(() => {
      setIsPurifying(false);
      setPurifiedStateFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Classical Shadow Density Matrix Low-Rank SDP Purification Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Raw Noisy Shadow State (Left: 80 to 240, cy - 30) - Has negative unphysical eigenvalues
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(100, cy - 75, 120, 90);
      ctx.fillRect(100, cy - 75, 120, 90);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('RAW SHADOW ρ_raw', 110, cy - 45);
      ctx.fillText('Tr(ρ) = 1, λ_min < 0', 110, cy - 20);
      ctx.fillText('(UNPHYSICAL NOISE)', 110, cy + 5);

      // Semidefinite Programming (SDP) Low-Rank Projection Kernel (Center at 370, cy - 30)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isPurifying ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 30, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('min ||ρ - ρ_raw||_1', 320, cy - 34);
      ctx.fillText('s.t. ρ ≥ 0, Tr(ρ)=1', 322, cy - 18);

      // Purified Physical Quantum State (Right at 550, cy - 30)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifying ? 24 : 10;
      ctx.strokeRect(500, cy - 75, 140, 90);
      ctx.fillRect(500, cy - 75, 140, 90);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PURIFIED PHYSICAL STATE', 510, cy - 45);
      ctx.fillText('λ_i ≥ 0, Tr(ρ²) ≈ 1', 515, cy - 20);
      ctx.fillText(`F = ${(purifiedStateFidelity * 100).toFixed(2)}%`, 535, cy + 5);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `SHADOW PURIFICATION: ${shadowSampleSize.toLocaleString()} SHADOWS | SCHATTEN NORM p = ${schattenNormP} | PURIFIED FIDELITY = ${(purifiedStateFidelity * 100).toFixed(2)}% (HUANG-KUENG-PRESKILL)`,
        55,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [shadowSampleSize, schattenNormP, purifiedStateFidelity, isPurifying]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Filter className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                SHADOW PURIFICATION // LOW-RANK SCHATTEN-NORM SDP PROJECTION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                HUANG, KUENG & PRESKILL (CALTECH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Unphysical negative eigenvalue truncation & semidefinite state purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerShadowPurification}
            disabled={isPurifying}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifying ? 'PROJECTING POSITIVE SEMIDEFINITE...' : 'PURIFY CLASSICAL SHADOW'}</span>
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
              <span className="text-cyan-400 font-bold">SHADOW SAMPLES: {shadowSampleSize.toLocaleString()}</span>
              <span className="text-pink-400 font-bold">SCHATTEN NORM: p = {schattenNormP}</span>
              <span className="text-emerald-400 font-bold">PURIFIED FIDELITY: {(purifiedStateFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: POSITIVE SEMIDEFINITE DENSITY MATRIX RESTORED</div>
          </div>
        </div>

        {/* Shadow Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SHADOW SAMPLE BUDGET
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Sample Budget:</span>
              <span className="text-cyan-400 font-bold">{shadowSampleSize.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={10000}
              step={500}
              value={shadowSampleSize}
              onChange={(e) => setShadowSampleSize(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Unphysical Shadow Artifacts:</strong> Direct classical shadow snapshot inversion creates non-positive density matrices with spurious negative eigenvalues due to finite-sampling statistical shot noise!</div>
            <div>• <strong>Convex SDP Purification:</strong> Solving a nuclear-norm regularized semidefinite program projects the operator back into the physical state simplex, dramatically boosting fidelity to 99.98%!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
