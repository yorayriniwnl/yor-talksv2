import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, FunctionSquare
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PerturbativeQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [perturbationOrderK, setPerturbationOrderK] = useState(3); // k = 3rd order expansion
  const [crossTalkCrosstalkRate, setCrossTalkCrosstalkRate] = useState(0.06); // 6% coherent cross-talk
  const [isExpanding, setIsExpanding] = useState(false);
  const [mitigatedStateFidelity, setMitigatedStateFidelity] = useState(0.982);

  const animFrameRef = useRef<number | null>(null);

  const triggerPerturbativeExpansion = () => {
    uiaudio.warp();
    setIsExpanding(true);

    setTimeout(() => {
      setIsExpanding(false);
      setMitigatedStateFidelity(0.9997);
      uiaudio.success();
    }, 750);
  };

  // Perturbative Clifford Expansion & Covariance Inversion Canvas
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

      // Draw Perturbative Expansion Terms: ρ_0, ρ_1, ..., ρ_k (Left: 80 to 320)
      const termStep = 240 / (perturbationOrderK + 1);
      for (let order = 0; order <= perturbationOrderK; order++) {
        const tx = 90 + order * termStep;
        const ty = cy - 30;

        ctx.fillStyle = order === 0 ? '#06b6d4' : (order === 1 ? '#ec4899' : '#f59e0b');
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isExpanding ? 18 : 6;
        ctx.beginPath();
        ctx.arc(tx, ty, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`ρ^(${order})`, tx - 12, ty + 3);
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`PERTURBATIVE CLIFFORD EXPANSION (ORDER k = ${perturbationOrderK})`, 75, cy - 75);

      // Covariance Matrix Inversion Core (Center at 420, cy - 30)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isExpanding ? 24 : 8;
      ctx.strokeRect(360, cy - 75, 120, 90);
      ctx.fillRect(360, cy - 75, 120, 90);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('COVARIANCE INVERSE', 368, cy - 40);
      ctx.fillText('C^-1 · ⟨O_pert⟩', 382, cy - 15);

      // Mitigated Output State (Right at 580, cy - 30)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isExpanding ? 24 : 10;
      ctx.beginPath();
      ctx.arc(580, cy - 30, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('MITIGATED', 545, cy - 35);
      ctx.fillText(`F = ${(mitigatedStateFidelity * 100).toFixed(2)}%`, 542, cy - 18);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PERTURBATIVE CLIFFORD QEM: ORDER k = ${perturbationOrderK} (CROSS-TALK = ${crossTalkCrosstalkRate * 100}% | MITIGATED FIDELITY = ${(mitigatedStateFidelity * 100).toFixed(2)}%)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [perturbationOrderK, crossTalkCrosstalkRate, mitigatedStateFidelity, isExpanding]);

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
                PERTURBATIVE QEM // CLIFFORD EXPANSION & COVARIANCE INVERSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ENDO & BENJAMIN (OXFORD & RIKEN)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Order-by-order Clifford perturbation series & multi-qubit cross-talk cancellation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerPerturbativeExpansion}
            disabled={isExpanding}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isExpanding ? 'EXPANDING PERTURBATION SERIES...' : 'EVALUATE PERTURBATIVE EXPANSION'}</span>
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
              <span className="text-cyan-400 font-bold">ORDER: k = {perturbationOrderK}</span>
              <span className="text-pink-400 font-bold">CROSS-TALK: {(crossTalkCrosstalkRate * 100).toFixed(1)}%</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(mitigatedStateFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: COHERENT MULTI-QUBIT NOISE CANCELLED</div>
          </div>
        </div>

        {/* Perturbative Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              EXPANSION ORDER (k)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Perturbation Order:</span>
              <span className="text-cyan-400 font-bold">k = {perturbationOrderK}</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={perturbationOrderK}
              onChange={(e) => setPerturbationOrderK(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Clifford Basis Expansion:</strong> Non-Clifford target circuits are decomposed into formal perturbative series around nearby classically simulable Clifford frames!</div>
            <div>• <strong>Covariance Deconvolution:</strong> Inverting the noise covariance matrix directly reconstructs zero-noise expectation values with bounded sampling variance!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
