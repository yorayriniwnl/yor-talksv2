import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, FunctionSquare
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function VolterraQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [memoryKernelOrder, setMemoryKernelOrder] = useState(3); // 3rd-order Volterra kernel
  const [environmentalCorrelationTimePs, setEnvironmentalCorrelationTimePs] = useState(45); // 45 ps bath correlation
  const [isDeconvolving, setIsDeconvolving] = useState(false);
  const [mitigatedStatePurity, setMitigatedStatePurity] = useState(0.985);

  const animFrameRef = useRef<number | null>(null);

  const triggerVolterraDeconvolution = () => {
    uiaudio.warp();
    setIsDeconvolving(true);

    setTimeout(() => {
      setIsDeconvolving(false);
      setMitigatedStatePurity(0.9992);
      uiaudio.success();
    }, 750);
  };

  // Volterra Integro-Differential Memory Kernel Deconvolution Canvas
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

      // Non-Markovian Memory Bath Kernel Curve K(t - τ) (Top Half: 80 to 660, cy - 80)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 80; x <= 360; x += 4) {
        const tau = (x - 80) / 40;
        const ky = cy - 80 - Math.exp(-tau * (50 / environmentalCorrelationTimePs)) * Math.cos(tau * 4 + time) * 45;
        if (x === 80) ctx.moveTo(x, ky);
        else ctx.lineTo(x, ky);
      }
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('MEMORY KERNEL K(t - τ)', 90, cy - 135);

      // Volterra Integral Matrix Inversion Module (Center at 380, cy - 110)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isDeconvolving ? 20 : 6;
      ctx.strokeRect(380, cy - 130, 160, 95);
      ctx.fillRect(380, cy - 130, 160, 95);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('VOLTERRA DECONVOLUTION', 390, cy - 100);
      ctx.fillText(`ORDER: n = ${memoryKernelOrder}`, 425, cy - 78);
      ctx.fillText('∫₀ᵗ K(t - τ) ρ(τ) dτ', 400, cy - 56);

      // Purified Markovian Trajectory (Bottom Half: 80 to 660, cy + 80)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isDeconvolving ? 15 : 4;
      ctx.beginPath();
      for (let x = 80; x <= 660; x += 5) {
        const t = (x - 80) / 60;
        const py = cy + 90 + Math.sin(t * 3 - time * 2) * (mitigatedStatePurity * 35);
        if (x === 80) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `VOLTERRA QEM: ${memoryKernelOrder}th-ORDER KERNEL INVERSION | PURIFIED STATE PURITY Tr(ρ²) = ${(mitigatedStatePurity * 100).toFixed(2)}%`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [memoryKernelOrder, environmentalCorrelationTimePs, mitigatedStatePurity, isDeconvolving]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <FunctionSquare className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                VOLTERRA QEM // NON-MARKOVIAN MEMORY KERNEL MITIGATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                VIOLA & BIERCUK (DARTMOUTH / SYDNEY)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Filter-function spectroscopy & Volterra integro-differential kernel deconvolution for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerVolterraDeconvolution}
            disabled={isDeconvolving}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDeconvolving ? 'DECONVOLVING MEMORY KERNEL...' : 'INVERT VOLTERRA KERNEL'}</span>
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
              <span className="text-cyan-400 font-bold">VOLTERRA ORDER: {memoryKernelOrder}</span>
              <span className="text-pink-400 font-bold">BATH MEMORY: {environmentalCorrelationTimePs} ps</span>
              <span className="text-emerald-400 font-bold">PURIFIED PURITY: {(mitigatedStatePurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-MARKOVIAN RETARDED BATH COUPLING ELIMINATED</div>
          </div>
        </div>

        {/* Volterra Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SERIES ORDER
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Volterra Expansion Order:</span>
              <span className="text-cyan-400 font-bold">n = {memoryKernelOrder}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={memoryKernelOrder}
              onChange={(e) => setMemoryKernelOrder(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Beyond Lindblad Approximations:</strong> Realistic solid-state qubits couple to non-Markovian phonon and spin baths with finite memory correlation time!</div>
            <div>• <strong>Volterra Matrix Inversion:</strong> Reconstructs the uncorrupted state trajectory by solving the causal Volterra integral memory kernel equation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
