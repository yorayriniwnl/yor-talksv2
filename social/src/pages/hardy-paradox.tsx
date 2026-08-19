import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HardyParadox() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [hardyProbabilityPercent, setHardyProbabilityPercent] = useState(9.02); // Exact Hardy fraction: (3-sqrt(5))^5 / 32 ~ 0.09017
  const [totalShots, setTotalShots] = useState(1000);
  const [paradoxHits, setParadoxHits] = useState(90);
  const [isSimulating, setIsSimulating] = useState(false);

  const runHardyExperiment = () => {
    uiaudio.warp();
    setIsSimulating(true);

    setTimeout(() => {
      setIsSimulating(false);
      setParadoxHits(Math.round(totalShots * (hardyProbabilityPercent / 100)));
      uiaudio.success();
    }, 700);
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
                HARDY'S PARADOX // NON-LOCALITY WITHOUT INEQUALITIES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LUCIEN HARDY (1992)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Exact logical proof of quantum non-locality for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runHardyExperiment}
            disabled={isSimulating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSimulating ? 'COLLECTING 1000 ENTANGLED PHOTON DETECTIONS...' : 'RUN HARDY RUN TEST'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Hardy 4-Condition Analysis (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">HARDY 4-PROBABILITY CONSTRAINTS</span>
            <span className="text-cyan-400">THEORETICAL MAXIMUM: 9.017%</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. LOCAL REALISM CONSTRAINTS:</div>
              <div>• P(A₁ = 1, B₁ = 1) = 0.00% (Strict Null)</div>
              <div>• P(A₀ = 0, B₁ = 1) = 0.00% (Implication 1)</div>
              <div>• P(A₁ = 1, B₀ = 0) = 0.00% (Implication 2)</div>
              <div className="text-pink-400">Classical Local Realism Dictates: P(A₀=1, B₀=1) = 0!</div>
            </div>

            <div className="p-4 bg-zinc-950 rounded-xl border border-pink-500/20 space-y-2 flex flex-col justify-center items-center text-center">
              <div className="text-[11px] text-pink-400 font-bold">2. QUANTUM REALITY MEASURED:</div>
              <div className="text-3xl font-black text-cyan-300">
                {hardyProbabilityPercent}%
              </div>
              <div className="text-[10px] text-zinc-400">P(A₀=1, B₀=1) = {paradoxHits} / {totalShots} events</div>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Direct Contradiction: Local realism proves algebraically that whenever conditions 1, 2, and 3 hold, outcome (A₀=1, B₀=1) must occur with exactly 0% probability. Quantum mechanics yields 9.02%, completely falsifying local hidden variable theories!</span>
          </div>
        </div>

        {/* Hardy Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            DETECTION SAMPLING
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Total Coincidence Events:</span>
                <span className="text-cyan-400 font-bold">{totalShots}</span>
              </div>
              <input
                type="range"
                min={100}
                max={5000}
                step={100}
                value={totalShots}
                onChange={(e) => setTotalShots(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">HARDY'S THEOREM:</span>
            <div>• Unlike Bell's theorem which requires statistical averages across thousands of measurement angles, Hardy's paradox provides an all-or-nothing logical contradiction with quantum mechanics!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
