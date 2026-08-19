import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RandomizedBenchmarking() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [cliffordLengthM, setCliffordLengthM] = useState(64); // Clifford sequence length m
  const [decayParameterP, setDecayParameterP] = useState(0.9992); // p = 0.9992
  const [errorPerCliffordR, setErrorPerCliffordR] = useState('4.0e-4'); // r = 4 x 10^-4 (99.96% 1Q fidelity)
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const runRandomizedBenchmarking = () => {
    uiaudio.warp();
    setIsBenchmarking(true);

    setTimeout(() => {
      // 1Q Error per Clifford: r = (1 - p) / 2
      const r = ((1 - decayParameterP) / 2);
      setErrorPerCliffordR(r.toExponential(2));
      setIsBenchmarking(false);
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
                RANDOMIZED BENCHMARKING // CLIFFORD GROUP GATE ERROR (QCVV)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                F(m) = A·p^m + B
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              SPAM-independent gate error characterization & Clifford group decay for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runRandomizedBenchmarking}
            disabled={isBenchmarking}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBenchmarking ? 'GENERATING RANDOM CLIFFORD SEQUENCES...' : 'RUN BENCHMARKING (RB)'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Clifford Sequence Protocol (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">CLIFFORD RB PROTOCOL (24 SINGLE-QUBIT CLIFFORDS)</span>
            <span className="text-cyan-400">LENGTH: m = {cliffordLengthM}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Random Sequence Assembly */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. RANDOM SEQUENCE:</div>
              <div className="text-sm font-bold text-white">|ψ_m⟩ = (C_inv) · C_m ··· C₂ · C₁ |0⟩</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Applies sequence of m random Clifford gates sampled uniformly from the Clifford group C_1.
              </p>
            </div>

            {/* Inversion Gate */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-indigo-500/20 space-y-2">
              <div className="text-[11px] text-indigo-400 font-bold">2. DETERMINISTIC INVERSION:</div>
              <div className="text-sm font-bold text-indigo-300">C_inv = (∏ C_k)† (RETURNS TO |0⟩)</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Computes unique inverse Clifford gate to return state deterministically to |0⟩.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Decay Rate p = {decayParameterP}. Average Error Per Clifford Gate r_Clifford = {errorPerCliffordR} (Single-Qubit Gate Fidelity: 99.96%).</span>
          </div>
        </div>

        {/* Benchmark Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SEQUENCE CONTROLS
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Sequence Length (m):</span>
              <span className="text-cyan-400 font-bold">{cliffordLengthM} Gates</span>
            </div>
            <input
              type="range"
              min={10}
              max={256}
              step={10}
              value={cliffordLengthM}
              onChange={(e) => setCliffordLengthM(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">SPAM INSENSITIVITY:</span>
            <div>• Standard RB is completely immune to State Preparation and Measurement (SPAM) errors because SPAM only affects the A and B fit constants, not the decay base p!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
