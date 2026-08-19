import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FermionicShadows() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [shadowSnapshotsCount, setShadowSnapshotsCount] = useState(500); // 500 classical shadow snapshots
  const [fermionicModesN, setFermionicModesN] = useState(8); // 8-mode fermionic orbital system
  const [isSampling, setIsSampling] = useState(false);
  const [reconstructedRdmAccuracy, setReconstructedRdmAccuracy] = useState(0.982);

  const animFrameRef = useRef<number | null>(null);

  const runFermionicShadowTomography = () => {
    uiaudio.warp();
    setIsSampling(true);

    setTimeout(() => {
      setIsSampling(false);
      setReconstructedRdmAccuracy(+(0.97 + (shadowSnapshotsCount / 2000) * 0.028).toFixed(4));
      uiaudio.success();
    }, 750);
  };

  // Fermionic Classical Shadows Randomized Matchgate Canvas
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

      // Fermionic Mode Wires (8 Orbitals from Top to Bottom)
      for (let i = 0; i < fermionicModesN; i++) {
        const y = 80 + i * 36;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(80, y); ctx.lineTo(canvas.width - 80, y);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`MODE c_${i + 1}`, 35, y + 3);

        // Random Matchgate Beam-Splitter Unitaries
        for (let g = 0; g < 3; g++) {
          const gx = 160 + g * 120;
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.fillRect(gx, y - 8, 30, 16);
          ctx.strokeRect(gx, y - 8, 30, 16);
        }
      }

      // Reconstructed 2-RDM Correlation Heatmap Matrix (Right at 540, cy - 70)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(520, cy - 75, 150, 150);
      ctx.fillRect(520, cy - 75, 150, 150);

      // 4x4 2-RDM blocks
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const val = 0.3 + 0.6 * Math.sin(r * 2 + c * 3 + time);
          ctx.fillStyle = `rgba(34, 197, 94, ${val})`;
          ctx.fillRect(530 + c * 32, cy - 65 + r * 32, 28, 28);
        }
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('2-RDM MATRIX Γ_pqrs', 530, cy - 85);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FERMIONIC SHADOWS: ${shadowSnapshotsCount} SAMPLES | 2-RDM ACCURACY = ${(reconstructedRdmAccuracy * 100).toFixed(2)}% (O(k² log M) SCALING)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [shadowSnapshotsCount, fermionicModesN, reconstructedRdmAccuracy, isSampling]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Eye className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                FERMIONIC SHADOWS // MATCHGATE CLASSICAL TOMOGRAPHY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ZHAO & RUBIN (GOOGLE QUANTUM AI)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Randomized Gaussian Matchgate circuits & O(k² log M) k-RDM reconstruction for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runFermionicShadowTomography}
            disabled={isSampling}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSampling ? 'SAMPLING MATCHGATE SHADOWS...' : 'GENERATE CLASSICAL SHADOWS'}</span>
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
              <span className="text-cyan-400 font-bold">SNAPSHOTS: {shadowSnapshotsCount}</span>
              <span className="text-pink-400 font-bold">MODES: {fermionicModesN}</span>
              <span className="text-emerald-400 font-bold">2-RDM ACCURACY: {(reconstructedRdmAccuracy * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: UNCOMMUTING OBSERVABLES PREDICTED SIMULTANEOUSLY</div>
          </div>
        </div>

        {/* Fermionic Shadows Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SHADOW SNAPSHOTS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Random Matchgate Shots:</span>
              <span className="text-cyan-400 font-bold">{shadowSnapshotsCount}</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={100}
              value={shadowSnapshotsCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setShadowSnapshotsCount(val);
                setReconstructedRdmAccuracy(+(0.97 + (val / 2000) * 0.028).toFixed(4));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Fermionic Gaussian Symmetry:</strong> Applying random Matchgate unitaries allows measuring all single-particle and two-particle density matrices without state destruction!</div>
            <div>• <strong>Logarithmic Scaling:</strong> Predicting thousands of non-commuting electronic energy terms requires only $\mathcal{O}(k^2 \log M)$ quantum measurements!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
