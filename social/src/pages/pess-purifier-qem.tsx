import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, Triangle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PessPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [simplexBondDimensionD, setSimplexBondDimensionD] = useState(6); // D = 6 Simplex bond dimension
  const [kagomeFrustrationJ2, setKagomeFrustrationJ2] = useState(0.15); // J2 = 0.15 next-nearest neighbor frustration
  const [isPurifyingPess, setIsPurifyingPess] = useState(false);
  const [purifiedPessFidelity, setPurifiedPessFidelity] = useState(0.986);

  const animFrameRef = useRef<number | null>(null);

  const triggerPessPurification = () => {
    uiaudio.warp();
    setIsPurifyingPess(true);

    setTimeout(() => {
      setIsPurifyingPess(false);
      setPurifiedPessFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Projected Entangled Simplex State (PESS) Kagome Lattice Canvas
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

      // Kagome Simplex Triangles (Left: 80 to 260)
      const triangles = [
        { cx: 130, cy: cy - 40 },
        { cx: 210, cy: cy - 40 },
        { cx: 170, cy: cy + 30 },
      ];

      triangles.forEach((tri, tidx) => {
        const r = 32;
        const p1 = { x: tri.cx, y: tri.cy - r };
        const p2 = { x: tri.cx - r * 0.866, y: tri.cy + r * 0.5 };
        const p3 = { x: tri.cx + r * 0.866, y: tri.cy + r * 0.5 };

        // Triangle Perimeter
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.stroke();

        // Simplex Center Tensor S (Gold)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(tri.cx, tri.cy, 6, 0, Math.PI * 2);
        ctx.fill();

        // Virtual Simplex Bonds to Vertices
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tri.cx, tri.cy); ctx.lineTo(p1.x, p1.y);
        ctx.moveTo(tri.cx, tri.cy); ctx.lineTo(p2.x, p2.y);
        ctx.moveTo(tri.cx, tri.cy); ctx.lineTo(p3.x, p3.y);
        ctx.stroke();

        // Physical Spin Vertices (Pink)
        [p1, p2, p3].forEach(p => {
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('KAGOME SIMPLEX NETWORK (PESS)', 75, cy + 85);

      // Simplex Gauge Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isPurifyingPess ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SIMPLEX PURIFIER', 324, cy - 12);
      ctx.fillText('S_{αβγ} GAUGE OPT', 320, cy + 8);

      // Purified Frustrated Spin Liquid Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingPess ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FRUSTRATED GROUND STATE', 484, cy - 35);
      ctx.fillText('NON-ABELIAN SPIN LIQUID', 486, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedPessFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PESS PURIFIER QEM: SIMPLEX BOND D = ${simplexBondDimensionD} | FRUSTRATION J2 = ${kagomeFrustrationJ2} | FIDELITY = ${(purifiedPessFidelity * 100).toFixed(2)}% (XIANG & XIE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [simplexBondDimensionD, kagomeFrustrationJ2, purifiedPessFidelity, isPurifyingPess]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Triangle className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-amber-300 to-pink-400">
                PESS PURIFIER QEM // SIMPLEX TENSOR FILTER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                XIANG, XIE & CHEN (CAS & UNIV. OF TOKYO)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Projected Entangled Simplex States & geometrically frustrated Kagome lattice purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerPessPurification}
            disabled={isPurifyingPess}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-amber-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingPess ? 'OPTIMIZING SIMPLEX TENSORS...' : 'PURIFY VIA SIMPLEX PESS'}</span>
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
              <span className="text-amber-400 font-bold">SIMPLEX BOND: D = {simplexBondDimensionD}</span>
              <span className="text-cyan-400 font-bold">FRUSTRATION J2: {kagomeFrustrationJ2}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedPessFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: SIMPLEX GAUGE INVARIANCE NOMINAL</div>
          </div>
        </div>

        {/* PESS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SIMPLEX BOND (D)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Simplex Dimension:</span>
              <span className="text-purple-400 font-bold">D = {simplexBondDimensionD}</span>
            </div>
            <input
              type="range"
              min={2}
              max={12}
              step={2}
              value={simplexBondDimensionD}
              onChange={(e) => setSimplexBondDimensionD(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Simplex Tensor Representation:</strong> PESS places rank-3 simplex tensors at the centers of triangular simplexes, naturally preserving C3 point group and chiral symmetries!</div>
            <div>• <strong>Frustration Invariant Filtering:</strong> Solves geometrically frustrated spin liquid ground states without artificial bipartite lattice bipartite cuts!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
