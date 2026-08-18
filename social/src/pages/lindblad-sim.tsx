import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function LindbladSim() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [t1RelaxationUs, setT1RelaxationUs] = useState(50); // 50 us
  const [t2DephasingUs, setT2DephasingUs] = useState(30); // 30 us
  const [simulatedTimeUs, setSimulatedTimeUs] = useState(0);
  const [rho00, setRho00] = useState(0.5); // Population in |0>
  const [rho11, setRho11] = useState(0.5); // Population in |1>
  const [rho01Coherence, setRho01Coherence] = useState(0.5); // Off-diagonal coherence
  const [isDecohering, setIsDecohering] = useState(false);

  // Evolve Lindblad Master Equation
  const evolveDecoherence = () => {
    uiaudio.warp();
    setIsDecohering(true);

    let t = 0;
    const interval = setInterval(() => {
      t += 2;
      setSimulatedTimeUs(t);

      // Population decay: rho11(t) = rho11(0) * exp(-t/T1)
      const new11 = 0.5 * Math.exp(-t / t1RelaxationUs);
      const new00 = 1 - new11;
      // Coherence decay: rho01(t) = rho01(0) * exp(-t/T2)
      const new01 = 0.5 * Math.exp(-t / t2DephasingUs);

      setRho00(new00);
      setRho11(new11);
      setRho01Coherence(new01);

      if (t >= 100) {
        clearInterval(interval);
        setIsDecohering(false);
        uiaudio.success();
      }
    }, 80);
  };

  const handleReset = () => {
    uiaudio.click();
    setSimulatedTimeUs(0);
    setRho00(0.5);
    setRho11(0.5);
    setRho01Coherence(0.5);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Waves className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                LINDBLAD // MASTER EQUATION QUANTUM DECOHERENCE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                OPEN QUANTUM SYSTEMS (GKSL)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              T1 energy relaxation & T2 pure dephasing density matrix evolution for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={evolveDecoherence}
            disabled={isDecohering}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDecohering ? 'EVOLVING MASTER EQUATION...' : 'EVOLVE LINDBLAD EQUATION'}</span>
          </button>

          {simulatedTimeUs > 0 && (
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
        {/* Density Matrix Elements Visualizer (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">DENSITY MATRIX ELEMENTS (ρ(t))</span>
            <span className="text-cyan-400">t = {simulatedTimeUs} μs</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* ρ00 Population */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold">|0⟩⟨0| GROUND STATE (ρ₀₀):</span>
                <span className="text-emerald-400 font-bold">{(rho00 * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                <div style={{ width: `${rho00 * 100}%` }} className="h-full bg-emerald-400 transition-all duration-300" />
              </div>
            </div>

            {/* ρ11 Population */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold">|1⟩⟨1| EXCITED STATE (ρ₁₁):</span>
                <span className="text-rose-400 font-bold">{(rho11 * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                <div style={{ width: `${rho11 * 100}%` }} className="h-full bg-rose-400 transition-all duration-300" />
              </div>
            </div>

            {/* ρ01 Off-Diagonal Quantum Coherence */}
            <div className="col-span-2 p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="flex justify-between">
                <span className="text-cyan-400 font-bold">|0⟩⟨1| QUANTUM COHERENCE (|ρ₀₁|):</span>
                <span className="text-cyan-300 font-bold">{(rho01Coherence * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-4 bg-zinc-900 rounded-full overflow-hidden">
                <div style={{ width: `${rho01Coherence * 100 * 2}%` }} className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Coherence Time Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ENVIRONMENT NOISE
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Energy Relaxation (T1):</span>
              <span className="text-emerald-400 font-bold">{t1RelaxationUs} μs</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={t1RelaxationUs}
              onChange={(e) => setT1RelaxationUs(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Pure Dephasing (T2):</span>
              <span className="text-cyan-400 font-bold">{t2DephasingUs} μs</span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              value={t2DephasingUs}
              onChange={(e) => setT2DephasingUs(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
