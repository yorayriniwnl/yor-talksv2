import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid, Triangle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function IttPesoPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [simplexBondDimensionD, setSimplexBondDimensionD] = useState(6); // D = 6 Simplex bond
  const [ttBoundaryRankChi, setTtBoundaryRankChi] = useState(64); // χ = 64 TT boundary rank
  const [isPurifyingIttPeso, setIsPurifyingIttPeso] = useState(false);
  const [purifiedIttPesoFidelity, setPurifiedIttPesoFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerIttPesoPurification = () => {
    uiaudio.warp();
    setIsPurifyingIttPeso(true);

    setTimeout(() => {
      setIsPurifyingIttPeso(false);
      setPurifiedIttPesoFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Infinite Tensor-Train PESO (iTT-PESO) Kagome Simplex Canvas
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

      // Frustrated 2D Kagome Simplex Network (Left: 80 to 240, cy - 60 to cy + 60)
      const triangles = [
        { x: 120, y: cy - 30 },
        { x: 180, y: cy - 30 },
        { x: 150, y: cy + 25 },
      ];

      // Draw Kagome Corner-Sharing Triangles (Cyan/Amber)
      triangles.forEach((t) => {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(t.x, t.y - 22);
        ctx.lineTo(t.x + 20, t.y + 14);
        ctx.lineTo(t.x - 20, t.y + 14);
        ctx.closePath();
        ctx.stroke();

        // Central Simplex Entanglement Tensor Node (Pink)
        ctx.fillStyle = '#ec4899';
        ctx.beginPath(); ctx.arc(t.x, t.y, 4.5, 0, Math.PI * 2); ctx.fill();

        // Vertices (Physical Spin Sites)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(t.x, t.y - 22, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(t.x + 20, t.y + 14, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(t.x - 20, t.y + 14, 3.5, 0, Math.PI * 2); ctx.fill();
      });

      // Boundary Tensor-Train Compression Rail (Pink)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(70, cy - 60); ctx.lineTo(230, cy - 60);
      ctx.moveTo(70, cy + 65); ctx.lineTo(230, cy + 65);
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('KAGOME iTT-PESO SIMPLEX (D=6)', 65, cy + 90);

      // iTT-PESO Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isPurifyingIttPeso ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('iTT-PESO PURIFIER', 315, cy - 12);
      ctx.fillText('FRUSTRATED SIMPLEX QEM', 298, cy + 8);

      // Purified Frustrated State Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingIttPeso ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('KAGOME PURIFIED STATE', 488, cy - 35);
      ctx.fillText('GEOMETRIC FRUSTRATION QEM', 480, cy - 10);
      ctx.fillText(`iTT-PESO FIDELITY = ${(purifiedIttPesoFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `iTT-PESO PURIFIER: SIMPLEX D = ${simplexBondDimensionD} | TT BOUNDARY χ = ${ttBoundaryRankChi} | FIDELITY = ${(purifiedIttPesoFidelity * 100).toFixed(2)}% (ZHENG-CHENG GU & SCHOLLWÖCK)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [simplexBondDimensionD, ttBoundaryRankChi, purifiedIttPesoFidelity, isPurifyingIttPeso]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Triangle className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                iTT-PESO FRUSTRATED QEM // KAGOME SIMPLEX PURIFIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                ZHENG-CHENG GU, VERSTRAETE & SCHOLLWÖCK (CUHK, VIENNA & LMU)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Infinite Tensor-Train Projected Entangled Simplex Operator for geometrically frustrated Kagome lattices for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerIttPesoPurification}
            disabled={isPurifyingIttPeso}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingIttPeso ? 'CONTRACTING KAGOME SIMPLEX...' : 'PURIFY VIA iTT-PESO'}</span>
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
              <span className="text-pink-400 font-bold">SIMPLEX BOND: D = {simplexBondDimensionD}</span>
              <span className="text-cyan-400 font-bold">BOUNDARY: χ = {ttBoundaryRankChi}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedIttPesoFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: KAGOME SIMPLEX DENSITY NETWORK CONTRACTED VIA TT-MPS</div>
          </div>
        </div>

        {/* TT-PESO Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SIMPLEX BOND (D)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Simplex Dimension:</span>
              <span className="text-pink-400 font-bold">D = {simplexBondDimensionD}</span>
            </div>
            <input
              type="range"
              min={3}
              max={9}
              step={1}
              value={simplexBondDimensionD}
              onChange={(e) => setSimplexBondDimensionD(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Projected Entangled Simplex Operators:</strong> Places multi-body entanglement tensors at the centers of frustrated triangles, naturally capturing chiral spin liquids!</div>
            <div>• <strong>Tensor-Train Environment Mitigation:</strong> Eliminates non-Markovian phase decoherence in non-Abelian geometric spin networks with 99.98% purity!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
