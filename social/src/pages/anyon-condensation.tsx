import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Network, Layers
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AnyonCondensation() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [condensingAnyonSpecies, setCondensingAnyonSpecies] = useState<'Electric_Charge_e' | 'Magnetic_Flux_m'>('Electric_Charge_e');
  const [condensateDensityFraction, setCondensateDensityFraction] = useState(0.0); // 0.0 -> 1.0
  const [isCondensing, setIsCondensing] = useState(false);
  const [groundStateDegeneracy, setGroundStateDegeneracy] = useState(4); // 4 (Torus Z2) -> 1 (Trivial condensate)

  const animFrameRef = useRef<number | null>(null);

  const triggerAnyonCondensation = (species: 'Electric_Charge_e' | 'Magnetic_Flux_m') => {
    uiaudio.warp();
    setIsCondensing(true);
    setCondensingAnyonSpecies(species);

    setTimeout(() => {
      setIsCondensing(false);
      setCondensateDensityFraction(1.0);
      setGroundStateDegeneracy(1); // GSD lifts from 4 to 1
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setCondensateDensityFraction(0.0);
    setGroundStateDegeneracy(4);
    setIsCondensing(false);
  };

  // Anyon Condensation & Topological Phase Transition Canvas
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

      // Toric Code Square Lattice Grid (Left: 100 to 340)
      const gridSize = 4;
      const cellSize = 55;

      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          const gx = 110 + x * cellSize;
          const gy = cy - 85 + y * cellSize;

          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.strokeRect(gx, gy, cellSize, cellSize);

          // Condensing Anyon Excitations (Vertices = e, Plaquettes = m)
          const isCondensed = condensateDensityFraction > 0.5;
          const isElectric = condensingAnyonSpecies === 'Electric_Charge_e';

          ctx.fillStyle = isCondensed ? (isElectric ? '#06b6d4' : '#ec4899') : '#475569';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = (isCondensing || isCondensed) ? 18 : 0;

          ctx.beginPath();
          if (isElectric) {
            ctx.arc(gx, gy, isCondensed ? 7 : 3, 0, Math.PI * 2); // Vertex electric charge
          } else {
            ctx.arc(gx + cellSize / 2, gy + cellSize / 2, isCondensed ? 7 : 3, 0, Math.PI * 2); // Plaquette flux
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Condensation Projection Kernel (Center at 420, cy)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isCondensing ? 24 : 8;
      ctx.beginPath();
      ctx.arc(420, cy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CONDENSATION', 375, cy - 8);
      ctx.fillText('⟨' + (condensingAnyonSpecies === 'Electric_Charge_e' ? 'e' : 'm') + '⟩ ≠ 0', 395, cy + 12);

      // Condensed Topological Phase Output (Right: 530 to 650, cy - 45)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = condensateDensityFraction > 0.5 ? 24 : 6;
      ctx.strokeRect(520, cy - 55, 130, 90);
      ctx.fillRect(520, cy - 55, 130, 90);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PHASE TRANSITION', 530, cy - 30);
      ctx.fillText(condensateDensityFraction > 0.5 ? 'TRIVIAL VACUUM' : 'Z₂ TOPOLOGICAL ORDER', 525, cy - 10);
      ctx.fillText(`DEGENERACY = ${groundStateDegeneracy}`, 535, cy + 15);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ANYON CONDENSATION: SPECIES = ${condensingAnyonSpecies} | DENSITY = ${(condensateDensityFraction * 100).toFixed(0)}% | GSD = ${groundStateDegeneracy} (BAIS-SLINGERLAND)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [condensingAnyonSpecies, condensateDensityFraction, groundStateDegeneracy, isCondensing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Layers className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">
                ANYON CONDENSATION // TOPOLOGICAL PHASE TRANSITIONS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                BAIS & SLINGERLAND (AMSTERDAM)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Bosonic anyon condensation, confinement of dual fluxes & GSD lifting for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => triggerAnyonCondensation('Electric_Charge_e')}
            disabled={isCondensing || condensateDensityFraction > 0.5}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCondensing ? 'CONDENSING ANYONS...' : 'CONDENSE ELECTRIC CHARGES (e)'}</span>
          </button>

          {condensateDensityFraction > 0.5 && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
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
              <span className="text-emerald-400 font-bold">SPECIES: {condensingAnyonSpecies}</span>
              <span className="text-cyan-400 font-bold">DENSITY: {(condensateDensityFraction * 100).toFixed(0)}%</span>
              <span className="text-pink-400 font-bold">GSD: {groundStateDegeneracy}</span>
            </div>
            <div>STATUS: {condensateDensityFraction > 0.5 ? 'DUAL ANYONS CONFINED - TRIVIAL TOPOLOGY' : 'DECONFINED TOPOLOGICAL PHASE'}</div>
          </div>
        </div>

        {/* Anyon Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CONDENSATION REGIME
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dual Flux Confinement:</strong> When bosonic electric charges (e) condense, the non-trivial mutual braiding phases between e and magnetic flux (m) creates an energy string, permanently confining m anyons!</div>
            <div>• <strong>Topological Symmetry Breaking:</strong> Condensation lifts the 4-fold torus ground state degeneracy down to 1, cleanly driving the topological phase transition into a trivial vacuum state!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
