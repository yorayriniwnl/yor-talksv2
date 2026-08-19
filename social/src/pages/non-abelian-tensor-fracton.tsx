import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Disc
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function NonAbelianTensorFracton() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gaugeGroupStructure, setGaugeGroupStructure] = useState<'SU(2)' | 'SO(3)'>('SU(2)');
  const [fluxRingCirculationK, setFluxRingCirculationK] = useState(2); // k = 2 flux ring quantum
  const [isBraidingRings, setIsBraidingRings] = useState(false);
  const [braidingMatrixFidelity, setBraidingMatrixFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerFluxBraiding = () => {
    uiaudio.warp();
    setIsBraidingRings(true);

    setTimeout(() => {
      setIsBraidingRings(false);
      setBraidingMatrixFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Non-Abelian Tensor Fracton & Braided Flux Loop Rings Canvas
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

      // Two Linked Non-Abelian Magnetic Flux Rings (Left: 120 to 280)
      const r1x = 170 + (isBraidingRings ? Math.sin(time * 3) * 20 : 0);
      const r2x = 240 + (isBraidingRings ? -Math.sin(time * 3) * 20 : 0);

      // Ring 1 (Vertical-ish Red/Pink Torus)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isBraidingRings ? 22 : 6;
      ctx.beginPath();
      ctx.ellipse(r1x, cy - 15, 36, 60, 0.2, 0, Math.PI * 2);
      ctx.stroke();

      // Ring 2 (Horizontal-ish Cyan Torus - Interlinked)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isBraidingRings ? 22 : 6;
      ctx.beginPath();
      ctx.ellipse(r2x, cy - 15, 60, 36, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Immobile Non-Abelian Fracton Core Inside Ring 1 (at r1x, cy - 15)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(r1x, cy - 15, 7, 0, Math.PI * 2);
      ctx.fill();

      // Non-Abelian Tensor Commutator Kernel (Center at 380, cy - 15)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isBraidingRings ? 24 : 8;
      ctx.beginPath();
      ctx.arc(380, cy - 15, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${gaugeGroupStructure} TENSOR`, 342, cy - 22);
      ctx.fillText('[E_ij^a, E_kl^b] ≠ 0', 328, cy - 2);

      // Non-Abelian Braiding Matrix Logic Gate Output (Right at 530, cy - 15)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isBraidingRings ? 24 : 6;
      ctx.strokeRect(480, cy - 70, 160, 110);
      ctx.fillRect(480, cy - 70, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NON-ABELIAN BRAID GATE', 490, cy - 45);
      ctx.fillText('UNIVERSAL TOPOLOGICAL QC', 486, cy - 20);
      ctx.fillText(`UNITARY FIDELITY = ${(braidingMatrixFidelity * 100).toFixed(2)}%`, 488, cy + 10);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `NON-ABELIAN TENSOR FRACTON: GAUGE = ${gaugeGroupStructure} | FLUX RING k = ${fluxRingCirculationK} | BRAIDING FIDELITY = ${(braidingMatrixFidelity * 100).toFixed(2)}% (VIJAY & PREATKO)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gaugeGroupStructure, fluxRingCirculationK, braidingMatrixFidelity, isBraidingRings]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Disc className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
                NON-ABELIAN TENSOR FRACTON // BRAIDED FLUX RINGS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                VIJAY, HAAH, FU & PRETKO (HARVARD & MIT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Higher-rank non-Abelian tensor gauge theory & 3D topological flux ring braiding for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFluxBraiding}
            disabled={isBraidingRings}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBraidingRings ? 'BRAIDING FLUX RINGS...' : 'EXECUTE NON-ABELIAN BRAID'}</span>
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
              <span className="text-pink-400 font-bold">GROUP: {gaugeGroupStructure}</span>
              <span className="text-cyan-400 font-bold">FLUX QUANTUM: k = {fluxRingCirculationK}</span>
              <span className="text-emerald-400 font-bold">BRAID FIDELITY: {(braidingMatrixFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-ABELIAN TOPOLOGICAL CHARGE CONSERVED</div>
          </div>
        </div>

        {/* Non-Abelian Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              GAUGE GROUP
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Lie Algebra:</span>
              <span className="text-pink-400 font-bold">{gaugeGroupStructure}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setGaugeGroupStructure('SU(2)')}
                className={cn(
                  "py-2 rounded-lg font-bold transition-all",
                  gaugeGroupStructure === 'SU(2)' ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                SU(2)
              </button>
              <button
                onClick={() => setGaugeGroupStructure('SO(3)')}
                className={cn(
                  "py-2 rounded-lg font-bold transition-all",
                  gaugeGroupStructure === 'SO(3)' ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                )}
              >
                SO(3)
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Non-Abelian Rank-2 Tensor Symmetry:</strong> The non-commuting color components produce non-Abelian fractonic point charges that transform projectively under spatial rotations!</div>
            <div>• <strong>Topological Flux Ring Braiding:</strong> Intertwining 1D magnetic flux loops in 3D spacetime implements exact non-Abelian quantum logic gates with topological error suppression!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
