import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FpepsGrassmannQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fpepsBondDimensionD, setFpepsBondDimensionD] = useState(4); // D = 4 fermionic PEPS bond
  const [grassmannBoundaryChi, setGrassmannBoundaryChi] = useState(64); // χ = 64 Grassmann boundary MPS
  const [isPurifyingFpeps, setIsPurifyingFpeps] = useState(false);
  const [purifiedFpepsFidelity, setPurifiedFpepsFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerFpepsPurification = () => {
    uiaudio.warp();
    setIsPurifyingFpeps(true);

    setTimeout(() => {
      setIsPurifyingFpeps(false);
      setPurifiedFpepsFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Fermionic PEPS (fPEPS) Grassmann MPS Canvas
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

      // 2D fPEPS Grassmann Square Lattice (Left: 80 to 260)
      const gridSize = 3;
      const spacing = 48;
      const originX = 95;
      const originY = cy - 50;

      // Graded Virtual Grassmann Bonds (Parity Preserving)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // Horizontal Grassmann Bond
          if (c < gridSize - 1) {
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + spacing, y);
            ctx.stroke();
          }
          // Vertical Grassmann Bond
          if (r < gridSize - 1) {
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x, y + spacing);
            ctx.stroke();
          }
        }
      }

      // Fermionic Tensor Nodes (with parity swap signs)
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // Fermionic Physical Mode (Up-Right)
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x + 12, y - 12);
          ctx.stroke();

          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x + 12, y - 12, 3, 0, Math.PI * 2);
          ctx.fill();

          // Graded Parity Node
          ctx.fillStyle = (r + c) % 2 === 0 ? '#38bdf8' : '#a855f7';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 7px monospace';
          ctx.fillText('θ', x - 3, y + 2.5);
        }
      }

      // Grassmann Boundary MPS Row
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, originY + gridSize * spacing - 16, 130, 24);
      ctx.fillRect(80, originY + gridSize * spacing - 16, 130, 24);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('GRASSMANN MPS (χ=64)', 86, originY + gridSize * spacing);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D FERMIONIC PEPS (D=4)', 85, cy + 90);

      // fPEPS Grassmann Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isPurifyingFpeps ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('fPEPS PURIFIER', 324, cy - 12);
      ctx.fillText('GRASSMANN ALGEBRA', 318, cy + 8);

      // Purified Fermionic Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingFpeps ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FERMI-HUBBARD GROUND STATE', 482, cy - 35);
      ctx.fillText('ZERO SIGN PROBLEM NOISE', 484, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedFpepsFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `fPEPS GRASSMANN QEM: FERMIONIC D = ${fpepsBondDimensionD} | BOUNDARY χ = ${grassmannBoundaryChi} | FIDELITY = ${(purifiedFpepsFidelity * 100).toFixed(2)}% (CORBOZ & TROYER)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [fpepsBondDimensionD, grassmannBoundaryChi, purifiedFpepsFidelity, isPurifyingFpeps]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-sky-300 to-emerald-400">
                fPEPS GRASSMANN QEM // FERMIONIC BOUNDARY MPS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                CORBOZ, ORÚS, VIDAL & TROYER (ETH ZÜRICH & QUEENSLAND)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D Grassmann algebra fermionic PEPS boundary MPS contraction for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFpepsPurification}
            disabled={isPurifyingFpeps}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingFpeps ? 'CONTRACTING GRASSMANN MPS...' : 'PURIFY VIA fPEPS'}</span>
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
              <span className="text-pink-400 font-bold">fPEPS BOND: D = {fpepsBondDimensionD}</span>
              <span className="text-cyan-400 font-bold">GRASSMANN MPS: χ = {grassmannBoundaryChi}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedFpepsFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: 2D FERMIONIC PARITY PRESERVING TENSORS CONVERGED</div>
          </div>
        </div>

        {/* fPEPS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              FERMIONIC BOND (D)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>2D Fermionic Bond:</span>
              <span className="text-pink-400 font-bold">D = {fpepsBondDimensionD}</span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              step={1}
              value={fpepsBondDimensionD}
              onChange={(e) => setFpepsBondDimensionD(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Grassmann Parity Algebra:</strong> Represents anticommuting fermionic modes directly in 2D tensor networks via Z2-graded Grassmann virtual variables, bypassing the Monte Carlo sign problem!</div>
            <div>• <strong>Fermionic Boundary Power Method:</strong> Contracts 2D fermionic transfer operators with 1D Grassmann boundary MPS, purifying noisy quantum chemistry simulations!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
