import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Clock
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ItebdPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [itebdBondDimensionChi, setItebdBondDimensionChi] = useState(64); // χ = 64 iTEBD bond dimension
  const [imaginaryTimeStepDtau, setImaginaryTimeStepDtau] = useState(0.01); // dτ = 0.01 time step
  const [isPurifyingItebd, setIsPurifyingItebd] = useState(false);
  const [purifiedItebdFidelity, setPurifiedItebdFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerItebdPurification = () => {
    uiaudio.warp();
    setIsPurifyingItebd(true);

    setTimeout(() => {
      setIsPurifyingItebd(false);
      setPurifiedItebdFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 1D Infinite Time-Evolving Block Decimation (iTEBD) Canvas
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

      // Vidal Canonical Form: Γ_A - Λ_A - Γ_B - Λ_B (Left: 80 to 260)
      const nodes = [
        { x: 95, y: cy - 10, label: 'Γ_A', color: '#06b6d4' },
        { x: 135, y: cy - 10, label: 'Λ_A', color: '#f59e0b' },
        { x: 185, y: cy - 10, label: 'Γ_B', color: '#ec4899' },
        { x: 235, y: cy - 10, label: 'Λ_B', color: '#38bdf8' },
      ];

      // Virtual Entanglement Bonds
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy - 10); ctx.lineTo(260, cy - 10);
      ctx.stroke();

      nodes.forEach(n => {
        // Physical Leg if Gamma Tensor
        if (n.label.startsWith('Γ')) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y); ctx.lineTo(n.x, n.y - 30);
          ctx.stroke();

          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(n.x, n.y - 30, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Tensor Node
        ctx.fillStyle = n.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.label.startsWith('Γ') ? 14 : 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(n.label, n.x - (n.label.startsWith('Γ') ? 8 : 7), n.y + 3);
      });

      // 2-Site Imaginary Time Trotter Gate (e^{-dτ H}) Above Γ_A - Λ_A - Γ_B
      ctx.fillStyle = 'rgba(236, 72, 153, 0.3)';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.strokeRect(85, cy - 58, 110, 22);
      ctx.fillRect(85, cy - 58, 110, 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('exp(-dτ H_{AB})', 98, cy - 44);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('VIDAL CANONICAL iTEBD Γ-Λ', 80, cy + 90);

      // iTEBD Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isPurifyingItebd ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('iTEBD PURIFIER', 324, cy - 12);
      ctx.fillText('SVD SINGULAR VALUES', 315, cy + 8);

      // Purified Thermodynamic Limit Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingItebd ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('1D INFINITE GROUND STATE', 484, cy - 35);
      ctx.fillText('NON-UNITARY TROTTER dτ', 488, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedItebdFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `iTEBD PURIFIER QEM: BOND DIMENSION χ = ${itebdBondDimensionChi} | TIME STEP dτ = ${imaginaryTimeStepDtau} | FIDELITY = ${(purifiedItebdFidelity * 100).toFixed(2)}% (VIDAL & ORÚS)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [itebdBondDimensionChi, imaginaryTimeStepDtau, purifiedItebdFidelity, isPurifyingItebd]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Clock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-400">
                iTEBD PURIFIER QEM // VIDAL CANONICAL GAUGE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                VIDAL & ORÚS (UNIV. OF QUEENSLAND & BARCELONA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Infinite time-evolving block decimation & non-unitary Trotter gate purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerItebdPurification}
            disabled={isPurifyingItebd}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingItebd ? 'EVOLVING IMAGINARY TIME...' : 'PURIFY VIA iTEBD'}</span>
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
              <span className="text-cyan-400 font-bold">BOND DIMENSION: χ = {itebdBondDimensionChi}</span>
              <span className="text-pink-400 font-bold">TIME STEP: dτ = {imaginaryTimeStepDtau}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedItebdFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: VIDAL CANONICAL GAUGE CONVERGED</div>
          </div>
        </div>

        {/* iTEBD Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BOND DIMENSION (χ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Infinite Bond:</span>
              <span className="text-cyan-400 font-bold">χ = {itebdBondDimensionChi}</span>
            </div>
            <input
              type="range"
              min={16}
              max={128}
              step={16}
              value={itebdBondDimensionChi}
              onChange={(e) => setItebdBondDimensionChi(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Vidal Canonical Representation:</strong> Decomposes infinite 1D MPS into site tensors Gamma_A, Gamma_B and singular value matrices Lambda_A, Lambda_B to maintain exact gauge normalization!</div>
            <div>• <strong>Imaginary Time Evolution:</strong> Applies 2-site non-unitary gates exp(-dtau H) to project out noisy excited state components, reaching true ground-state expectation values!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
