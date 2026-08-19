import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Layers
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function QsvtStudio() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [polynomialDegreeD, setPolynomialDegreeD] = useState(7); // d = 7 polynomial transformation
  const [qsvtApplication, setQsvtApplication] = useState<'MatrixInversion_HHL' | 'HamiltonianSimulation' | 'PhaseEstimation'>('MatrixInversion_HHL');
  const [blockEncodingError, setBlockEncodingError] = useState('2.4e-6');
  const [isTransforming, setIsTransforming] = useState(false);

  const runQsvtTransformation = () => {
    uiaudio.warp();
    setIsTransforming(true);

    setTimeout(() => {
      setIsTransforming(false);
      uiaudio.success();
    }, 900);
  };

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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                QSVT STUDIO // QUANTUM SINGULAR VALUE TRANSFORMATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                UNIFIED GRAND FRAMEWORK (GILYÉN 2019)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Unitary block-encoding & polynomial singular value transformation P(A) for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runQsvtTransformation}
            disabled={isTransforming}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTransforming ? 'APPLYING PROJECTOR ROTATIONS Π_Φ...' : 'EXECUTE QSVT CIRCUIT'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* QSVT Circuit & Polynomial Representation (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">QSVT BLOCK-ENCODING & ALTERNATING PROJECTORS</span>
            <span className="text-cyan-400">APP: {qsvtApplication}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Block Encoding Matrix */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. UNITARY BLOCK-ENCODING:</div>
              <div className="text-sm font-bold text-white">U_A = [ A, · ; ·, · ]</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Encodes non-unitary matrix A in top-left block of larger unitary U_A. A = (⟨0| ⊗ I) U_A (|0⟩ ⊗ I).
              </p>
            </div>

            {/* Alternating Projector Sequence */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-indigo-500/20 space-y-2">
              <div className="text-[11px] text-indigo-400 font-bold">2. POLYNOMIAL SEQUENCE P(A):</div>
              <div className="text-sm font-bold text-indigo-300">U_Φ = ∏_{k=1}^d (e^iφ_k Π · U_A)</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Applies degree-d polynomial P(σ) to every singular value σ of matrix A via phase angles Φ.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Grand Unified Framework Active: Subsumes Grover Search, Phase Estimation, HHL Inversion, and Hamiltonian Simulation as special polynomial cases of QSVT! Block error: {blockEncodingError}.</span>
          </div>
        </div>

        {/* Application Selection (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ALGORITHM SPECIALIZATION
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => setQsvtApplication('MatrixInversion_HHL')}
              className={cn("w-full p-3 rounded-xl border text-left transition-all", qsvtApplication === 'MatrixInversion_HHL' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
            >
              <div className="font-bold">Matrix Inversion (A^-1)</div>
              <div className="text-[10px] text-zinc-400">Odd polynomial approximating 1/x (HHL)</div>
            </button>

            <button
              onClick={() => setQsvtApplication('HamiltonianSimulation')}
              className={cn("w-full p-3 rounded-xl border text-left transition-all", qsvtApplication === 'HamiltonianSimulation' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
            >
              <div className="font-bold">Hamiltonian Simulation (e^-iHt)</div>
              <div className="text-[10px] text-zinc-400">Jacobi-Anger Bessel expansion</div>
            </button>

            <button
              onClick={() => setQsvtApplication('PhaseEstimation')}
              className={cn("w-full p-3 rounded-xl border text-left transition-all", qsvtApplication === 'PhaseEstimation' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
            >
              <div className="font-bold">Eigenvalue Filtering</div>
              <div className="text-[10px] text-zinc-400">Step function polynomial projector</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">QSVT ELEGANCE:</span>
            <div>• Discovered by Gilyén, Su, Low, and Wiebe in 2019, QSVT proved that nearly all known quantum algorithms are simply different polynomial transformations of matrix singular values!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
