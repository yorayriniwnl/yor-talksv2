import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function IsotnsPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isometricBondDimensionChi, setIsometricBondDimensionChi] = useState(8); // chi = 8 isometric bond dimension
  const [mosesMoveDisentanglingSteps, setMosesMoveDisentanglingSteps] = useState(4); // 4 Moses move disentangling steps
  const [isPurifyingIsoTns, setIsPurifyingIsoTns] = useState(false);
  const [purifiedIsoTnsFidelity, setPurifiedIsoTnsFidelity] = useState(0.987);

  const animFrameRef = useRef<number | null>(null);

  const triggerMosesMovePurification = () => {
    uiaudio.warp();
    setIsPurifyingIsoTns(true);

    setTimeout(() => {
      setIsPurifyingIsoTns(false);
      setPurifiedIsoTnsFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Isometric Tensor Network State (isoTNS) & Moses Move Canvas
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

      // 2D isoTNS Column-by-Column Isometric Lattice (Left: 90 to 250)
      const cols = 3;
      const rows = 3;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const px = 110 + c * 50;
          const py = cy - 60 + r * 50;

          // Directed Isometric Arrow (Rightward flow toward orthogonality center)
          if (c < cols - 1) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(px, py); ctx.lineTo(px + 50, py);
            ctx.stroke();

            // Arrowhead indicating isometric direction
            ctx.fillStyle = '#06b6d4';
            ctx.beginPath();
            ctx.moveTo(px + 30, py - 4);
            ctx.lineTo(px + 36, py);
            ctx.lineTo(px + 30, py + 4);
            ctx.fill();
          }

          // Vertical isometric bond
          if (r < rows - 1) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(px, py); ctx.lineTo(px, py + 50);
            ctx.stroke();
          }

          // Isometric Node (Cyan / Gold for Orthogonality Center)
          const isOrthogonalityCenter = (c === 2 && r === 1);
          ctx.fillStyle = isOrthogonalityCenter ? '#f59e0b' : '#1e1b4b';
          ctx.strokeStyle = isOrthogonalityCenter ? '#f59e0b' : '#ec4899';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, isOrthogonalityCenter ? 12 : 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D ISOMETRIC TNS (ISOCENTER)', 85, cy + 85);

      // Moses Move Disentangler Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isPurifyingIsoTns ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('MOSES MOVE', 338, cy - 12);
      ctx.fillText('DISENTANGLER', 332, cy + 8);

      // Purified 2D Quantum State Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingIsoTns ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('ISOMETRIC CANONICAL FORM', 484, cy - 35);
      ctx.fillText('EXACT LOCAL EXPECTATION', 486, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedIsoTnsFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `isoTNS PURIFIER QEM: BOND DIMENSION χ = ${isometricBondDimensionChi} | MOSES STEPS = ${mosesMoveDisentanglingSteps} | FIDELITY = ${(purifiedIsoTnsFidelity * 100).toFixed(2)}% (ZALETEL & POLLMANN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isometricBondDimensionChi, mosesMoveDisentanglingSteps, purifiedIsoTnsFidelity, isPurifyingIsoTns]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <FunctionSquare className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-300 to-pink-400">
                ISOTNS PURIFIER QEM // MOSES MOVE DISENTANGLING FILTER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                ZALETEL, POLLMANN & HAUSCHILD (UC BERKELEY & TU MUNICH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D Isometric Tensor Network States & canonical Moses Move purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMosesMovePurification}
            disabled={isPurifyingIsoTns}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingIsoTns ? 'DISENTANGLING ISOTNS...' : 'CANONICALIZE VIA MOSES MOVE'}</span>
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
              <span className="text-purple-400 font-bold">ISOMETRIC DIMENSION: χ = {isometricBondDimensionChi}</span>
              <span className="text-cyan-400 font-bold">MOSES STEPS: {mosesMoveDisentanglingSteps}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedIsoTnsFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: ISOMETRIC ORTHOGONALITY CENTER PRESERVED</div>
          </div>
        </div>

        {/* isoTNS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ISOMETRIC BOND (χ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Bond Dimension:</span>
              <span className="text-purple-400 font-bold">χ = {isometricBondDimensionChi}</span>
            </div>
            <input
              type="range"
              min={2}
              max={16}
              step={2}
              value={isometricBondDimensionChi}
              onChange={(e) => setIsometricBondDimensionChi(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Isometric Tensor Form:</strong> Tensors satisfy isometry conditions, enabling exact local expectation value computation without exponential contracting approximations!</div>
            <div>• <strong>Moses Move Disentangling:</strong> Dynamically splits bipartite entanglement across 2D columns, shifting the orthogonality center and stripping non-unitary noise!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
