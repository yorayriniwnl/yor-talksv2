import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, Play, RotateCcw, Activity, 
  Sliders, ShieldCheck, CheckCircle2, Award, Cpu
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function BosonSampling() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [photonCountN, setPhotonCountN] = useState<number>(12); // 12 photons
  const [interferometerModesM, setInterferometerModesM] = useState<number>(40); // 40 optical modes
  const [classicalPermanentSeconds, setClassicalPermanentSeconds] = useState('4.2e6'); // Millions of seconds on supercomputer
  const [isSampling, setIsSampling] = useState(false);
  const [detectedCoincidences, setDetectedCoincidences] = useState<number>(0);

  const runPhotonicSampling = () => {
    uiaudio.warp();
    setIsSampling(true);
    setDetectedCoincidences(0);

    let count = 0;
    const interval = setInterval(() => {
      count += 50000;
      setDetectedCoincidences(count);

      if (count >= 500000) {
        clearInterval(interval);
        setIsSampling(false);
        uiaudio.success();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                BOSON SAMPLING // PHOTONIC QUANTUM SUPREMACY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                AARONSON-ARKHIPOV 2011 (#P-HARD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Unitary matrix permanent computation & multi-photon Hong-Ou-Mandel interference for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runPhotonicSampling}
            disabled={isSampling}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSampling ? 'SAMPLING PHOTON DETECTIONS (SNSPDs)...' : 'SAMPLE PHOTONIC NETWORK'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Photonic Architecture (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">INTERFEROMETER NETWORK MATRIX (U ∈ U({interferometerModesM}))</span>
            <span className="text-cyan-400">{photonCountN} INDISTINGUISHABLE PHOTONS</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/30 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">JIUZHANG PHOTONIC PROCESSOR:</div>
              <div className="text-2xl font-black text-white">200 MICROSECONDS</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Naturally samples output configuration distribution governed by matrix permanents via Hong-Ou-Mandel interference.
              </p>
            </div>

            <div className="p-4 bg-zinc-950 rounded-xl border border-purple-500/30 space-y-2">
              <div className="text-[11px] text-purple-400 font-bold">CLASSICAL SUPERCOMPUTER (RYSER ALGORITHM):</div>
              <div className="text-2xl font-black text-purple-400">4,200,000 SECONDS</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Computing matrix permanent of a submatrix has O(n · 2^n) exponential complexity (#P-hard).
              </p>
            </div>
          </div>

          {detectedCoincidences > 0 && (
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Registered {detectedCoincidences.toLocaleString()} multi-photon coincidence events across superconducting nanowire single-photon detectors (SNSPDs)!</span>
            </div>
          )}
        </div>

        {/* Photonic Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            OPTICAL PARAMETERS
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Photon Number (n):</span>
              <span className="text-cyan-400 font-bold">{photonCountN} Photons</span>
            </div>
            <input
              type="range"
              min={6}
              max={24}
              value={photonCountN}
              onChange={(e) => setPhotonCountN(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">SCOTT AARONSON 2011:</span>
            <div>• Unlike determinants which are solvable in polynomial time O(n^3), matrix permanents are strictly #P-hard.</div>
            <div>• Photons naturally solve this problem through quantum bosonic exchange statistics.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
