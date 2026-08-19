import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, GitFork
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function WStateStudio() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [stateType, setStateType] = useState<'W_State' | 'GHZ_State'>('W_State');
  const [qubitALost, setQubitALost] = useState(false);
  const [residualConcurrency, setResidualConcurrency] = useState(0.667); // 2/3 concurrency remaining for W state

  const loseQubitA = () => {
    uiaudio.warp();
    setQubitALost(true);

    if (stateType === 'W_State') {
      setResidualConcurrency(0.667); // W state retains 2/3 entanglement between B and C!
    } else {
      setResidualConcurrency(0.000); // GHZ state completely collapses to a classical separable mixture!
    }
  };

  const handleReset = () => {
    uiaudio.click();
    setQubitALost(false);
    setResidualConcurrency(stateType === 'W_State' ? 0.667 : 1.000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <GitFork className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                TRIPARTITE W-STATE // ROBUST QUANTUM ENTANGLEMENT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SLOCC EQUIVALENCE (DÜR, VIDAL, CIRAC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Persistence of bipartite entanglement under single-particle loss for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={loseQubitA}
            disabled={qubitALost}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{qubitALost ? 'QUBIT A TRACED OUT' : 'TRACE OUT / LOSE QUBIT A'}</span>
          </button>

          {qubitALost && (
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* W-State Analysis (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">REDUCED DENSITY MATRIX ρ_BC (QUBITS B & C)</span>
            <span className="text-cyan-400">CONCURRENCE C(ρ_BC): {residualConcurrency.toFixed(3)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. STATE PREPARATION:</div>
              <div>• Target State: {stateType === 'W_State' ? '|W⟩ = (|001⟩ + |010⟩ + |100⟩)/√3' : '|GHZ⟩ = (|000⟩ + |111⟩)/√2'}</div>
              <div>• SLOCC Class: {stateType === 'W_State' ? 'W-Class (Pairwise Distributed)' : 'GHZ-Class (Genuine Genuine Tripartite)'}</div>
              <div className="text-amber-400">Particle Loss Status: {qubitALost ? 'Qubit A Discarded' : 'All 3 Qubits Intact'}</div>
            </div>

            <div className="p-4 bg-zinc-950 rounded-xl border border-pink-500/20 space-y-2 flex flex-col justify-center items-center text-center">
              <div className="text-[11px] text-pink-400 font-bold">2. REMAINING ENTANGLEMENT (B-C):</div>
              <div className="text-3xl font-black text-cyan-300">
                {residualConcurrency.toFixed(3)}
              </div>
              <div className="text-[10px] text-zinc-400">
                {stateType === 'W_State' && qubitALost ? 'MAXIMAL ROBUSTNESS (2/3 RETAINED)' : (qubitALost ? 'TOTAL DECOHERENCE (0% RETAINED)' : 'FULL TRIPARTITE ENTANGLED')}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Fundamental Quantum Distinction: While GHZ states are maximally fragile against loss (tracing out one qubit completely destroys all entanglement), W states retain 2/3 of their pairwise bipartite entanglement!</span>
          </div>
        </div>

        {/* State Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ENTANGLEMENT CLASS
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setStateType('W_State');
                setQubitALost(false);
                setResidualConcurrency(0.667);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                stateType === 'W_State' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">W-State (|W⟩)</div>
              <div className="text-[10px] text-zinc-400">Robust to photon/qubit loss</div>
            </button>

            <button
              onClick={() => {
                setStateType('GHZ_State');
                setQubitALost(false);
                setResidualConcurrency(1.000);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                stateType === 'GHZ_State' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">GHZ-State (|GHZ⟩)</div>
              <div className="text-[10px] text-zinc-400">Fragile to loss // Max multipartite</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">SLOCC CLASSIFICATION:</span>
            <div>• Under Stochastic Local Operations and Classical Communication (SLOCC), 3-qubit pure states partition into exactly two inequivalent classes of genuine tripartite entanglement: GHZ and W!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
