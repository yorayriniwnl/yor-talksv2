import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function QuantumOracle() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [algorithmType, setAlgorithmType] = useState<'DeutschJozsa' | 'BernsteinVazirani' | 'Simons'>('DeutschJozsa');
  const [oracleType, setOracleType] = useState<'Constant' | 'Balanced'>('Balanced');
  const [secretString, setSecretString] = useState('1011');
  const [isQuerying, setIsQuerying] = useState(false);

  const runQuantumOracleQuery = () => {
    uiaudio.warp();
    setIsQuerying(true);

    setTimeout(() => {
      setIsQuerying(false);
      uiaudio.success();
    }, 850);
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
                QUANTUM ORACLE // PHASE KICKBACK & DEUTSCH-JOZSA
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                U_f |x⟩|-⟩ = (-1)^f(x) |x⟩|-⟩
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              O(1) single-query exponential quantum advantage & phase kickback for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runQuantumOracleQuery}
            disabled={isQuerying}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isQuerying ? 'EVALUATING QUANTUM ORACLE (1 QUERY)...' : 'QUERY QUANTUM ORACLE (O(1))'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Circuit Execution & Phase Kickback (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">QUANTUM ORACLE CIRCUIT ARCHITECTURE</span>
            <span className="text-cyan-400">ALGORITHM: {algorithmType}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Phase Kickback Mechanism */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. PHASE KICKBACK TRICK:</div>
              <div className="text-sm font-bold text-white">|x⟩ ⊗ |−⟩ → (−1)^{`{f(x)}`} |x⟩ ⊗ |−⟩</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Target ancilla qubit initialized in |−⟩ = (|0⟩ − |1⟩)/√2 kicks the function value into the relative phase of the input register!
              </p>
            </div>

            {/* Interference Measurement */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-indigo-500/20 space-y-2">
              <div className="text-[11px] text-indigo-400 font-bold">2. HADAMARD INTERFERENCE:</div>
              <div className="text-sm font-bold text-indigo-300">H^{`{⊗n}`} → |{oracleType === 'Constant' ? '0000' : secretString}⟩ (100% PROBABILITY)</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Constructive interference isolates the global property in a single computational query.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Deterministic Result: Oracle is {oracleType}. Classical requires 2^{`{n-1}`}+1 = 9 evaluations; Quantum solves in 1 query!</span>
          </div>
        </div>

        {/* Oracle Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ORACLE ORACLES
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => setAlgorithmType('DeutschJozsa')}
              className={cn("w-full p-3 rounded-xl border text-left transition-all", algorithmType === 'DeutschJozsa' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
            >
              <div className="font-bold">Deutsch-Jozsa Algorithm</div>
              <div className="text-[10px] text-zinc-400">Constant vs Balanced Function (1 Query)</div>
            </button>

            <button
              onClick={() => setAlgorithmType('BernsteinVazirani')}
              className={cn("w-full p-3 rounded-xl border text-left transition-all", algorithmType === 'BernsteinVazirani' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
            >
              <div className="font-bold">Bernstein-Vazirani</div>
              <div className="text-[10px] text-zinc-400">Finds Hidden String s·x in 1 Query</div>
            </button>

            <button
              onClick={() => setAlgorithmType('Simons')}
              className={cn("w-full p-3 rounded-xl border text-left transition-all", algorithmType === 'Simons' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
            >
              <div className="font-bold">Simon's Period Finding</div>
              <div className="text-[10px] text-zinc-400">Exponential Speedup over Classical</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">QUANTUM PARALLELISM:</span>
            <div>• By evaluating all 2^N inputs simultaneously in superposition and leveraging phase kickback, quantum computers extract global function invariants instantly!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
