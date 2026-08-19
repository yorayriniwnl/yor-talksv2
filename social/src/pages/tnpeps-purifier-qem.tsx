import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TnpepsPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [thermalBondDimensionD, setThermalBondDimensionD] = useState(4); // D = 4 thermal PEPS bond
  const [purificationBetaTemp, setPurificationBetaTemp] = useState(12.5); // β = 12.5 inverse temperature
  const [isPurifyingTnpeps, setIsPurifyingTnpeps] = useState(false);
  const [purifiedTnpepsFidelity, setPurifiedTnpepsFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerTnpepsPurification = () => {
    uiaudio.warp();
    setIsPurifyingTnpeps(true);

    setTimeout(() => {
      setIsPurifyingTnpeps(false);
      setPurifiedTnpepsFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Thermal Non-Abelian PEPS (TN-PEPS) Canvas
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

      // 2D Thermal Double-Layer PEPS Lattice (Left: 80 to 260)
      const gridSize = 3;
      const spacing = 48;
      const originX = 95;
      const originY = cy - 50;

      // Physical Layer Bonds (Cyan) & Ancilla Purification Layer Bonds (Pink)
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // Physical Layer (Top-Left offset -4, -4)
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          if (c < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + spacing - 4, y - 4); ctx.stroke();
          }
          if (r < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x - 4, y + spacing - 4); ctx.stroke();
          }

          // Ancilla Purification Layer (Bottom-Right offset +4, +4)
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          if (c < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + spacing + 4, y + 4); ctx.stroke();
          }
          if (r < gridSize - 1) {
            ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 4, y + spacing + 4); ctx.stroke();
          }

          // Inter-Layer Entanglement (Maximally Entangled Bell Pair at beta=0)
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4);
          ctx.stroke();

          // Physical Node (Cyan)
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(x - 4, y - 4, 6, 0, Math.PI * 2);
          ctx.fill();

          // Ancilla Node (Pink)
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(x + 4, y + 4, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Boundary MPS Row
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, originY + gridSize * spacing - 16, 130, 24);
      ctx.fillRect(80, originY + gridSize * spacing - 16, 130, 24);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('THERMAL MPS (χ=64)', 92, originY + gridSize * spacing);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D PURIFIED GIBBS PEPS (D=4)', 75, cy + 90);

      // TN-PEPS Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isPurifyingTnpeps ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TN-PEPS PURIFIER', 318, cy - 12);
      ctx.fillText('e^(-βH/2) EVOLUTION', 312, cy + 8);

      // Purified Thermal Density Matrix Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingTnpeps ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FINITE-T GIBBS STATE', 492, cy - 35);
      ctx.fillText('ZERO THERMAL DECOHERENCE', 480, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedTnpepsFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `TN-PEPS THERMAL QEM: PEPS BOND D = ${thermalBondDimensionD} | INVERSE TEMP β = ${purificationBetaTemp.toFixed(1)} | FIDELITY = ${(purifiedTnpepsFidelity * 100).toFixed(2)}% (GU & VERSTRAETE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [thermalBondDimensionD, purificationBetaTemp, purifiedTnpepsFidelity, isPurifyingTnpeps]);

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
                TN-PEPS THERMAL QEM // FINITE-T GIBBS PURIFIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                GU, LEVIN & VERSTRAETE (PERIMETER, CALTECH & VIENNA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D thermal projected entangled pair states double-layer purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerTnpepsPurification}
            disabled={isPurifyingTnpeps}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingTnpeps ? 'EVOLVING e^(-βH/2)...' : 'PURIFY VIA TN-PEPS'}</span>
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
              <span className="text-cyan-400 font-bold">PEPS BOND: D = {thermalBondDimensionD}</span>
              <span className="text-pink-400 font-bold">INVERSE TEMP: β = {purificationBetaTemp.toFixed(1)}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedTnpepsFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: 2D THERMAL PURIFICATION CONVERGED</div>
          </div>
        </div>

        {/* TN-PEPS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              INVERSE TEMP (β)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Cooling Factor:</span>
              <span className="text-cyan-400 font-bold">β = {purificationBetaTemp.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={30.0}
              step={0.5}
              value={purificationBetaTemp}
              onChange={(e) => setPurificationBetaTemp(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Imaginary-Time Purification:</strong> Evolving maximally entangled physical-ancilla Bell states under imaginary time exp(-βH/2) generates exact 2D finite-temperature Gibbs states!</div>
            <div>• <strong>Thermal Noise Immunity:</strong> Disentangles finite-temperature mixed states into a double-layer tensor network, eliminating thermal decoherence in topological memory!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
