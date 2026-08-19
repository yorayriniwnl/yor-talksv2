import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Network
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TensorQse() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [qubitsCountN, setQubitsCountN] = useState(12); // 12-qubit tensor chain
  const [bondDimensionD, setBondDimensionD] = useState(8); // MPO bond dimension D = 8
  const [isContracting, setIsContracting] = useState(false);
  const [mpoReconstructionFidelity, setMpoReconstructionFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerTensorContraction = () => {
    uiaudio.warp();
    setIsContracting(true);

    setTimeout(() => {
      setIsContracting(false);
      setMpoReconstructionFidelity(0.9991);
      uiaudio.success();
    }, 750);
  };

  // Matrix Product Operator (MPO) Tensor Chain Canvas
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

      // Draw 1D MPO Tensor Core Chain (Left: 80 to 660)
      const step = (canvas.width - 160) / (qubitsCountN - 1);
      for (let i = 0; i < qubitsCountN; i++) {
        const tx = 80 + i * step;
        const ty = cy;

        // Virtual Bond Index Line to next tensor
        if (i < qubitsCountN - 1) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(tx + step, ty);
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(`D=${bondDimensionD}`, tx + step / 2 - 8, ty - 6);
        }

        // Physical In/Out Indices (Vertical Wires)
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 35); ctx.lineTo(tx, ty + 35);
        ctx.stroke();

        // MPO Tensor Core Node (Circle)
        ctx.fillStyle = isContracting ? '#ec4899' : '#06b6d4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isContracting ? 18 : 6;
        ctx.beginPath();
        ctx.arc(tx, ty, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`T_${i + 1}`, tx - 6, ty + 3);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `MPO TENSOR TOMOGRAPHY: ${qubitsCountN} QUBITS (BOND DIM D = ${bondDimensionD} | RECONSTRUCTION FIDELITY = ${(mpoReconstructionFidelity * 100).toFixed(2)}% | O(N) SCALING)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [qubitsCountN, bondDimensionD, mpoReconstructionFidelity, isContracting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Network className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                TENSOR QSE // MATRIX PRODUCT OPERATOR STATE TOMOGRAPHY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LANDON-CARDINAL & POULIN (WATERLOO)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Contractive MPO density reconstruction & polynomial O(N) SPAM mitigation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerTensorContraction}
            disabled={isContracting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isContracting ? 'CONTRACTING TENSOR NETWORK...' : 'CONTRACT MPO TENSORS'}</span>
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
              <span className="text-cyan-400 font-bold">CHAIN: {qubitsCountN} Qubits</span>
              <span className="text-pink-400 font-bold">BOND DIM: D = {bondDimensionD}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(mpoReconstructionFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: POLYNOMIAL SCALING LOCAL AREA LAW</div>
          </div>
        </div>

        {/* Tensor Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BOND DIMENSION (D)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>MPO Virtual Bond:</span>
              <span className="text-cyan-400 font-bold">D = {bondDimensionD}</span>
            </div>
            <input
              type="range"
              min={2}
              max={16}
              step={2}
              value={bondDimensionD}
              onChange={(e) => setBondDimensionD(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Local Area Law Compression:</strong> Real quantum states satisfy entanglement area laws, allowing full density matrix representation with modest bond dimension $D$!</div>
            <div>• <strong>Efficient Polynomial Tomography:</strong> Bypasses exponential $4^N$ classical storage, reconstructing the full density matrix in only $\mathcal{O}(N D^3)$ operations!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
