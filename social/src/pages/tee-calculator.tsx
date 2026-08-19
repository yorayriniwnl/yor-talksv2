import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, PieChart
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TeeCalculator() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [topologicalState, setTopologicalState] = useState<'Toric_Code' | 'Fibonacci_Anyon' | 'Ising_NonAbelian'>('Toric_Code');
  const [totalQuantumDimensionD, setTotalQuantumDimensionD] = useState(2.0); // D = 2 (Toric code: 1^2 + 1^2 + 1^2 + 1^2 = 4 -> sqrt(4) = 2)
  const [topologicalEntropyGamma, setTopologicalEntropyGamma] = useState(0.693); // ln(2) = 0.6931
  const [isCalculating, setIsCalculating] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerTeeCalculation = (stateName: 'Toric_Code' | 'Fibonacci_Anyon' | 'Ising_NonAbelian') => {
    uiaudio.warp();
    setIsCalculating(true);
    setTopologicalState(stateName);

    setTimeout(() => {
      setIsCalculating(false);
      if (stateName === 'Toric_Code') {
        setTotalQuantumDimensionD(2.0);
        setTopologicalEntropyGamma(0.6931);
      } else if (stateName === 'Fibonacci_Anyon') {
        const phi = (1 + Math.sqrt(5)) / 2;
        const D = Math.sqrt(1 + phi * phi);
        setTotalQuantumDimensionD(+D.toFixed(3));
        setTopologicalEntropyGamma(+Math.log(D).toFixed(3));
      } else {
        const D = 2.0; // Ising: sqrt(1^2 + 1^2 + sqrt(2)^2) = 2.0
        setTotalQuantumDimensionD(2.0);
        setTopologicalEntropyGamma(0.6931);
      }
      uiaudio.success();
    }, 750);
  };

  // Kitaev-Preskill Geometric Tripartite Partition (A, B, C) Canvas
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
      const cy = canvas.height / 2;

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Kitaev-Preskill Tripartite Circle Sectors (A, B, C & Surrounding Environment)
      const radius = 130;

      // Region A (Top Left Sector: -5PI/6 to -PI/6) - Cyan
      ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, -Math.PI * 5 / 6, -Math.PI / 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('REGION A', cx - 40, cy - 55);

      // Region B (Bottom Right Sector: -PI/6 to PI/2) - Pink
      ctx.fillStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.strokeStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, -Math.PI / 6, Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText('REGION B', cx + 25, cy + 45);

      // Region C (Bottom Left Sector: PI/2 to 7PI/6) - Amber
      ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, Math.PI / 2, Math.PI * 7 / 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.fillText('REGION C', cx - 90, cy + 45);

      // Kitaev-Preskill Linear Combination Central Node
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = isCalculating ? 24 : 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `KITAEV-PRESKILL TEE: S_topo = S_A + S_B + S_C - S_AB - S_BC - S_AC + S_ABC = -ln(D) = -${topologicalEntropyGamma} (TOTAL DIM D = ${totalQuantumDimensionD})`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [topologicalState, totalQuantumDimensionD, topologicalEntropyGamma, isCalculating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <PieChart className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">
                TOPOLOGICAL ENTANGLEMENT ENTROPY // KITAEV-PRESKILL INVARIANT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                KITAEV & PRESKILL (CALTECH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-leading area law cancellation S_topo = -ln(D) for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">TOPOLOGICAL ENTROPY</div>
            <div className="text-xl font-bold text-emerald-400">γ = {topologicalEntropyGamma}</div>
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
              <span className="text-emerald-400 font-bold">STATE: {topologicalState}</span>
              <span className="text-cyan-400 font-bold">TOTAL DIM: D = {totalQuantumDimensionD}</span>
              <span className="text-pink-400 font-bold">γ = ln(D) = {topologicalEntropyGamma}</span>
            </div>
            <div>STATUS: BOUNDARY AREA-LAW TERMS CANCELLED EXACTLY</div>
          </div>
        </div>

        {/* TEE State Selector (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TOPOLOGICAL ORDER
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => triggerTeeCalculation('Toric_Code')}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                topologicalState === 'Toric_Code' ? "bg-emerald-500/20 border-emerald-400 text-emerald-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Z₂ Toric Code (Abelian)</div>
              <div className="text-[10px] text-zinc-400">D = 2.0, γ = ln(2) ≈ 0.693</div>
            </button>

            <button
              onClick={() => triggerTeeCalculation('Fibonacci_Anyon')}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                topologicalState === 'Fibonacci_Anyon' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Fibonacci Anyon (Non-Abelian)</div>
              <div className="text-[10px] text-zinc-400">D = 1.902, γ ≈ 0.643</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Boundary Cancellation:</strong> In 2D topological states, entanglement entropy follows S(A) = αL - γ. The Kitaev-Preskill linear combination cancels all non-universal boundary length terms αL!</div>
            <div>• <strong>Total Quantum Dimension:</strong> Leaves the universal topological constant γ = ln(D), characterizing long-range topological entanglement!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
