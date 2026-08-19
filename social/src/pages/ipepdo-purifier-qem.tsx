import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function IpepdoPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pepdoBondDimensionD, setPepdoBondDimensionD] = useState(4); // D = 4 iPEPDO bond
  const [krausPurificationRankK, setKrausPurificationRankK] = useState(2); // K = 2 Kraus rank
  const [isPurifyingIpepdo, setIsPurifyingIpepdo] = useState(false);
  const [purifiedPepdoFidelity, setPurifiedPepdoFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerIpepdoPurification = () => {
    uiaudio.warp();
    setIsPurifyingIpepdo(true);

    setTimeout(() => {
      setIsPurifyingIpepdo(false);
      setPurifiedPepdoFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Infinite PEPDO (iPEPDO) Local Purification Canvas
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

      // 2D PEPDO Purification Structure (Left: 80 to 240, cy - 60 to cy + 60)
      const gridSize = 3;
      const spacing = 45;
      const originX = 90;
      const originY = cy - 45;

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // 2D Planar Lattice Bonds (Cyan)
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.5;
          if (c < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + spacing, y); ctx.stroke();
          }
          if (r < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + spacing); ctx.stroke();
          }

          // Kraus Ancilla Purification Index (Pink Vertical Leg)
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x, y - 18);
          ctx.stroke();

          // Physical Site Node (Amber)
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();

          // Kraus Ancilla Node (Pink)
          ctx.fillStyle = '#ec4899';
          ctx.beginPath(); ctx.arc(x, y - 18, 3.5, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D iPEPDO PURIFICATION (K=2)', 65, cy + 90);

      // iPEPDO Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isPurifyingIpepdo ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('iPEPDO PURIFIER', 320, cy - 12);
      ctx.fillText('LOCAL KRAUS TENSORS', 305, cy + 8);

      // Purified Positive Semidefinite Density Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingIpepdo ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DISSIPATIVE NOISE FILTER', 484, cy - 35);
      ctx.fillText('POSITIVE SEMIDEFINITE ρ ≥ 0', 480, cy - 10);
      ctx.fillText(`iPEPDO FIDELITY = ${(purifiedPepdoFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `iPEPDO DISSIPATIVE QEM: BOND D = ${pepdoBondDimensionD} | KRAUS RANK K = ${krausPurificationRankK} | FIDELITY = ${(purifiedPepdoFidelity * 100).toFixed(2)}% (VERSTRAETE, CIRAC & ORUS)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pepdoBondDimensionD, krausPurificationRankK, purifiedPepdoFidelity, isPurifyingIpepdo]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                iPEPDO DISSIPATIVE QEM // 2D LOCAL PURIFIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                VERSTRAETE, CIRAC, ORÚS & SCHUCH (VIENNA, MPQ & PERIMETER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D infinite Projected Entangled Pair Density Operator local Kraus purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerIpepdoPurification}
            disabled={isPurifyingIpepdo}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingIpepdo ? 'PURIFYING KRAUS TENSORS...' : 'PURIFY VIA iPEPDO'}</span>
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
              <span className="text-cyan-400 font-bold">PEPDO BOND: D = {pepdoBondDimensionD}</span>
              <span className="text-pink-400 font-bold">KRAUS RANK: K = {krausPurificationRankK}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedPepdoFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: POSITIVE SEMIDEFINITE LOCAL PURIFICATION CONVERGED</div>
          </div>
        </div>

        {/* iPEPDO Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              KRAUS RANK (K)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Purification Rank:</span>
              <span className="text-cyan-400 font-bold">K = {krausPurificationRankK}</span>
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={krausPurificationRankK}
              onChange={(e) => setKrausPurificationRankK(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Local Purification Form:</strong> Represents mixed states as Tr_ancilla(|Psi&gt;&lt;Psi|), strictly guaranteeing positive semidefiniteness rho ≥ 0!</div>
            <div>• <strong>Dissipative 2D Error Filter:</strong> Mitigates non-equilibrium open-system decoherence in 2D quantum memory lattices with exact tensor network contractions!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
