import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Lock
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function GroverStudio() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [databaseSize, setDatabaseSize] = useState<number>(16); // N = 16 (4 qubits)
  const [targetItem, setTargetItem] = useState<number>(11);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [amplitudes, setAmplitudes] = useState<number[]>(new Array(16).fill(1 / Math.sqrt(16)));
  const [isSearching, setIsSearching] = useState(false);

  const runGroverSearch = () => {
    uiaudio.warp();
    setIsSearching(true);
    setCurrentStep(1);

    // Initial equal superposition: 1 / sqrt(N)
    const initialAmp = new Array(databaseSize).fill(1 / Math.sqrt(databaseSize));
    setAmplitudes(initialAmp);

    setTimeout(() => {
      // Step 1: Phase Oracle (Inverts amplitude of target item)
      const afterOracle = initialAmp.map((amp, idx) => idx === targetItem ? -amp : amp);
      setAmplitudes(afterOracle);
      setCurrentStep(2);
      uiaudio.click();

      setTimeout(() => {
        // Step 2: Grover Diffusion Operator (Inversion about the average)
        const avg = afterOracle.reduce((sum, a) => sum + a, 0) / databaseSize;
        const afterDiffusion = afterOracle.map(amp => 2 * avg - amp);
        setAmplitudes(afterDiffusion);
        setCurrentStep(3);
        setIsSearching(false);
        uiaudio.success();
      }, 1000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Search className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                GROVER'S ALGORITHM // QUANTUM AMPLITUDE AMPLIFICATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                QUADRATIC SPEEDUP O(√N)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Unstructured database search & phase oracle inversion about average for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runGroverSearch}
            disabled={isSearching}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSearching ? 'AMPLIFYING STATE PROBABILITY...' : 'RUN GROVER SEARCH'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* State Vector Histograms (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">QUANTUM STATE PROBABILITY AMPLITUDES (|ψ⟩)</span>
            <span className="text-cyan-400">TARGET: ITEM #{targetItem}</span>
          </div>

          {/* Bar Histogram */}
          <div className="h-64 flex items-end justify-between gap-1 p-4 bg-zinc-950 rounded-xl border border-cyan-500/20">
            {amplitudes.map((amp, idx) => {
              const prob = Math.min(100, Math.pow(Math.abs(amp), 2) * 100);
              const isTarget = idx === targetItem;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    style={{ height: `${Math.max(4, prob)}%` }}
                    className={cn(
                      "w-full rounded-t-sm transition-all duration-500 shadow-md",
                      isTarget ? "bg-emerald-400 shadow-emerald-500/50" : "bg-cyan-600/40"
                    )}
                  />
                  <span className={cn("text-[9px]", isTarget ? "text-emerald-300 font-bold" : "text-zinc-500")}>
                    {idx}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>PIPELINE: {currentStep === 0 ? 'READY' : (currentStep === 1 ? '1. SUPERPOSITION' : (currentStep === 2 ? '2. ORACLE INVERSION' : '3. DIFFUSION AMPLIFICATION COMPLETE'))}</span>
            <span className="text-emerald-400 font-bold">TARGET PROBABILITY: {(Math.pow(amplitudes[targetItem], 2) * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Target Item Selector (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SELECT SEARCH TARGET
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Target Index (0 - 15):</span>
              <span className="text-cyan-400 font-bold">#{targetItem}</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              value={targetItem}
              onChange={(e) => setTargetItem(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">LOV GROVER 1996:</span>
            <div>• Classical search requires O(N) queries; Grover searches in only O(√N) iterations.</div>
            <div>• Diffusion operator inverts amplitudes around the mean to constructively amplify the marked state.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
