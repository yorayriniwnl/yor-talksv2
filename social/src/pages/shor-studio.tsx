import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, Lock, Unlock, Zap, Play, RotateCcw, 
  Sparkles, Activity, Sliders, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ShorStudio() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [compositeN, setCompositeN] = useState<number>(15); // e.g. 15 = 3 * 5, 21 = 3 * 7, 35 = 5 * 7
  const [coprimeA, setCoprimeA] = useState<number>(7);
  const [foundPeriodR, setFoundPeriodR] = useState<number | null>(null);
  const [primeP, setPrimeP] = useState<number | null>(null);
  const [primeQ, setPrimeQ] = useState<number | null>(null);
  const [isFactoring, setIsFactoring] = useState(false);

  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  const runShorFactorization = () => {
    uiaudio.warp();
    setIsFactoring(true);
    setFoundPeriodR(null);
    setPrimeP(null);
    setPrimeQ(null);

    setTimeout(() => {
      // Find period r such that a^r = 1 (mod N)
      let r = 1;
      let val = coprimeA % compositeN;
      while (val !== 1 && r < 100) {
        val = (val * coprimeA) % compositeN;
        r++;
      }

      setFoundPeriodR(r);

      if (r % 2 === 0) {
        const factor1 = gcd(Math.pow(coprimeA, r / 2) - 1, compositeN);
        const factor2 = gcd(Math.pow(coprimeA, r / 2) + 1, compositeN);
        setPrimeP(factor1);
        setPrimeQ(factor2);
      }

      setIsFactoring(false);
      uiaudio.success();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Lock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                SHOR'S ALGORITHM // QUANTUM RSA FACTORIZATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                POLYNOMIAL TIME O((log N)³)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Quantum Phase Estimation & Inverse Fourier period finding for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runShorFactorization}
            disabled={isFactoring}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isFactoring ? 'RUNNING INVERSE QFT...' : 'FACTOR RSA SEMIPRIME'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Factorization Steps (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">QUANTUM FACTORIZATION PIPELINE</span>
            <span className="text-cyan-400">TARGET: N = {compositeN}</span>
          </div>

          <div className="space-y-3">
            {/* Step 1: Classical Coprime Selection */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-1">
              <div className="text-[11px] text-cyan-400 font-bold">1. COPRIME BASE SELECTION:</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Choose random integer a = {coprimeA} such that gcd(a, N) = 1.
              </p>
            </div>

            {/* Step 2: Quantum Period Finding via QFT */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-indigo-500/20 space-y-1">
              <div className="text-[11px] text-indigo-400 font-bold">2. QUANTUM PHASE ESTIMATION (QPE):</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Applies Hadamard transform and modular exponentiation registers, followed by Inverse QFT to extract period r.
              </p>
              {foundPeriodR && (
                <div className="text-emerald-400 font-bold pt-1">
                  • MEASURED PERIOD: r = {foundPeriodR} (Satisfies {coprimeA}^{foundPeriodR} ≡ 1 mod {compositeN})
                </div>
              )}
            </div>

            {/* Step 3: Prime Factor Extraction */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-pink-500/20 space-y-1">
              <div className="text-[11px] text-pink-400 font-bold">3. CLASSICAL FACTOR EXTRACTION:</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Calculate non-trivial GCD: gcd(a^(r/2) ± 1, N).
              </p>
              {primeP && primeQ && (
                <div className="text-cyan-300 font-bold pt-1">
                  • CRACKED PRIME FACTORS: p = {primeP}, q = {primeQ} (Verify: {primeP} × {primeQ} = {compositeN})
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input Parameters (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            RSA TARGET SELECTION
          </h3>

          <div className="space-y-2">
            {[
              { n: 15, a: 7, label: 'N = 15 (3 × 5)' },
              { n: 21, a: 2, label: 'N = 21 (3 × 7)' },
              { n: 35, a: 3, label: 'N = 35 (5 × 7)' },
            ].map((target) => (
              <button
                key={target.n}
                onClick={() => {
                  uiaudio.click();
                  setCompositeN(target.n);
                  setCoprimeA(target.a);
                }}
                className={cn(
                  "w-full text-left p-3.5 rounded-xl font-bold transition-all border flex items-center justify-between",
                  compositeN === target.n 
                    ? "bg-cyan-500 text-black border-cyan-400 shadow-md" 
                    : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/15"
                )}
              >
                <span>{target.label}</span>
                <span className="text-[10px] opacity-75">a = {target.a}</span>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">PETER SHOR 1994:</span>
            <div>• Breaks RSA public key cryptography in polynomial time on fault-tolerant quantum computers.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
