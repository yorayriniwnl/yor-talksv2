import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function AqcStudio() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [annealTimeUs, setAnnealTimeUs] = useState(20); // 20 microseconds
  const [minEnergyGapGev, setMinEnergyGapGev] = useState(0.42); // Minimum gap Delta_min
  const [groundStateProb, setGroundStateProb] = useState(94.5); // % Landau-Zener ground state success
  const [isAnnealing, setIsAnnealing] = useState(false);
  const [annealProgressS, setAnnealProgressS] = useState(0);

  const runAdiabaticEvolution = () => {
    uiaudio.warp();
    setIsAnnealing(true);
    setAnnealProgressS(0);

    let s = 0;
    const interval = setInterval(() => {
      s += 0.05;
      setAnnealProgressS(+(s.toFixed(2)));

      if (s >= 1.0) {
        clearInterval(interval);
        // Landau-Zener formula: P_ground = 1 - exp(-pi * Delta_min^2 * T / (4 * hbar))
        const pSuccess = 1 - Math.exp(-Math.PI * Math.pow(minEnergyGapGev, 2) * (annealTimeUs / 4));
        setGroundStateProb(+(pSuccess * 100).toFixed(1));
        setIsAnnealing(false);
        uiaudio.success();
      }
    }, 60);
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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                ADIABATIC QUANTUM COMPUTING // AQC & LANDAU-ZENER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                FARHI ET AL. CONTINUOUS-TIME AQC
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              H(s) = (1-s)H₀ + sH_P Hamiltonian interpolation & minimum energy gap tracking for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runAdiabaticEvolution}
            disabled={isAnnealing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isAnnealing ? 'EVOLVING HAMILTONIAN (s ∈ [0,1])...' : 'RUN ADIABATIC EVOLUTION'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Energy Spectrum Diagram (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">INSTANTANEOUS HAMILTONIAN SPECTRUM (H(s))</span>
            <span className="text-cyan-400">ANNEAL SCHEDULE: s = {annealProgressS}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Initial Driver Hamiltonian */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">DRIVER HAMILTONIAN H₀ (s=0):</div>
              <div className="text-sm font-bold text-white">H₀ = -∑ σₓ⁽ⁱ⁾ (TRANSVERSE FIELD)</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Trivial uniform superposition ground state |+⟩^⊗n easily prepared at t=0.
              </p>
            </div>

            {/* Final Problem Hamiltonian */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-indigo-500/20 space-y-2">
              <div className="text-[11px] text-indigo-400 font-bold">PROBLEM HAMILTONIAN H_P (s=1):</div>
              <div className="text-sm font-bold text-indigo-300">H_P = ∑ Jᵢⱼ σ_z⁽ⁱ⁾ σ_z⁽ʲ⁾ (MAX-CUT)</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Ground state encodes the exact global optimal solution to the NP-hard optimization problem.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Minimum Spectral Gap Δ_min = {minEnergyGapGev} at s = 0.52. Landau-Zener ground state fidelity = {groundStateProb}%.</span>
          </div>
        </div>

        {/* Annealing Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ANNEALING SCHEDULE
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Anneal Time (T):</span>
              <span className="text-cyan-400 font-bold">{annealTimeUs} μs</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={annealTimeUs}
              onChange={(e) => setAnnealTimeUs(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Minimum Gap (Δ_min):</span>
              <span className="text-purple-400 font-bold">{minEnergyGapGev}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.05}
              value={minEnergyGapGev}
              onChange={(e) => setMinEnergyGapGev(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">ADIABATIC THEOREM:</span>
            <div>• If system evolves slowly enough (T &gt;&gt; ℏ / Δ_min^2), it remains in the instantaneous ground state with high probability.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
