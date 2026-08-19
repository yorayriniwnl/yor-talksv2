import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, RefreshCw
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function VirtualCoherenceQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ancillaCouplingStrength, setAncillaCouplingStrength] = useState(0.85); // 0.85 coupling
  const [virtualReferenceCopies, setVirtualReferenceCopies] = useState(3); // N = 3 virtual copies
  const [isPurifying, setIsPurifying] = useState(false);
  const [purifiedStatePurity, setPurifiedStatePurity] = useState(0.984);

  const animFrameRef = useRef<number | null>(null);

  const triggerCoherencePurification = () => {
    uiaudio.warp();
    setIsPurifying(true);

    setTimeout(() => {
      setIsPurifying(false);
      setPurifiedStatePurity(0.9997);
      uiaudio.success();
    }, 750);
  };

  // Virtual Coherence Ancilla Distillation & Density Matrix Purification Canvas
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

      // Primary Noisy System State ρ (Top Left: 120, cy - 60)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(80, cy - 100, 110, 70);
      ctx.fillRect(80, cy - 100, 110, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NOISY STATE ρ', 92, cy - 70);
      ctx.fillText('Tr(ρ²) = 0.76', 95, cy - 48);

      // Dual Virtual Ancillae Reference Frames (Bottom Left: 120, cy + 40)
      ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.strokeRect(80, cy + 10, 110, 70);
      ctx.fillRect(80, cy + 10, 110, 70);

      ctx.fillStyle = '#ffffff';
      ctx.fillText('ANCILLAE |a_1, a_2⟩', 88, cy + 40);
      ctx.fillText('REF MANIFOLD', 95, cy + 62);

      // Controlled Permutation / Derangement Swap Kernel (Center at 370, cy - 10)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isPurifying ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 10, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('VIRTUAL SWAP', 335, cy - 18);
      ctx.fillText('Tr(ρ^N) / Tr(ρ^N-1)', 320, cy + 2);

      // Mitigated Pure Expectation Value Block (Right at 550, cy - 10)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifying ? 24 : 10;
      ctx.strokeRect(500, cy - 55, 140, 90);
      ctx.fillRect(500, cy - 55, 140, 90);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PURIFIED DENSITY MATRIX', 506, cy - 30);
      ctx.fillText('Tr(ρ_purified²) = 1.000', 508, cy - 8);
      ctx.fillText(`PURITY = ${(purifiedStatePurity * 100).toFixed(2)}%`, 515, cy + 18);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `VIRTUAL COHERENCE QEM: N = ${virtualReferenceCopies} COPIES | COUPLING = ${ancillaCouplingStrength} | PURIFIED PURITY = ${(purifiedStatePurity * 100).toFixed(2)}% (CAI-BENJAMIN-SUGIYAMA)`,
        50,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [ancillaCouplingStrength, virtualReferenceCopies, purifiedStatePurity, isPurifying]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <RefreshCw className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-300 to-emerald-400">
                VIRTUAL COHERENCE QEM // ANCILLA DISTILLATION & PURIFICATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CAI, BENJAMIN & SUGIYAMA (OXFORD & TOKYO)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Multi-copy non-demolition swap distillation & exact metric tensor purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCoherencePurification}
            disabled={isPurifying}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifying ? 'PURIFYING QUANTUM COHERENCE...' : 'PURIFY VIA VIRTUAL DISTILLATION'}</span>
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
              <span className="text-cyan-400 font-bold">VIRTUAL COPIES: N = {virtualReferenceCopies}</span>
              <span className="text-pink-400 font-bold">COUPLING: {ancillaCouplingStrength}</span>
              <span className="text-emerald-400 font-bold">STATE PURITY: {(purifiedStatePurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-DEMOLITION PURIFIED EXPECTATION ACTIVE</div>
          </div>
        </div>

        {/* Coherence Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              VIRTUAL COPIES (N)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Distillation Copies:</span>
              <span className="text-cyan-400 font-bold">N = {virtualReferenceCopies}</span>
            </div>
            <input
              type="range"
              min={2}
              max={5}
              step={1}
              value={virtualReferenceCopies}
              onChange={(e) => setVirtualReferenceCopies(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Exponential Incoherent Suppression:</strong> Virtual distillation suppresses mixed incoherent error states exponentially as $(\lambda_2 / \lambda_1)^N$, purifying arbitrary quantum states without quantum error correction!</div>
            <div>• <strong>Cross-RDM Metric Inversion:</strong> Eliminates asymmetric read-out and gate dephasing cross-talk via exact quantum metric tensor reconstruction!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
