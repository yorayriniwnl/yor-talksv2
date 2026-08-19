import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function BuresFisher() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [qubitCountN, setQubitCountN] = useState(10); // N = 10 entangled probes (GHZ state)
  const [entanglementState, setEntanglementState] = useState<'Coherent_SQL' | 'GHZ_Heisenberg'>('GHZ_Heisenberg');
  const [isMeasuring, setIsMeasuring] = useState(false);

  // Quantum Fisher Information: SQL = N, Heisenberg = N^2
  const qfi = entanglementState === 'GHZ_Heisenberg' ? Math.pow(qubitCountN, 2) : qubitCountN;

  // Quantum Cramér-Rao Bound (Phase Uncertainty delta theta): 1 / sqrt(QFI)
  const deltaTheta = +(1 / Math.sqrt(qfi)).toFixed(4);

  const runQuantumMetrology = () => {
    uiaudio.warp();
    setIsMeasuring(true);

    setTimeout(() => {
      setIsMeasuring(false);
      uiaudio.success();
    }, 700);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Compass className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                BURES METRIC // QUANTUM FISHER INFORMATION & HEISENBERG LIMIT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Δθ ≥ 1 / N (HEISENBERG SCALING)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Quantum Cramér-Rao bound & sub-shot-noise phase estimation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runQuantumMetrology}
            disabled={isMeasuring}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isMeasuring ? 'CALCULATING QUANTUM FISHER INFORMATION...' : 'ESTIMATE PHASE SENSITIVITY'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Metrology Analysis (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">QUANTUM CRAMÉR-RAO BOUND (QCRB)</span>
            <span className="text-cyan-400">QFI $\mathcal{F}_Q$: {qfi}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. PROBE STATE CONFIGURATION:</div>
              <div>• Probes: N = {qubitCountN} Photons / Ions</div>
              <div>• State: {entanglementState === 'GHZ_Heisenberg' ? 'Maximally Entangled GHZ State (|00...0⟩ + |11...1⟩)/√2' : 'Uncorrelated Coherent State'}</div>
              <div className="text-amber-400">Scaling: {entanglementState === 'GHZ_Heisenberg' ? 'Heisenberg Limit 1/N' : 'Standard Quantum Limit 1/√N'}</div>
            </div>

            <div className="p-4 bg-zinc-950 rounded-xl border border-pink-500/20 space-y-2 flex flex-col justify-center items-center text-center">
              <div className="text-[11px] text-pink-400 font-bold">2. MINIMUM PHASE UNCERTAINTY Δθ:</div>
              <div className="text-3xl font-black text-cyan-300">
                {deltaTheta} rad
              </div>
              <div className="text-[10px] text-zinc-400">Ultimate Precision Bound: Δθ ≥ 1 / √$\mathcal{F}_Q$</div>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Quantum Advantage: Entangling N probes increases Quantum Fisher Information from N to N², enabling a √N enhancement in phase sensitivity beyond the classical shot noise limit (SQL)!</span>
          </div>
        </div>

        {/* Metrology Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PROBE SELECTION
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Qubit Probes (N):</span>
                <span className="text-cyan-400 font-bold">{qubitCountN}</span>
              </div>
              <input
                type="range"
                min={2}
                max={50}
                step={2}
                value={qubitCountN}
                onChange={(e) => setQubitCountN(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setEntanglementState('GHZ_Heisenberg')}
                className={cn(
                  "w-full p-2.5 rounded-xl border text-left transition-all",
                  entanglementState === 'GHZ_Heisenberg' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">GHZ Entangled (Heisenberg)</div>
                <div className="text-[10px] text-zinc-400">QFI = N² // Δθ ~ 1/N</div>
              </button>

              <button
                onClick={() => setEntanglementState('Coherent_SQL')}
                className={cn(
                  "w-full p-2.5 rounded-xl border text-left transition-all",
                  entanglementState === 'Coherent_SQL' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">Uncorrelated (Standard SQL)</div>
                <div className="text-[10px] text-zinc-400">QFI = N // Δθ ~ 1/√N</div>
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">BURES DISTANCE:</span>
            <div>• The Bures metric on density matrices induces the Quantum Fisher Information as its Riemannian metric tensor, quantifying statistical distinguishability on the quantum state manifold!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
