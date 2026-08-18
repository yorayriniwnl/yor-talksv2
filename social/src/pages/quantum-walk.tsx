import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitFork, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, TrendingUp
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function QuantumWalk() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [walkSteps, setWalkSteps] = useState<number>(20);
  const [probabilities, setProbabilities] = useState<number[]>([]);
  const [isWalking, setIsWalking] = useState(false);

  // Compute 1D Quantum Walk via Hadamard Coin
  const computeQuantumWalk = (steps: number) => {
    const size = steps * 2 + 1;
    let state = Array.from({ length: size }, () => ({ left: 0, right: 0 }));
    // Initial state at center |0⟩ ⊗ (|L⟩ + i|R⟩)/√2
    const center = steps;
    state[center] = { left: 1 / Math.sqrt(2), right: 1 / Math.sqrt(2) };

    for (let t = 0; t < steps; t++) {
      const nextState = Array.from({ length: size }, () => ({ left: 0, right: 0 }));
      // Hadamard Coin Operation followed by Shift
      for (let x = 1; x < size - 1; x++) {
        // H coin: |L⟩ -> (|L⟩ + |R⟩)/√2, |R⟩ -> (|L⟩ - |R⟩)/√2
        const l = state[x].left;
        const r = state[x].right;
        const newL = (l + r) / Math.sqrt(2);
        const newR = (l - r) / Math.sqrt(2);

        // Shift operator
        nextState[x - 1].left += newL;
        nextState[x + 1].right += newR;
      }
      state = nextState;
    }

    const probs = state.map(pos => pos.left * pos.left + pos.right * pos.right);
    setProbabilities(probs);
  };

  useEffect(() => {
    computeQuantumWalk(walkSteps);
  }, [walkSteps]);

  const runStepWalk = () => {
    uiaudio.warp();
    setIsWalking(true);
    let cur = 1;
    const interval = setInterval(() => {
      if (cur <= walkSteps) {
        computeQuantumWalk(cur);
        cur++;
      } else {
        clearInterval(interval);
        setIsWalking(false);
        uiaudio.success();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <TrendingUp className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                QUANTUM RANDOM WALK // BALLISTIC PROPAGATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                QUADRATIC SPREADING σ ∝ t
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Hadamard coin operator & quantum wave interference peaks for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runStepWalk}
            disabled={isWalking}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isWalking ? 'PROPAGATING WAVEFRONT...' : 'ANIMATE QUANTUM WALK'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Probability Density Wavefront (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">SPATIAL PROBABILITY DENSITY (|ψ(x)|²)</span>
            <span className="text-cyan-400">STEPS: {walkSteps}</span>
          </div>

          {/* Bar Histogram */}
          <div className="h-64 flex items-end justify-between gap-1 p-4 bg-zinc-950 rounded-xl border border-cyan-500/20">
            {probabilities.map((prob, idx) => {
              const heightPct = Math.min(100, prob * 500);
              const xPos = idx - walkSteps;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    style={{ height: `${Math.max(2, heightPct)}%` }}
                    className="w-full rounded-t-sm bg-gradient-to-t from-cyan-600 to-pink-400 transition-all duration-300 shadow-md shadow-cyan-500/30"
                  />
                  {idx % 4 === 0 && (
                    <span className="text-[8px] text-zinc-500">{xPos}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>SPREADING: BALLISTIC LINEAR (σ = {walkSteps})</span>
            <span className="text-pink-400 font-bold">VS CLASSICAL DIFFUSION (σ = {Math.sqrt(walkSteps).toFixed(1)})</span>
          </div>
        </div>

        {/* Steps Slider (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            WALK CONTROLS
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Time Steps (t):</span>
              <span className="text-cyan-400 font-bold">{walkSteps} Steps</span>
            </div>
            <input
              type="range"
              min={5}
              max={35}
              value={walkSteps}
              onChange={(e) => setWalkSteps(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">QUANTUM ADVANTAGE:</span>
            <div>• Classical random walks spread like √t with peak in center.</div>
            <div>• Quantum walks spread linearly with t, concentrating probability at the wavefront edges due to constructive interference!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
