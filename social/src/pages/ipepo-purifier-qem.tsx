import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function IpepoPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pepoBondDimensionD, setPepoBondDimensionD] = useState(4); // D = 4 iPEPO bond
  const [thermalBetaInverseTemp, setThermalBetaInverseTemp] = useState(16.0); // β = 16.0 inverse temp
  const [isPurifyingIpepo, setIsPurifyingIpepo] = useState(false);
  const [purifiedIpepoFidelity, setPurifiedIpepoFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerIpepoPurification = () => {
    uiaudio.warp();
    setIsPurifyingIpepo(true);

    setTimeout(() => {
      setIsPurifyingIpepo(false);
      setPurifiedIpepoFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Infinite PEPO (iPEPO) Double-Layer Canvas
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

      // 2D Double-Layer PEPO Lattice (Left: 80 to 240, cy - 60 to cy + 60)
      const gridSize = 3;
      const spacing = 45;
      const originX = 90;
      const originY = cy - 45;

      // Draw Upper (Bra) & Lower (Ket) Double-Layer Bonds
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // Upper Layer Bonds (Cyan)
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          if (c < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + spacing - 3, y - 3); ctx.stroke();
          }
          if (r < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x - 3, y + spacing - 3); ctx.stroke();
          }

          // Lower Layer Bonds (Pink)
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          if (c < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + spacing + 3, y + 3); ctx.stroke();
          }
          if (r < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 3, y + spacing + 3); ctx.stroke();
          }

          // Inter-layer Vertical Physical Contraction Link (Amber)
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3);
          ctx.stroke();

          // Upper Node
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath(); ctx.arc(x - 3, y - 3, 5, 0, Math.PI * 2); ctx.fill();

          // Lower Node
          ctx.fillStyle = '#ec4899';
          ctx.beginPath(); ctx.arc(x + 3, y + 3, 5, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D iPEPO DOUBLE LAYER (D=4)', 65, cy + 90);

      // iPEPO Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isPurifyingIpepo ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('iPEPO PURIFIER', 325, cy - 12);
      ctx.fillText('exp(-βH) GIBBS DENSITY', 302, cy + 8);

      // Purified Thermal Density Matrix Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingIpepo ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FINITE-T 2D DENSITY ρ', 490, cy - 35);
      ctx.fillText('NON-ABELIAN THERMAL QEM', 480, cy - 10);
      ctx.fillText(`iPEPO FIDELITY = ${(purifiedIpepoFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `iPEPO THERMAL QEM: PEPO BOND D = ${pepoBondDimensionD} | INVERSE TEMP β = ${thermalBetaInverseTemp.toFixed(1)} | FIDELITY = ${(purifiedIpepoFidelity * 100).toFixed(2)}% (VERSTRAETE, CIRAC & SCHUCH)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pepoBondDimensionD, thermalBetaInverseTemp, purifiedIpepoFidelity, isPurifyingIpepo]);

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
                iPEPO THERMAL QEM // 2D GIBBS OPERATOR PURIFIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                VERSTRAETE, CIRAC & SCHUCH (VIENNA, MPQ & PERIMETER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D infinite Projected Entangled Pair Operator thermal Gibbs state purifier for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerIpepoPurification}
            disabled={isPurifyingIpepo}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingIpepo ? 'CONTRACTING 2D GIBBS OPERATORS...' : 'PURIFY VIA iPEPO'}</span>
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
              <span className="text-cyan-400 font-bold">PEPO BOND: D = {pepoBondDimensionD}</span>
              <span className="text-pink-400 font-bold">INVERSE TEMP: β = {thermalBetaInverseTemp.toFixed(1)}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedIpepoFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: 2D THERMAL GIBBS DENSITY MATRIX CONTRACTED</div>
          </div>
        </div>

        {/* iPEPO Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              INVERSE TEMP (β)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Cooling Level:</span>
              <span className="text-cyan-400 font-bold">β = {thermalBetaInverseTemp.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={4.0}
              max={32.0}
              step={1.0}
              value={thermalBetaInverseTemp}
              onChange={(e) => setThermalBetaInverseTemp(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Infinite 2D Density Operator:</strong> Represents mixed states directly as a 2D network of operator tensors with independent physical bra and ket indices!</div>
            <div>• <strong>Non-Abelian Thermal Error Mitigation:</strong> Directly filters finite-temperature thermal noise in 2D non-Abelian anyon topological codes!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
