import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, ShieldAlert, Zap, Play, RotateCcw, 
  Sparkles, Activity, Sliders, CheckCircle2, Lock
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type ErrorType = 'NONE' | 'BIT-FLIP (X)' | 'PHASE-FLIP (Z)' | 'BIT+PHASE (Y)';

export default function ErrorCorrection() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [injectedError, setInjectedError] = useState<ErrorType>('BIT-FLIP (X)');
  const [errorQubitIdx, setErrorQubitIdx] = useState<number>(4);
  const [syndromeDetected, setSyndromeDetected] = useState<string | null>(null);
  const [correctedFidelity, setCorrectedFidelity] = useState<number>(100);
  const [isCorrecting, setIsCorrecting] = useState(false);

  const runCorrectionCircuit = () => {
    uiaudio.warp();
    setIsCorrecting(true);
    setSyndromeDetected(null);

    setTimeout(() => {
      if (injectedError === 'BIT-FLIP (X)') {
        setSyndromeDetected(`Bit-flip detected on Qubit #${errorQubitIdx}. Applied X operator to restore state.`);
      } else if (injectedError === 'PHASE-FLIP (Z)') {
        setSyndromeDetected(`Phase-flip detected on Block #${Math.floor(errorQubitIdx / 3)}. Applied Z operator to restore state.`);
      } else if (injectedError === 'BIT+PHASE (Y)') {
        setSyndromeDetected(`Combined Y error detected on Qubit #${errorQubitIdx}. Applied Y operator to restore state.`);
      } else {
        setSyndromeDetected('No quantum syndrome error detected. State fully coherent.');
      }

      setCorrectedFidelity(100);
      setIsCorrecting(false);
      uiaudio.success();
    }, 1100);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <ShieldCheck className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                QUANTUM ERROR CORRECTION // 9-QUBIT SHOR CODE [[9,1,3]]
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                FAULT-TOLERANT QEC
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3-qubit bit-flip & 3-block phase-flip concatenation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runCorrectionCircuit}
            disabled={isCorrecting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCorrecting ? 'MEASURING SYNDROMES...' : 'MEASURE & REPAIR ERROR'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* 9-Qubit Visualizer (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">9-QUBIT CODEWORD REGISTER (3 BLOCKS × 3 QUBITS)</span>
            <span className="text-emerald-400">FIDELITY: {correctedFidelity}%</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((blockIdx) => (
              <div key={blockIdx} className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
                <div className="text-[11px] text-zinc-400 font-bold">BLOCK #{blockIdx + 1}:</div>
                <div className="space-y-1.5">
                  {[0, 1, 2].map((localIdx) => {
                    const globalIdx = blockIdx * 3 + localIdx;
                    const hasError = injectedError !== 'NONE' && globalIdx === errorQubitIdx;

                    return (
                      <div
                        key={localIdx}
                        className={cn(
                          "p-2.5 rounded-lg border flex items-center justify-between transition-all",
                          hasError ? "bg-red-950/40 border-red-500 text-red-300 animate-pulse" : "bg-zinc-900 border-white/5 text-zinc-300"
                        )}
                      >
                        <span>QUBIT #{globalIdx}</span>
                        <span className="font-bold">{hasError ? `ERROR: ${injectedError}` : '|0⟩'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {syndromeDetected && (
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syndromeDetected}</span>
            </div>
          )}
        </div>

        {/* Error Injection Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            INJECT QUANTUM NOISE
          </h3>

          <div className="space-y-2">
            {(['NONE', 'BIT-FLIP (X)', 'PHASE-FLIP (Z)', 'BIT+PHASE (Y)'] as ErrorType[]).map((err) => (
              <button
                key={err}
                onClick={() => { uiaudio.click(); setInjectedError(err); }}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl font-bold uppercase transition-all border",
                  injectedError === err 
                    ? "bg-emerald-500 text-black border-emerald-400 shadow-md" 
                    : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/15"
                )}
              >
                {err}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-zinc-400">
              <span>Target Qubit Index:</span>
              <span className="text-emerald-400 font-bold">#{errorQubitIdx}</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              value={errorQubitIdx}
              onChange={(e) => setErrorQubitIdx(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
