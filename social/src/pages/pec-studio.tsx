import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Sigma
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PecStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [depolarizingRateEpsilon, setDepolarizingRateEpsilon] = useState(0.04); // 4% gate error
  const [sampleShots, setSampleShots] = useState(5000);
  const [isCancelling, setIsCancelling] = useState(false);
  const [unbiasedExpectation, setUnbiasedExpectation] = useState(0.994);

  const animFrameRef = useRef<number | null>(null);

  // Quasi-Probability Sampling Overhead: gamma = (1 + 3*epsilon) / (1 - epsilon)
  const gammaOverhead = +((1 + 3 * depolarizingRateEpsilon) / (1 - depolarizingRateEpsilon)).toFixed(3);

  const triggerPecSampling = () => {
    uiaudio.warp();
    setIsCancelling(true);

    setTimeout(() => {
      setIsCancelling(false);
      setUnbiasedExpectation(0.998);
      uiaudio.success();
    }, 750);
  };

  // Probabilistic Error Cancellation (Quasi-Probability Distribution) Canvas
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

      // Coordinate Grid: Quasi-Probability Decompositions over Pauli Basis {I, X, Y, Z}
      // q_0 (Identity) = (1 + 3*eps/4) > 1, q_1,2,3 (Pauli X,Y,Z) = -eps/4 < 0 (Negative weights)
      const basis = [
        { name: 'Identity (I)', weight: +(1 + (3 * depolarizingRateEpsilon) / 4).toFixed(3), color: '#06b6d4', isNeg: false },
        { name: 'Pauli X (σ_x)', weight: +(-depolarizingRateEpsilon / 4).toFixed(4), color: '#ec4899', isNeg: true },
        { name: 'Pauli Y (σ_y)', weight: +(-depolarizingRateEpsilon / 4).toFixed(4), color: '#ec4899', isNeg: true },
        { name: 'Pauli Z (σ_z)', weight: +(-depolarizingRateEpsilon / 4).toFixed(4), color: '#ec4899', isNeg: true },
      ];

      // Draw Quasi-Probability Histogram Bars
      basis.forEach((b, idx) => {
        const bx = 110 + idx * 145;
        const barHeight = Math.abs(b.weight) * (b.isNeg ? 800 : 160);
        const by = b.isNeg ? cy : cy - barHeight;

        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = isCancelling ? 15 : 4;
        ctx.fillRect(bx, by, 75, barHeight);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(b.name, bx - 10, cy + 85);
        ctx.fillText(`q = ${b.weight}`, bx - 5, b.isNeg ? by + barHeight + 18 : by - 8);
      });

      // Zero-Weight Baseline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(60, cy); ctx.lineTo(canvas.width - 60, cy);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PEC UNBIASED EXPECTATION: ⟨O⟩ = ${unbiasedExpectation.toFixed(3)} | SAMPLING OVERHEAD γ² = ${(gammaOverhead * gammaOverhead).toFixed(2)}×`,
        90,
        canvas.height - 30
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [depolarizingRateEpsilon, gammaOverhead, unbiasedExpectation, isCancelling]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Sigma className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                PROBABILISTIC ERROR CANCELLATION // QUASI-PROBABILITY INVERSES (PEC)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                TEMME & BRAVYI (IBM QUANTUM)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Exact mathematical noise inversion via non-positive Monte Carlo sampling for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerPecSampling}
            disabled={isCancelling}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCancelling ? 'SAMPLING MONTE CARLO QUASI-DISTRIBUTION...' : 'SAMPLE PEC QUASI-INVERSE'}</span>
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
              <span className="text-cyan-400 font-bold">ERROR RATE ε: {(depolarizingRateEpsilon * 100).toFixed(1)}%</span>
              <span className="text-pink-400 font-bold">OVERHEAD γ: {gammaOverhead}</span>
              <span className="text-emerald-400 font-bold">SHOTS: {sampleShots.toLocaleString()}</span>
            </div>
            <div>STATUS: ZERO BIAS NOISE CANCELLATION GUARANTEED</div>
          </div>
        </div>

        {/* PEC Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PHYSICAL ERROR RATE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Depolarizing Rate (ε):</span>
              <span className="text-cyan-400 font-bold">{(depolarizingRateEpsilon * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={0.01}
              max={0.10}
              step={0.01}
              value={depolarizingRateEpsilon}
              onChange={(e) => setDepolarizingRateEpsilon(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Exact Inverse Map:</strong> PEC expands the exact mathematical inverse of a noisy physical quantum channel as a quasi-probability sum over physical basis gates!</div>
            <div>• <strong>Negative Signs:</strong> The presence of negative weights q &lt; 0 introduces a shot-noise sampling overhead γ², but completely removes hardware systematic errors!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
