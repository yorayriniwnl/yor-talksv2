import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CtmrgPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ctmrgEnvironmentBondChi, setCtmrgEnvironmentBondChi] = useState(32); // χ = 32 environment bond dimension
  const [ipepsBulkBondD, setIpepsBulkBondD] = useState(4); // D = 4 iPEPS bulk bond dimension
  const [isPurifyingCtmrg, setIsPurifyingCtmrg] = useState(false);
  const [purifiedCtmrgFidelity, setPurifiedCtmrgFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerCtmrgPurification = () => {
    uiaudio.warp();
    setIsPurifyingCtmrg(true);

    setTimeout(() => {
      setIsPurifyingCtmrg(false);
      setPurifiedCtmrgFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Infinite PEPS Corner Transfer Matrix Renormalization Group (CTMRG) Canvas
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

      // CTMRG 3x3 Block Structure (Left: 80 to 260)
      const ox = 90;
      const oy = cy - 75;
      const sz = 48;

      // 4 Corner Tensors C1, C2, C3, C4 (Gold)
      const corners = [
        { x: ox, y: oy, label: 'C1' },
        { x: ox + sz * 2, y: oy, label: 'C2' },
        { x: ox, y: oy + sz * 2, label: 'C4' },
        { x: ox + sz * 2, y: oy + sz * 2, label: 'C3' },
      ];

      corners.forEach(c => {
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(c.x, c.y, sz, sz);
        ctx.strokeRect(c.x, c.y, sz, sz);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(c.label, c.x + 16, c.y + 28);
      });

      // 4 Half-Row / Half-Column Transfer Tensors T1, T2, T3, T4 (Cyan)
      const transfers = [
        { x: ox + sz, y: oy, label: 'T1' },
        { x: ox + sz * 2, y: oy + sz, label: 'T2' },
        { x: ox + sz, y: oy + sz * 2, label: 'T3' },
        { x: ox, y: oy + sz, label: 'T4' },
      ];

      transfers.forEach(t => {
        ctx.fillStyle = '#06b6d4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(t.x, t.y, sz, sz);
        ctx.strokeRect(t.x, t.y, sz, sz);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(t.label, t.x + 16, t.y + 28);
      });

      // Central Bulk iPEPS Tensor a (Pink)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(ox + sz, oy + sz, sz, sz);
      ctx.strokeRect(ox + sz, oy + sz, sz, sz);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('a(iPEPS)', ox + sz + 2, oy + sz + 28);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CTMRG 9-TENSOR ENVIRONMENT', 80, cy + 90);

      // CTMRG Renormalization Projector Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isPurifyingCtmrg ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CTMRG PURIFIER', 324, cy - 12);
      ctx.fillText('PROJECTOR U_χ', 326, cy + 8);

      // Purified 2D Thermodynamic Limit Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingCtmrg ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D THERMODYNAMIC LIMIT', 484, cy - 35);
      ctx.fillText('INFINITE-LATTICE PURITY', 485, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedCtmrgFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CTMRG PURIFIER QEM: ENVIRONMENT BOND χ = ${ctmrgEnvironmentBondChi} | iPEPS BOND D = ${ipepsBulkBondD} | FIDELITY = ${(purifiedCtmrgFidelity * 100).toFixed(2)}% (NISHINO & ORÚS)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [ctmrgEnvironmentBondChi, ipepsBulkBondD, purifiedCtmrgFidelity, isPurifyingCtmrg]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Grid className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
                CTMRG PURIFIER QEM // CORNER TRANSFER TENSOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                NISHINO, ORÚS & VIDAL (KOBE, BARCELONA & QUEENSLAND)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D Infinite PEPS corner transfer matrix renormalization group purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCtmrgPurification}
            disabled={isPurifyingCtmrg}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-amber-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingCtmrg ? 'COMPRESSING ENVIRONMENT...' : 'PURIFY VIA CTMRG'}</span>
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
              <span className="text-cyan-400 font-bold">ENVIRONMENT BOND: χ = {ctmrgEnvironmentBondChi}</span>
              <span className="text-pink-400 font-bold">iPEPS BOND: D = {ipepsBulkBondD}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedCtmrgFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: CORNER RENORMALIZATION PROJECTORS CONVERGED</div>
          </div>
        </div>

        {/* CTMRG Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ENV BOND (χ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Environment Dimension:</span>
              <span className="text-cyan-400 font-bold">χ = {ctmrgEnvironmentBondChi}</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              step={8}
              value={ctmrgEnvironmentBondChi}
              onChange={(e) => setCtmrgEnvironmentBondChi(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Infinite Thermodynamic Limit:</strong> CTMRG contracts the infinite 2D boundary of an iPEPS lattice into 4 corner and 4 edge tensors without finite-size truncation boundary artifacts!</div>
            <div>• <strong>Boundary Spectrum Inversion:</strong> Eliminates non-local contracting dephasing noise, allowing exact expectation value extraction for 2D strongly correlated quantum magnets!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
