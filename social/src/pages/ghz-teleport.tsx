import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function GhzTeleport() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [stateType, setStateType] = useState<'ghz' | 'w'>('ghz');
  const [merminBellViolationM, setMerminBellViolationM] = useState(4.0); // Max quantum bound M = 4 vs classical M <= 2
  const [isEntangling, setIsEntangling] = useState(false);
  const [measurementCounts, setMeasurementCounts] = useState<{ [key: string]: number }>({
    '000': 512,
    '111': 512,
  });

  const prepareGhzState = () => {
    uiaudio.warp();
    setIsEntangling(true);

    setTimeout(() => {
      if (stateType === 'ghz') {
        setMeasurementCounts({ '000': 518, '111': 506 });
        setMerminBellViolationM(4.0);
      } else {
        setMeasurementCounts({ '001': 341, '010': 338, '100': 345 });
        setMerminBellViolationM(2.82);
      }
      setIsEntangling(false);
      uiaudio.success();
    }, 800);
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
                GHZ MULTIPARTITE // 3-QUBIT QUANTUM ENTANGLEMENT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                MERMIN-BELL VIOLATION M = 4.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Greenberger-Horne-Zeilinger distillation & non-local quantum state tomography for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={prepareGhzState}
            disabled={isEntangling}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEntangling ? 'PREPARING ENTANGLEMENT...' : 'GENERATE GHZ ENTANGLEMENT'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* State Tomography (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">1024-SHOT QUANTUM STATE TOMOGRAPHY</span>
            <span className="text-cyan-400">STATE: {stateType === 'ghz' ? '(|000⟩ + |111⟩)/√2' : '(|001⟩ + |010⟩ + |100⟩)/√3'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(measurementCounts).map(([basis, count]) => (
              <div key={basis} className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold">|{basis}⟩:</span>
                  <span className="text-cyan-400 font-bold">{count} SHOTS</span>
                </div>
                <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                  <div style={{ width: `${(count / 1024) * 100}%` }} className="h-full bg-cyan-400 transition-all duration-300" />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Mermin-Bell inequality parameter M = {merminBellViolationM} (Classical Local Realism limit M ≤ 2 violated at 100% confidence).</span>
          </div>
        </div>

        {/* State Selection (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ENTANGLEMENT CLASS
          </h3>

          <div className="flex gap-2">
            <button
              onClick={() => { setStateType('ghz'); }}
              className={cn("flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all", stateType === 'ghz' ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-zinc-900 border-white/5 text-zinc-400")}
            >
              GHZ STATE
            </button>
            <button
              onClick={() => { setStateType('w'); }}
              className={cn("flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all", stateType === 'w' ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-zinc-900 border-white/5 text-zinc-400")}
            >
              W STATE
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">GHZ VS W STATES:</span>
            <div>• GHZ states offer maximal multipartite entanglement but lose all entanglement if one qubit is lost.</div>
            <div>• W states retain bipartite entanglement even if any single qubit is measured or traced out.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
