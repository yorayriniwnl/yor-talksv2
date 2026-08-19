import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Factory
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MagicStateFactory() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [rawInfidelityEpsilon, setRawInfidelityEpsilon] = useState(0.04); // 4% raw T-state error
  const [distillationRounds, setDistillationRounds] = useState(1); // 1-round: eps_out ~ 35*eps^3
  const [isDistilling, setIsDistilling] = useState(false);
  const [distilledInfidelity, setDistilledInfidelity] = useState(0.0022); // Distilled output error

  const animFrameRef = useRef<number | null>(null);

  // Bravyi-Kitaev 15-to-1 Distillation: epsilon_out = 35 * epsilon_in^3
  const calculatedOutputInfidelity = +(35 * Math.pow(rawInfidelityEpsilon, 3)).toFixed(5);

  const runDistillationFactory = () => {
    uiaudio.warp();
    setIsDistilling(true);

    setTimeout(() => {
      setIsDistilling(false);
      setDistilledInfidelity(calculatedOutputInfidelity);
      uiaudio.success();
    }, 750);
  };

  // Bravyi-Kitaev 15-to-1 Magic State Distillation Circuit Canvas
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

      // Draw 15 Input Raw Noisy T-States (Left column at x = 100)
      for (let i = 0; i < 15; i++) {
        const y = 50 + i * 25;

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(100, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Wire to 15-Qubit Reed-Muller Distillation Filter Box
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(105, y);
        ctx.lineTo(260, cy);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('15 RAW |T⟩ STATES', 40, cy + 180);
      ctx.fillText(`ε_in = ${(rawInfidelityEpsilon * 100).toFixed(1)}%`, 60, cy + 195);

      // Central Bravyi-Kitaev 15-to-1 Magic State Distillation Filter Box
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isDistilling ? 20 : 6;
      ctx.strokeRect(260, cy - 60, 140, 120);
      ctx.fillRect(260, cy - 60, 140, 120);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('BRAVYI-KITAEV', 280, cy - 20);
      ctx.fillText('15-TO-1 DISTILL', 275, cy);
      ctx.fillText('ε_out ≈ 35 ε³', 285, cy + 25);

      // Distilled Ultra-Pure Magic State Output Wire & Node
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(400, cy); ctx.lineTo(540, cy);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(580, cy, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`PURIFIED |T⟩`, 545, cy - 4);
      ctx.fillText(`ε = ${distilledInfidelity}`, 540, cy + 12);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `MAGIC STATE FACTORY: DISTILLED INFIDELITY = ${distilledInfidelity} (CUBIC SUPPRESSION ε_out ≈ 35 ε³)`,
        80,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [rawInfidelityEpsilon, distilledInfidelity, isDistilling]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Factory className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                MAGIC STATE FACTORY // BRAVYI-KITAEV 15-TO-1 DISTILLATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                FAULT-TOLERANT NON-CLIFFORD GATES
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Reed-Muller 15-qubit quantum parity checks & cubic error suppression for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runDistillationFactory}
            disabled={isDistilling}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDistilling ? 'DISTILLING 15 RAW T-STATES...' : 'DISTILL MAGIC T-STATE'}</span>
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
              <span className="text-cyan-400 font-bold">INPUT ε: {(rawInfidelityEpsilon * 100).toFixed(1)}%</span>
              <span className="text-pink-400 font-bold">RATIO: 15 → 1</span>
              <span className="text-emerald-400 font-bold">DISTILLED ε: {distilledInfidelity}</span>
            </div>
            <div>STATUS: FAULT-TOLERANT NON-CLIFFORD T-GATE GENERATED</div>
          </div>
        </div>

        {/* Factory Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              RAW T-STATE ERROR
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Input Infidelity (ε_in):</span>
              <span className="text-cyan-400 font-bold">{(rawInfidelityEpsilon * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={0.01}
              max={0.08}
              step={0.005}
              value={rawInfidelityEpsilon}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRawInfidelityEpsilon(val);
                setDistilledInfidelity(+(35 * Math.pow(val, 3)).toFixed(5));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Eastin-Knill Theorem:</strong> No quantum error correcting code can implement a universal set of logical gates transversally! Non-Clifford T-gates must be injected via magic state distillation!</div>
            <div>• <strong>15-to-1 Protocol:</strong> Encodes 15 noisy T-states into a 15-qubit Reed-Muller code and measures syndrome parity to yield 1 ultra-pure T-state with cubic error suppression!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
