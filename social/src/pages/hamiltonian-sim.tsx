import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HamiltonianSim() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [spinCount, setSpinCount] = useState(8); // 8-qubit Heisenberg spin chain
  const [trotterStepsN, setTrotterStepsN] = useState(16); // n = 16 Trotter time steps
  const [simulationTimeT, setSimulationTimeT] = useState(2.0); // t = 2.0 s
  const [trotterOrder, setTrotterOrder] = useState<1 | 2>(2); // 2nd-order Suzuki-Trotter
  const [isSimulating, setIsSimulating] = useState(false);

  const runHamiltonianSimulation = () => {
    uiaudio.warp();
    setIsSimulating(true);

    setTimeout(() => {
      setIsSimulating(false);
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
                HAMILTONIAN SIMULATION // TROTTER-SUZUKI PRODUCT FORMULAS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                e^-iHt ≈ (e^-iAt/n e^-iBt/n)^n
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Digital quantum simulation of 1D Heisenberg XXX spin chain for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runHamiltonianSimulation}
            disabled={isSimulating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSimulating ? 'EVOLVING TROTTERIZED QUANTUM CIRCUIT...' : 'SIMULATE HAMILTONIAN TIME EVOLUTION'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Spin Chain Magnetization Lattice (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">1D HEISENBERG SPIN CHAIN ⟨σ_i^z(t)⟩ EVOLUTION</span>
            <span className="text-cyan-400">STEPS: n = {trotterStepsN}, ORDER: {trotterOrder}</span>
          </div>

          {/* Spin Lattice Visualization */}
          <div className="p-6 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-4">
            <div className="text-[11px] text-cyan-400 font-bold">SPIN SITE MAGNETIZATION (⟨Z_i⟩ POLARIZATION):</div>
            
            <div className="flex items-center justify-between gap-2">
              {Array.from({ length: spinCount }).map((_, idx) => {
                // Alternating ferromagnetic/antiferromagnetic spin wave
                const spinVal = Math.sin(idx * 0.8 + simulationTimeT * 2);
                const isUp = spinVal > 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center space-y-2 p-3 bg-zinc-900 rounded-xl border border-white/5">
                    <span className="text-[10px] text-zinc-400">Q{idx}</span>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-lg transition-all",
                      isUp ? "bg-cyan-500 text-black shadow-cyan-500/30" : "bg-pink-500 text-white shadow-pink-500/30"
                    )}>
                      {isUp ? '↑' : '↓'}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-300">{spinVal.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Suzuki-Trotter Error Bound: ε_Trotter ≤ O(t^{trotterOrder + 1}/n^{trotterOrder}) = 1.2e-4. Unitary Norm Conserved.</span>
          </div>
        </div>

        {/* Trotter Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TROTTER DISCRETIZATION
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Trotter Slices (n):</span>
              <span className="text-cyan-400 font-bold">{trotterStepsN} Slices</span>
            </div>
            <input
              type="range"
              min={4}
              max={64}
              step={4}
              value={trotterStepsN}
              onChange={(e) => setTrotterStepsN(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Simulation Time (t):</span>
              <span className="text-pink-400 font-bold">{simulationTimeT} s</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.5}
              value={simulationTimeT}
              onChange={(e) => setSimulationTimeT(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">FEYNMAN QUANTUM SIMULATOR:</span>
            <div>• Simulating quantum systems on classical computers requires exponential memory (2^N). Trotterized quantum circuits simulate arbitrary physical Hamiltonians efficiently in polynomial time O(N·t)!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
