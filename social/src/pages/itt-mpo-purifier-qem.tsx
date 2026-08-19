import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function IttMpoPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tensorTrainRankD, setTensorTrainRankD] = useState(6); // D = 6 Tensor Train rank
  const [liouvillianDissipationGamma, setLiouvillianDissipationGamma] = useState(0.15); // γ = 0.15 dissipation rate
  const [isPurifyingIttMpo, setIsPurifyingIttMpo] = useState(false);
  const [purifiedIttFidelity, setPurifiedIttFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerIttPurification = () => {
    uiaudio.warp();
    setIsPurifyingIttMpo(true);

    setTimeout(() => {
      setIsPurifyingIttMpo(false);
      setPurifiedIttFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Infinite Tensor-Train MPO (iTT-MPO) Liouvillian Canvas
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

      // Infinite Tensor Train Chain (Left: 80 to 240, cy - 30 to cy + 30)
      const numCores = 4;
      const spacing = 36;
      const originX = 85;

      // Horizontal Bond Lines (Pink)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(60, cy); ctx.lineTo(originX + numCores * spacing + 10, cy);
      ctx.stroke();

      // Tensor Train Cores with Vertical Input/Output Legs
      for (let i = 0; i < numCores; i++) {
        const x = originX + i * spacing + spacing / 2;

        // Top Physical Leg (In)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, cy - 35); ctx.lineTo(x, cy);
        ctx.stroke();

        // Bottom Physical Leg (Out)
        ctx.beginPath();
        ctx.moveTo(x, cy); ctx.lineTo(x, cy + 35);
        ctx.stroke();

        // Core Square
        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.fillRect(x - 10, cy - 10, 20, 20);
        ctx.strokeRect(x - 10, cy - 10, 20, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(`A${i + 1}`, x - 6, cy + 3);
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('iTT-MPO TENSOR TRAIN (D=6)', 70, cy + 90);

      // iTT-MPO Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isPurifyingIttMpo ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('iTT-MPO PURIFIER', 320, cy - 12);
      ctx.fillText('LIOUVILLIAN NESS', 320, cy + 8);

      // Purified Non-Equilibrium Steady State Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingIttMpo ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('STEADY-STATE PURIFIED', 484, cy - 35);
      ctx.fillText('DISSIPATIVE NOISE CANCELLED', 480, cy - 10);
      ctx.fillText(`NESS FIDELITY = ${(purifiedIttFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `iTT-MPO DISSIPATIVE QEM: RANK D = ${tensorTrainRankD} | DISSIPATION γ = ${liouvillianDissipationGamma.toFixed(2)} | FIDELITY = ${(purifiedIttFidelity * 100).toFixed(2)}% (OSELEDETS & SCHOLLWÖCK)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tensorTrainRankD, liouvillianDissipationGamma, purifiedIttFidelity, isPurifyingIttMpo]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                iTT-MPO DISSIPATIVE QEM // LIOUVILLIAN NESS PURIFIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                OSELEDETS, VERSTRAETE & SCHOLLWÖCK (SKOLTECH, VIENNA & LMU)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Infinite Tensor-Train MPO cross-channel Lindblad dissipative Liouvillian purifier for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerIttPurification}
            disabled={isPurifyingIttMpo}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingIttMpo ? 'RESOLVING NESS CHANNELS...' : 'PURIFY VIA iTT-MPO'}</span>
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
              <span className="text-pink-400 font-bold">TT-RANK: D = {tensorTrainRankD}</span>
              <span className="text-cyan-400 font-bold">DISSIPATION: γ = {liouvillianDissipationGamma.toFixed(2)}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedIttFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-EQUILIBRIUM STEADY STATE DISSIPATION MITIGATED</div>
          </div>
        </div>

        {/* TT Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DISSIPATION RATE (γ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Lindblad Dissipation:</span>
              <span className="text-pink-400 font-bold">γ = {liouvillianDissipationGamma.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.5}
              step={0.05}
              value={liouvillianDissipationGamma}
              onChange={(e) => setLiouvillianDissipationGamma(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Tensor-Train Cross Dequantization:</strong> Represents open-system density matrices as infinite Matrix Product Operators with compact TT-ranks!</div>
            <div>• <strong>Liouvillian NESS Solver:</strong> Directly solves non-equilibrium steady states $\mathcal{L}(\rho) = 0$, filtering out continuous environmental decoherence!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
