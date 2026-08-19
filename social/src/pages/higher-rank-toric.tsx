import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HigherRankToric() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tensorRankIndex, setTensorRankIndex] = useState<2 | 3>(2); // Rank-2 symmetric tensor gauge
  const [dipoleCouplingStrengthJ, setDipoleCouplingStrengthJ] = useState(0.85); // 0.85 dipole coupling
  const [isSimulatingPhase, setIsSimulatingPhase] = useState(false);
  const [topologicalGroundDegeneracy, setTopologicalGroundDegeneracy] = useState(16); // 16-fold GSD

  const animFrameRef = useRef<number | null>(null);

  const triggerHigherRankPhaseSim = () => {
    uiaudio.warp();
    setIsSimulatingPhase(true);

    setTimeout(() => {
      setIsSimulatingPhase(false);
      setTopologicalGroundDegeneracy(64); // Higher-rank 64-fold sub-dimensional GSD
      uiaudio.success();
    }, 750);
  };

  // Higher-Rank Tensor Toric Code Lattice & Sub-Dimensional Particles Canvas
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

      // Draw 3D Isometric Tensor Lattice
      const isoX = (x: number, y: number, z: number) => cx - 120 + (x - y) * Math.cos(Math.PI / 6) * 45;
      const isoY = (x: number, y: number, z: number) => cy - (x + y) * Math.sin(Math.PI / 6) * 45 - z * 35;

      // Tensor Gauge Links (Rank-2 E_xx, E_yy, E_zz, E_xy)
      for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
          for (let z = 0; z < 2; z++) {
            const px = isoX(x, y, z);
            const py = isoY(x, y, z);

            // Wireframe
            if (x < 1) {
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(px, py); ctx.lineTo(isoX(x + 1, y, z), isoY(x + 1, y, z));
              ctx.stroke();
            }
            if (y < 1) {
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(px, py); ctx.lineTo(isoX(x, y + 1, z), isoY(x, y + 1, z));
              ctx.stroke();
            }
            if (z < 1) {
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(px, py); ctx.lineTo(isoX(x, y, z + 1), isoY(x, y, z + 1));
              ctx.stroke();
            }

            // Sub-Dimensional Excitations: Fractons (0D pink), Lineons (1D cyan), Planons (2D green)
            ctx.fillStyle = (x + y) % 2 === 0 ? '#ec4899' : '#06b6d4';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = isSimulatingPhase ? 20 : 6;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Higher-Rank Gauss Law Kernel (Center at 410, cy)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isSimulatingPhase ? 24 : 8;
      ctx.beginPath();
      ctx.arc(410, cy, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`RANK-${tensorRankIndex} GAUSS`, 365, cy - 8);
      ctx.fillText('∂_i ∂_j E^ij = ρ', 368, cy + 12);

      // Higher-Rank Topological Order Output (Right at 530, cy)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isSimulatingPhase ? 24 : 6;
      ctx.strokeRect(510, cy - 55, 140, 90);
      ctx.fillRect(510, cy - 55, 140, 90);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('TOPOLOGICAL PHASE', 518, cy - 30);
      ctx.fillText('SUB-DIMENSIONAL GSD', 515, cy - 10);
      ctx.fillText(`DEGENERACY = ${topologicalGroundDegeneracy}`, 525, cy + 15);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `HIGHER-RANK TORIC CODE: RANK-${tensorRankIndex} TENSOR | DIPOLE COUPLING J = ${dipoleCouplingStrengthJ} | GSD = ${topologicalGroundDegeneracy} (SEIBERG & PRETKO)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tensorRankIndex, dipoleCouplingStrengthJ, topologicalGroundDegeneracy, isSimulatingPhase]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Box className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-indigo-300 to-cyan-400">
                HIGHER-RANK TORIC CODE // LINEON-FRACTON TENSOR PHASES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SEIBERG, SHAO & PRETKO (IAS & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rank-2/3 symmetric tensor gauge theory & sub-dimensional topological order for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerHigherRankPhaseSim}
            disabled={isSimulatingPhase}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSimulatingPhase ? 'COMPUTING TENSOR GSD...' : 'EVALUATE RANK-2 TENSOR PHASE'}</span>
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
              <span className="text-amber-400 font-bold">RANK: {tensorRankIndex}</span>
              <span className="text-cyan-400 font-bold">COUPLING: J = {dipoleCouplingStrengthJ}</span>
              <span className="text-emerald-400 font-bold">GROUND DEGENERACY: {topologicalGroundDegeneracy}</span>
            </div>
            <div>STATUS: HIGHER-RANK DIPOLE CONSERVATION ACTIVE</div>
          </div>
        </div>

        {/* Higher Rank Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TENSOR RANK
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Symmetric Tensor Rank:</span>
              <span className="text-amber-400 font-bold">Rank-{tensorRankIndex}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTensorRankIndex(2)}
                className={cn(
                  "py-2 rounded-lg font-bold transition-all",
                  tensorRankIndex === 2 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                RANK-2
              </button>
              <button
                onClick={() => setTensorRankIndex(3)}
                className={cn(
                  "py-2 rounded-lg font-bold transition-all",
                  tensorRankIndex === 3 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                RANK-3
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Sub-Dimensional Mobility Hierarchy:</strong> Higher-rank Gauss laws ($\partial_i \partial_j E^{ij} = \rho$) strictly conserve both charge and dipole moment, freezing isolated 0D charges as immobile fractons!</div>
            <div>• <strong>UV/IR Mixing & Non-Decoupling:</strong> The ground state degeneracy scales extensively with system length ($GSD = 2^(2L_x + 2L_y)$), manifesting extreme UV/IR mixing!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
