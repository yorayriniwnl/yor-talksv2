import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Magnet
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonMeissnerFlux() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [penetrationDepthLambda, setPenetrationDepthLambda] = useState(25); // λ = 25 nm tensor London penetration depth
  const [confinedLineonSheetsCount, setConfinedLineonSheetsCount] = useState(3); // 3 planar flux sheets
  const [isExpellingFields, setIsExpellingFields] = useState(false);
  const [meissnerExpulsionFidelity, setMeissnerExpulsionFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerHigherRankMeissnerExpulsion = () => {
    uiaudio.warp();
    setIsExpellingFields(true);

    setTimeout(() => {
      setIsExpellingFields(false);
      setMeissnerExpulsionFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Higher-Rank Superconducting Fracton Meissner Effect Canvas
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

      // Superconducting Fracton Core Domain (Left: 80 to 260)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(80, cy - 70, 180, 140);
      ctx.fillRect(80, cy - 70, 180, 140);

      // Confined 2D Lineon Flux Sheets Inside Bulk
      for (let s = 0; s < confinedLineonSheetsCount; s++) {
        const sy = cy - 40 + s * 40;
        ctx.strokeStyle = isExpellingFields ? '#22c55e' : '#ec4899';
        ctx.lineWidth = isExpellingFields ? 3.5 : 2;
        ctx.beginPath();
        ctx.moveTo(90, sy); ctx.lineTo(250, sy);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(`LINEON SHEET ${s + 1}`, 100, sy - 6);
      }

      // Expelled Tensor Magnetic Field Lines B_ij Outside Superconductor
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      for (let l = 0; l < 4; l++) {
        const lx = 40 + l * 10;
        ctx.beginPath();
        ctx.moveTo(lx, cy - 90);
        ctx.quadraticCurveTo(60, cy, lx, cy + 90);
        ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('HIGHER-RANK MEISSNER BULK', 95, cy + 90);

      // Higher-Rank London Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = isExpellingFields ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('MEISSNER DUALITY', 322, cy - 12);
      ctx.fillText('∇×B_ij = -λ⁻² A_ij', 315, cy + 8);

      // Expulsion Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isExpellingFields ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TENSOR MEISSNER EXPULSION', 484, cy - 35);
      ctx.fillText('PLANAR FLUX CONFINEMENT', 486, cy - 10);
      ctx.fillText(`EXPULSION FIDELITY = ${(meissnerExpulsionFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON MEISSNER EFFECT: PENETRATION DEPTH λ = ${penetrationDepthLambda} nm | SHEETS = ${confinedLineonSheetsCount} | FIDELITY = ${(meissnerExpulsionFidelity * 100).toFixed(2)}% (PRETKO & SEIBERG)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [penetrationDepthLambda, confinedLineonSheetsCount, meissnerExpulsionFidelity, isExpellingFields]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Magnet className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
                FRACTON MEISSNER FLUX // HIGHER-RANK EXPULSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                PRETKO, RADZIHOVSKY & SEIBERG (CU BOULDER & IAS)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rank-2 tensor London equations & planar flux tube confinement for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerHigherRankMeissnerExpulsion}
            disabled={isExpellingFields}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isExpellingFields ? 'EXPELING TENSOR FIELDS...' : 'EXPEL TENSOR MAGNETIC FLUX'}</span>
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
              <span className="text-cyan-400 font-bold">PENETRATION DEPTH: λ = {penetrationDepthLambda} nm</span>
              <span className="text-emerald-400 font-bold">FLUX SHEETS: {confinedLineonSheetsCount}</span>
              <span className="text-pink-400 font-bold">EXPULSION FIDELITY: {(meissnerExpulsionFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: HIGHER-RANK TENSOR MEISSNER EXPULSION COMPLETE</div>
          </div>
        </div>

        {/* Fracton Meissner Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PENETRATION DEPTH (λ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Tensor London Depth:</span>
              <span className="text-cyan-400 font-bold">{penetrationDepthLambda} nm</span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={penetrationDepthLambda}
              onChange={(e) => setPenetrationDepthLambda(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Rank-2 London Equations:</strong> Expels tensor magnetic field components $B_{ij}$ exponentially from the fracton superconductor bulk with characteristic penetration depth $\lambda$!</div>
            <div>• <strong>Planar Lineon Confinement:</strong> Confines magnetic flux into rigid 2D planar sheets instead of 1D Abrikosov strings, enforcing sub-dimensional lineon mobility!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
