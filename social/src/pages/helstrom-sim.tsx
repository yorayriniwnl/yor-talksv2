import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HelstromSim() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [overlapAngleDeg, setOverlapAngleDeg] = useState(30); // 30 degrees angle between |psi_0> and |psi_1>
  const [priorP0, setPriorP0] = useState(0.5); // Equal priors p0 = p1 = 0.5
  const [isMeasuring, setIsMeasuring] = useState(false);

  // Compute Quantum State Overlap |<psi_0|psi_1>| = cos(theta)
  const thetaRad = (overlapAngleDeg * Math.PI) / 180;
  const overlap = Math.cos(thetaRad);

  // Helstrom Bound: P_opt = 1/2 + 1/2 * sqrt(1 - 4*p0*p1*|<psi_0|psi_1>|^2)
  const p1 = 1 - priorP0;
  const helstromLimit = 0.5 + 0.5 * Math.sqrt(Math.max(0, 1 - 4 * priorP0 * p1 * Math.pow(overlap, 2)));

  const runDiscrimination = () => {
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
            <Scale className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                QUANTUM STATE DISCRIMINATION // HELSTROM MAXIMUM BOUND
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                OPTIMAL POVM MEASUREMENT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Minimum-error discrimination of non-orthogonal quantum states for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runDiscrimination}
            disabled={isMeasuring}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isMeasuring ? 'PERFORMING OPTIMAL POVM MEASUREMENT...' : 'DISCRIMINATE QUANTUM STATES'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Helstrom Probability Analysis (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">HELSTROM THEOREM PERFORMANCE</span>
            <span className="text-cyan-400">SUCCESS RATE: {(helstromLimit * 100).toFixed(2)}%</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. NON-ORTHOGONAL STATES:</div>
              <div>• State |ψ₀⟩ = |0⟩ (p₀ = {priorP0})</div>
              <div>• State |ψ₁⟩ = cos(θ)|0⟩ + sin(θ)|1⟩ (θ = {overlapAngleDeg}°)</div>
              <div className="text-amber-400">Quantum Overlap: |⟨ψ₀|ψ₁⟩| = {overlap.toFixed(3)}</div>
            </div>

            <div className="p-4 bg-zinc-950 rounded-xl border border-pink-500/20 space-y-2 flex flex-col justify-center items-center text-center">
              <div className="text-[11px] text-pink-400 font-bold">2. HELSTROM MAXIMUM SUCCESS:</div>
              <div className="text-3xl font-black text-cyan-300">
                {(helstromLimit * 100).toFixed(2)}%
              </div>
              <div className="text-[10px] text-zinc-400">Optimal Positive Operator-Valued Measure</div>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Fundamental Quantum Limit: Non-orthogonal quantum states cannot be distinguished with 100% certainty. The Helstrom bound provides the exact upper mathematical limit on how well any physical POVM detector can distinguish them!</span>
          </div>
        </div>

        {/* State Overlap Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            STATE SEPARATION
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Angle θ:</span>
                <span className="text-cyan-400 font-bold">{overlapAngleDeg}°</span>
              </div>
              <input
                type="range"
                min={5}
                max={90}
                step={1}
                value={overlapAngleDeg}
                onChange={(e) => setOverlapAngleDeg(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Prior p₀:</span>
                <span className="text-pink-400 font-bold">{priorP0}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={priorP0}
                onChange={(e) => setPriorP0(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">HELSTROM THEOREM:</span>
            <div>• When θ = 90° (orthogonal states), Helstrom success is exactly 100%. When θ = 0° (identical states), success drops to 50% random guessing!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
