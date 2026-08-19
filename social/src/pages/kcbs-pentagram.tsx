import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Pentagram
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function KcbsPentagram() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [qutritStateAngleDeg, setQutritStateAngleDeg] = useState(0); // Qutrit test state |psi>
  const [kcbsQuantumSum, setKcbsQuantumSum] = useState(2.236); // Maximum quantum violation: sqrt(5) = 2.236068
  const [isMeasuring, setIsMeasuring] = useState(false);

  const classicalBound = 2.0; // Non-contextual classical limit: sum <= 2

  const runKcbsTest = () => {
    uiaudio.warp();
    setIsMeasuring(true);

    setTimeout(() => {
      setIsMeasuring(false);
      setKcbsQuantumSum(+(Math.sqrt(5)).toFixed(3));
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
                KCBS PENTAGRAM // QUANTUM CONTEXTUALITY IN A SINGLE QUTRIT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                KOCHEN-SPECKER d = 3 THEOREM
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              5-ray cyclic orthogonality pentagram & non-contextuality bound violation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runKcbsTest}
            disabled={isMeasuring}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isMeasuring ? 'SAMPLING 5 CYCLIC ORTHOGONAL PROJECTIONS...' : 'RUN KCBS CONTEXTUALITY TEST'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* KCBS Analysis (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">5-RAY PENTAGRAM CORRELATION SUM</span>
            <span className="text-cyan-400">QUANTUM MAX: $\sqrt{5} \approx 2.236$</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. NON-CONTEXTUAL HIDDEN VARIABLE BOUND:</div>
              <div>• Projector rays: v₁ ⊥ v₂ ⊥ v₃ ⊥ v₄ ⊥ v₅ ⊥ v₁</div>
              <div>• Classical Constraint: At most 2 rays can be simultaneously assigned value 1</div>
              <div className="text-pink-400">Classical Upper Bound: $\sum_{i=1}^5 \langle P_i \rangle \le 2.000$</div>
            </div>

            <div className="p-4 bg-zinc-950 rounded-xl border border-pink-500/20 space-y-2 flex flex-col justify-center items-center text-center">
              <div className="text-[11px] text-pink-400 font-bold">2. QUANTUM QUTRIT MEASUREMENT:</div>
              <div className="text-3xl font-black text-cyan-300">
                {kcbsQuantumSum}
              </div>
              <div className="text-[10px] text-zinc-400">Violates Classical Limit by +11.8%</div>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Kochen-Specker Theorem: Even for a single three-level quantum system (qutrit, d = 3) without entanglement, measurement outcomes cannot be pre-determined independently of the measurement context!</span>
          </div>
        </div>

        {/* Pentagram Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            QUTRIT ROTATION
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Qutrit Phase Angle:</span>
                <span className="text-cyan-400 font-bold">{qutritStateAngleDeg}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={qutritStateAngleDeg}
                onChange={(e) => setQutritStateAngleDeg(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">KCBS PENTAGRAM:</span>
            <div>• The KCBS inequality is the simplest state-specific test of contextuality in quantum mechanics, requiring only 5 projection measurements on a single 3-dimensional system!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
