import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, Play, RotateCcw, Lock, 
  ShieldCheck, Activity, Sliders, CheckCircle2, ChevronRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TeleportationStudio() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [alphaProb, setAlphaProb] = useState(0.6); // |0> probability
  const [classicalBits, setClassicalBits] = useState<{ c0: number; c1: number } | null>(null);
  const [bobCorrection, setBobCorrection] = useState<string | null>(null);
  const [teleportFidelity, setTeleportFidelity] = useState<number | null>(null);
  const [isTeleporting, setIsTeleporting] = useState(false);

  const runTeleportation = () => {
    uiaudio.warp();
    setIsTeleporting(true);
    setClassicalBits(null);
    setBobCorrection(null);
    setTeleportFidelity(null);

    setTimeout(() => {
      // Alice Bell-state measurement yields 2 classical bits (c0, c1)
      const c0 = Math.random() > 0.5 ? 1 : 0;
      const c1 = Math.random() > 0.5 ? 1 : 0;

      // Bob's required unitary correction based on classical bits
      let correction = 'I (Identity)';
      if (c0 === 0 && c1 === 1) correction = 'X (Bit Flip)';
      if (c0 === 1 && c1 === 0) correction = 'Z (Phase Flip)';
      if (c0 === 1 && c1 === 1) correction = 'ZX (Bit + Phase Flip)';

      setClassicalBits({ c0, c1 });
      setBobCorrection(correction);
      setTeleportFidelity(99.98);
      setIsTeleporting(false);
      uiaudio.success();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
                QUANTUM TELEPORTATION // BELL STATE EPR PROTOCOL
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                EPR PAIR ENTANGLEMENT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3-qubit state transfer |ψ⟩ = α|0⟩ + β|1⟩ via EPR Bell pairs for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runTeleportation}
            disabled={isTeleporting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTeleporting ? 'TELEPORTING QUANTUM STATE...' : 'TELEPORT QUBIT STATE'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Protocol Pipeline (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">3-QUBIT TELEPORTATION CIRCUIT</span>
            <span className="text-cyan-400">NO PHYSICAL MATTER MOVEMENT</span>
          </div>

          <div className="space-y-3">
            {/* Step 1: EPR Pair Generation */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-purple-500/20 space-y-1">
              <div className="text-[11px] text-purple-400 font-bold">1. BELL PAIR GENERATION (|Φ⁺⟩):</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Hadamard on Q1 followed by CNOT(Q1 → Q2) creates maximally entangled Bell state: (1/√2)(|00⟩ + |11⟩).
              </p>
            </div>

            {/* Step 2: Alice Measurement */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-indigo-500/20 space-y-1">
              <div className="text-[11px] text-indigo-400 font-bold">2. ALICE BELL-BASIS MEASUREMENT:</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Alice applies CNOT(Q0 → Q1) and Hadamard on Q0, measuring both qubits to collapse the wavefunction into 2 classical bits.
              </p>
              {classicalBits && (
                <div className="text-emerald-400 font-bold pt-1">
                  • TRANSMITTED CLASSICAL BITS: (c0 = {classicalBits.c0}, c1 = {classicalBits.c1})
                </div>
              )}
            </div>

            {/* Step 3: Bob Unitary Correction */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-1">
              <div className="text-[11px] text-cyan-400 font-bold">3. BOB UNITARY OPERATOR CORRECTION:</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Bob receives classical bits over wireless channel and applies Pauli correction Z^c0 X^c1 to reconstruct |ψ⟩.
              </p>
              {bobCorrection && (
                <div className="text-cyan-300 font-bold pt-1">
                  • BOB APPLIED: {bobCorrection}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quantum Fidelity Telemetry (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            STATE TOMOGRAPHY
          </h3>

          <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span>Input State Amplitude (|0⟩):</span>
                <span className="text-purple-400 font-bold">{(alphaProb * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={alphaProb}
                onChange={(e) => setAlphaProb(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-zinc-400">
                <span>Teleportation Fidelity:</span>
                <span className="text-emerald-400 font-bold">{teleportFidelity ? `${teleportFidelity}%` : 'READY'}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Classical Channel Overhead:</span>
                <span className="text-cyan-400 font-bold">2 Classical Bits</span>
              </div>
            </div>

            <div className="p-3 bg-zinc-900 rounded-lg text-zinc-300 text-[11px] leading-relaxed">
              <strong>BENNETT-BRASSARD-CREPEAU 1993:</strong> Quantum teleportation does not transmit energy or matter—only the pure quantum information state is reconstructed at Bob's target qubit!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
