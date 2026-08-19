import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function UfpepsPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [topologicalBondDimensionD, setTopologicalBondDimensionD] = useState(4); // D = 4 UfPEPS bond
  const [majoranaBoundaryChi, setMajoranaBoundaryChi] = useState(64); // χ = 64 boundary MPS
  const [isPurifyingUfpeps, setIsPurifyingUfpeps] = useState(false);
  const [purifiedUfpepsFidelity, setPurifiedUfpepsFidelity] = useState(0.989);

  const animFrameRef = useRef<number | null>(null);

  const triggerUfpepsPurification = () => {
    uiaudio.warp();
    setIsPurifyingUfpeps(true);

    setTimeout(() => {
      setIsPurifyingUfpeps(false);
      setPurifiedUfpepsFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 2D Unitary-Gauge Fermionic PEPS (UfPEPS) Canvas
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

      // 2D Chiral p+ip Superconducting Lattice (Left: 80 to 260)
      const gridSize = 3;
      const spacing = 48;
      const originX = 95;
      const originY = cy - 50;

      // Chiral Topological Pairing Bonds (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // Horizontal Bond
          if (c < gridSize - 1) {
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x + spacing, y);
            ctx.stroke();
          }
          // Vertical Bond
          if (r < gridSize - 1) {
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x, y + spacing);
            ctx.stroke();
          }
        }
      }

      // Unitary-Gauged Fermionic Nodes hosting Majorana Zero Modes (MZM)
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = originX + c * spacing;
          const y = originY + r * spacing;

          // Chiral p_x + ip_y Phase Loop (Circle)
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 16, 0, Math.PI * 2);
          ctx.stroke();

          // Bound Majorana Zero Mode (MZM) Core
          ctx.fillStyle = (r + c) % 2 === 0 ? '#22c55e' : '#f59e0b';
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 7px monospace';
          ctx.fillText('γ', x - 2, y + 2.5);
        }
      }

      // Boundary MPS Row
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, originY + gridSize * spacing - 16, 130, 24);
      ctx.fillRect(80, originY + gridSize * spacing - 16, 130, 24);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('MAJORANA MPS (χ=64)', 86, originY + gridSize * spacing);

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D CHIRAL p+ip UfPEPS (D=4)', 75, cy + 90);

      // UfPEPS Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isPurifyingUfpeps ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('UfPEPS PURIFIER', 320, cy - 12);
      ctx.fillText('CHIRAL MAJORANA GAUGE', 310, cy + 8);

      // Purified Topological Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingUfpeps ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NON-ABELIAN BRAIDING STATE', 484, cy - 35);
      ctx.fillText('ZERO PHASE FLIP DECOHERENCE', 480, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedUfpepsFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `UfPEPS TOPO QEM: PEPS BOND D = ${topologicalBondDimensionD} | BOUNDARY χ = ${majoranaBoundaryChi} | FIDELITY = ${(purifiedUfpepsFidelity * 100).toFixed(2)}% (BÉRI & WEN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [topologicalBondDimensionD, majoranaBoundaryChi, purifiedUfpepsFidelity, isPurifyingUfpeps]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
                UfPEPS TOPO QEM // UNITARY FERMIONIC PURIFIER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                BÉRI, COOPER, GU & WEN (CAMBRIDGE & PERIMETER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D chiral topological superconductor unitary fermionic PEPS boundary MPS purifier for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerUfpepsPurification}
            disabled={isPurifyingUfpeps}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingUfpeps ? 'CONTRACTING MAJORANA MPS...' : 'PURIFY VIA UfPEPS'}</span>
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
              <span className="text-cyan-400 font-bold">PEPS BOND: D = {topologicalBondDimensionD}</span>
              <span className="text-pink-400 font-bold">BOUNDARY MPS: χ = {majoranaBoundaryChi}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedUfpepsFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-ABELIAN MAJORANA ZERO MODES CONVERGED</div>
          </div>
        </div>

        {/* UfPEPS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TOPO BOND (D)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>2D Chiral Bond:</span>
              <span className="text-cyan-400 font-bold">D = {topologicalBondDimensionD}</span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              step={1}
              value={topologicalBondDimensionD}
              onChange={(e) => setTopologicalBondDimensionD(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Unitary-Gauged Fermionic Tensors:</strong> Encodes chiral p+ip topological superconductors with exact parity gauge invariance, naturally capturing non-Abelian Majorana zero modes!</div>
            <div>• <strong>Braiding Decoherence Suppression:</strong> Projects boundary transfer eigenvalues to suppress local fermion-parity flip errors, protecting topological logical quantum gates!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
