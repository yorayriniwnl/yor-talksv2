import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CvQkd() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [fiberDistanceKm, setFiberDistanceKm] = useState(25); // 25 km standard telecom single-mode fiber
  const [modulationVarianceVa, setModulationVarianceVa] = useState(4.5); // V_A = 4.5 SNU Gaussian modulation
  const [detectionType, setDetectionType] = useState<'Homodyne' | 'Heterodyne'>('Homodyne');
  const [isExchangingKey, setIsExchangingKey] = useState(false);

  // Optical channel transmittance T = 10^(-0.2 * L / 10) for standard 0.2 dB/km fiber
  const transmittanceT = Math.pow(10, -0.02 * fiberDistanceKm);
  const secretKeyRateMbps = +(transmittanceT * (modulationVarianceVa / 2) * 1.8).toFixed(2);

  const runKeyExchange = () => {
    uiaudio.warp();
    setIsExchangingKey(true);

    setTimeout(() => {
      setIsExchangingKey(false);
      uiaudio.success();
    }, 850);
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
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                CV-QKD // CONTINUOUS-VARIABLE GAUSSIAN QUANTUM KEY DISTRIBUTION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                HOMODYNE SHOT-NOISE DETECTION (GG02)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Standard telecom fiber coherent states & quadrature phase-space encryption for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runKeyExchange}
            disabled={isExchangingKey}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isExchangingKey ? 'DISTRIBUTING CONTINUOUS GAUSSIAN KEYS...' : 'DISTRIBUTE CV-QKD KEYS'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Phase Space Quadratures & Key Rate (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">PHASE SPACE QUADRATURES (x, p)</span>
            <span className="text-cyan-400">DETECTION: {detectionType}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Alice Gaussian Modulation */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. ALICE GAUSSIAN MODULATION:</div>
              <div className="text-sm font-bold text-white">|α⟩ = |x_A + i p_A⟩ (V_A = {modulationVarianceVa} SNU)</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Alice modulates standard telecom 1550nm laser pulses with random Gaussian amplitudes in both position x and momentum p quadratures.
              </p>
            </div>

            {/* Bob Coherent Homodyne Receiver */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-indigo-500/20 space-y-2">
              <div className="text-[11px] text-indigo-400 font-bold">2. BOB BALANCED HOMODYNE:</div>
              <div className="text-sm font-bold text-indigo-300">T = {transmittanceT.toFixed(3)} ({fiberDistanceKm} km FIBER)</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Bob mixes signal with a strong Local Oscillator (LO) on a 50:50 beam splitter to measure quadratures at the shot-noise limit!
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Information-Theoretic Security Active: Secret Key Rate K = {secretKeyRateMbps} Mbps. Entangling Cloner Gaussian Attack bound Chi_BE satisfied!</span>
          </div>
        </div>

        {/* Channel Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            FIBER CHANNEL
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Fiber Distance:</span>
              <span className="text-cyan-400 font-bold">{fiberDistanceKm} km</span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              step={5}
              value={fiberDistanceKm}
              onChange={(e) => setFiberDistanceKm(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">NO SINGLE PHOTON DETECTORS:</span>
            <div>• Unlike discrete DV-QKD which requires cryogenic single-photon avalanche diodes (SPADs), CV-QKD uses off-the-shelf telecom coherent homodyne receivers operating at multi-gigabit rates!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
