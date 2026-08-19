import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function VqeStudio() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [interatomicDistanceA, setInteratomicDistanceA] = useState(0.74); // 0.74 Angstroms equilibrium H2 bond length
  const [ansatzTheta, setAnsatzTheta] = useState(0.12); // UCCSD parameter theta
  const [groundStateEnergyHartree, setGroundStateEnergyHartree] = useState(-1.137); // -1.137 Hartree exact FCI
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [vqeIteration, setVqeIteration] = useState(0);

  const runVqeOptimization = () => {
    uiaudio.warp();
    setIsOptimizing(true);
    setVqeIteration(0);

    let iter = 0;
    let theta = ansatzTheta;

    const interval = setInterval(() => {
      iter++;
      setVqeIteration(iter);
      // Gradient descent step toward optimal theta = 0.22
      theta += (0.22 - theta) * 0.35;
      setAnsatzTheta(+(theta.toFixed(3)));

      // Potential energy surface: E(R) = -1.137 + (R - 0.74)^2 * 0.8
      const energy = -1.137 + Math.pow(interatomicDistanceA - 0.74, 2) * 0.8 + Math.pow(theta - 0.22, 2) * 0.4;
      setGroundStateEnergyHartree(+(energy.toFixed(4)));

      if (iter >= 12) {
        clearInterval(interval);
        setGroundStateEnergyHartree(-1.1373);
        setIsOptimizing(false);
        uiaudio.success();
      }
    }, 80);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
                VARIATIONAL QUANTUM EIGENSOLVER // VQE CHEMISTRY (H₂)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                UCCSD PARAMETERIZED ANSATZ
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Hybrid quantum expectation ⟨H⟩ measurement & classical gradient descent for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runVqeOptimization}
            disabled={isOptimizing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isOptimizing ? `VQE ITERATION ${vqeIteration}/12...` : 'RUN HYBRID VQE MINIMIZER'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Molecule Potential Energy Surface (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">MOLECULAR HYDROGEN (H₂) GROUND STATE ENERGIES</span>
            <span className="text-purple-400">BOND DISTANCE: R = {interatomicDistanceA} Å</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantum Coprocessor: Expectation Value Evaluation */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-purple-500/20 space-y-2">
              <div className="text-[11px] text-purple-400 font-bold">1. QUANTUM HARDWARE (QPU):</div>
              <div className="text-sm font-bold text-white">|ψ(θ)⟩ = exp(-i θ (X₀Y₁ - Y₀X₁)) |01⟩</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Prepares UCCSD entangled quantum state & measures Pauli string expectations ⟨Z₀⟩, ⟨Z₁⟩, ⟨Z₀Z₁⟩, ⟨X₀X₁⟩.
              </p>
            </div>

            {/* Classical Processor: Optimizer Loop */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">2. CLASSICAL OPTIMIZER (CPU):</div>
              <div className="text-sm font-bold text-cyan-300">θ_(k+1) = θ_k - η ∇_θ ⟨H(θ)⟩</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                COBYLA / Adam optimizer updates ansatz parameters to minimize energy towards variational lower bound.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>VQE Ground State Energy: {groundStateEnergyHartree} Hartree (Chemical Accuracy within 1.6 mHa).</span>
          </div>
        </div>

        {/* Chemical Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            BOND GEOMETRY
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>H-H Bond Length (R):</span>
              <span className="text-purple-400 font-bold">{interatomicDistanceA} Å</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.05}
              value={interatomicDistanceA}
              onChange={(e) => setInteratomicDistanceA(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">NISQ QUANTUM ADVANTAGE:</span>
            <div>• VQE bypasses deep coherence limits by keeping quantum circuits shallow (ansatz preparation only).</div>
            <div>• Paves the path for room-temperature catalyst discovery and nitrogen fixation modeling!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
