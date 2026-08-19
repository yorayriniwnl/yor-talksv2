import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function VirtualSubspace() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [schmidtRankK, setSchmidtRankK] = useState(2); // Operator-Schmidt rank k = 2
  const [hardwareDecoherenceRate, setHardwareDecoherenceRate] = useState(0.12); // 12% decoherence
  const [isProjecting, setIsProjecting] = useState(false);
  const [mitigatedStateFidelity, setMitigatedStateFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerVirtualSubspaceInversion = () => {
    uiaudio.warp();
    setIsProjecting(true);

    setTimeout(() => {
      setIsProjecting(false);
      setMitigatedStateFidelity(0.998);
      uiaudio.success();
    }, 750);
  };

  // Virtual Subspace Projection & Schmidt Inversion Canvas
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

      // Unmitigated Noisy Density Matrix Blob (Left at 160, cy)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(160, cy, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('NOISY STATE ρ', 120, cy - 65);
      ctx.fillText(`F = ${((1 - hardwareDecoherenceRate) * 100).toFixed(1)}%`, 130, cy + 5);

      // Central Operator-Schmidt Virtual Projector Block (280 to 420)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isProjecting ? 20 : 6;
      ctx.strokeRect(280, cy - 60, 140, 120);
      ctx.fillRect(280, cy - 60, 140, 120);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('SCHMIDT INVERSION', 290, cy - 25);
      ctx.fillText(`RANK k = ${schmidtRankK}`, 320, cy);
      ctx.fillText('Π_V ρ Π_V', 320, cy + 25);

      // Connecting Inversion Channels
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(215, cy); ctx.lineTo(280, cy);
      ctx.stroke();

      // Mitigated Purified Subspace State (Right at 540, cy)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(540, cy, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.fillText('PURIFIED ρ_mit', 500, cy - 55);
      ctx.fillText(`F = ${(mitigatedStateFidelity * 100).toFixed(1)}%`, 505, cy + 5);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `VIRTUAL SUBSPACE INVERSION: OPERATOR-SCHMIDT RANK k = ${schmidtRankK} | PURIFIED FIDELITY = ${(mitigatedStateFidelity * 100).toFixed(1)}%`,
        70,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [schmidtRankK, hardwareDecoherenceRate, mitigatedStateFidelity, isProjecting]);

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
                VIRTUAL SUBSPACE // OPERATOR-SCHMIDT INVERSION QEM
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CAI & BENJAMIN (OXFORD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Operator-Schmidt decomposition & non-physical subspace leakage elimination for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerVirtualSubspaceInversion}
            disabled={isProjecting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isProjecting ? 'PROJECTING SCHMIDT SUBSPACE...' : 'PROJECT VIRTUAL SUBSPACE'}</span>
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
              <span className="text-cyan-400 font-bold">SCHMIDT RANK: k = {schmidtRankK}</span>
              <span className="text-pink-400 font-bold">RAW NOISY: {((1 - hardwareDecoherenceRate) * 100).toFixed(1)}%</span>
              <span className="text-emerald-400 font-bold">PURIFIED: {(mitigatedStateFidelity * 100).toFixed(1)}%</span>
            </div>
            <div>STATUS: ZERO ANCILLA OVERHEAD REQUIRED</div>
          </div>
        </div>

        {/* Virtual Subspace Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              OPERATOR RANK
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Schmidt Cutoff Rank (k):</span>
              <span className="text-cyan-400 font-bold">k = {schmidtRankK}</span>
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={schmidtRankK}
              onChange={(e) => setSchmidtRankK(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Virtual Subspace Manifold:</strong> Decomposes unmitigated density operators into dominant Schmidt modes, discarding unphysical incoherent error branches!</div>
            <div>• <strong>Noise-Free Metric:</strong> Restores state purity without requiring extra physical qubits or complex syndrome measurements!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
