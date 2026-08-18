import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, Lock, Unlock, ShieldAlert, ShieldCheck, 
  Zap, Play, RotateCcw, Activity, Sliders, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface QubitBit {
  id: number;
  aliceBit: number; // 0 or 1
  aliceBasis: '+' | 'x';
  eveIntercepted: boolean;
  eveBasis?: '+' | 'x';
  bobBasis: '+' | 'x';
  bobBit: number;
  basesMatch: boolean;
  siftedValid: boolean;
}

export default function QkdStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [eveActive, setEveActive] = useState(false);
  const [qberPercentage, setQberPercentage] = useState(0);
  const [bits, setBits] = useState<QubitBit[]>([]);
  const [sharedKey, setSharedKey] = useState<string>('');

  const generateQkdExchange = () => {
    uiaudio.warp();
    const newBits: QubitBit[] = [];
    const count = 16;
    let errors = 0;
    let matchingBasesCount = 0;
    let keyBits: number[] = [];

    for (let i = 0; i < count; i++) {
      const aBit = Math.random() > 0.5 ? 1 : 0;
      const aBasis = Math.random() > 0.5 ? '+' : 'x';
      const bBasis = Math.random() > 0.5 ? '+' : 'x';

      let transmittedBit = aBit;
      let eveBasis: '+' | 'x' | undefined = undefined;

      if (eveActive) {
        eveBasis = Math.random() > 0.5 ? '+' : 'x';
        // If Eve measures in wrong basis, she alters the quantum state!
        if (eveBasis !== aBasis) {
          transmittedBit = Math.random() > 0.5 ? 1 : 0;
        }
      }

      let bBit = transmittedBit;
      if (bBasis !== aBasis && !eveActive) {
        bBit = Math.random() > 0.5 ? 1 : 0;
      }

      const basesMatch = aBasis === bBasis;
      const siftedValid = basesMatch && aBit === bBit;

      if (basesMatch) {
        matchingBasesCount++;
        if (aBit !== bBit) errors++;
        else keyBits.push(aBit);
      }

      newBits.push({
        id: i,
        aliceBit: aBit,
        aliceBasis: aBasis,
        eveIntercepted: eveActive,
        eveBasis,
        bobBasis: bBasis,
        bobBit: bBit,
        basesMatch,
        siftedValid,
      });
    }

    const calculatedQber = matchingBasesCount > 0 ? (errors / matchingBasesCount) * 100 : 0;
    setQberPercentage(+calculatedQber.toFixed(1));
    setBits(newBits);
    setSharedKey(keyBits.join(''));
  };

  useEffect(() => {
    generateQkdExchange();
  }, [eveActive]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Key className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                QKD STUDIO // QUANTUM KEY DISTRIBUTION BB84
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                NO-CLONING THEOREM
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Polarized single-photon quantum cryptography & eavesdropper detection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => {
              uiaudio.warp();
              setEveActive(!eveActive);
            }}
            className={cn(
              "px-5 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg",
              eveActive ? "bg-red-500 text-white shadow-red-500/30 animate-pulse" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            )}
          >
            <Eye className="w-4 h-4" />
            <span>EAVESDROPPER EVE: {eveActive ? 'INTERCEPTING (ACTIVE)' : 'DISABLED'}</span>
          </button>

          <button
            onClick={generateQkdExchange}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 font-bold text-white shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>TRANSMIT 16 PHOTONS</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Photon Grid (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">BB84 SINGLE-PHOTON PROTOCOL PIPELINE</span>
            <span className="text-zinc-400">SIFTED KEY BITS: {sharedKey.length}</span>
          </div>

          <div className="space-y-3">
            {/* Alice Row */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-1">
              <div className="text-[11px] text-cyan-400 font-bold">ALICE (EMITTER):</div>
              <div className="flex items-center space-x-2 overflow-x-auto py-1">
                {bits.map((b) => (
                  <div key={b.id} className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/10 flex flex-col items-center justify-center">
                    <span className="text-white font-bold">{b.aliceBit}</span>
                    <span className="text-[9px] text-cyan-400">{b.aliceBasis}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Eve Intercept Row (if active) */}
            {eveActive && (
              <div className="p-3 bg-zinc-950 rounded-xl border border-red-500/30 space-y-1 animate-pulse">
                <div className="text-[11px] text-red-400 font-bold">EVE (INTERCEPT & RESEND):</div>
                <div className="flex items-center space-x-2 overflow-x-auto py-1">
                  {bits.map((b) => (
                    <div key={b.id} className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-500/40 flex flex-col items-center justify-center">
                      <span className="text-red-300 font-bold">{b.eveBasis}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bob Row */}
            <div className="p-3 bg-zinc-950 rounded-xl border border-indigo-500/20 space-y-1">
              <div className="text-[11px] text-indigo-400 font-bold">BOB (RECEIVER MEASUREMENT):</div>
              <div className="flex items-center space-x-2 overflow-x-auto py-1">
                {bits.map((b) => (
                  <div key={b.id} className={cn(
                    "w-9 h-9 rounded-lg border flex flex-col items-center justify-center",
                    b.basesMatch ? "bg-indigo-950/60 border-indigo-400" : "bg-zinc-900 border-white/5 opacity-50"
                  )}>
                    <span className="text-white font-bold">{b.bobBit}</span>
                    <span className="text-[9px] text-indigo-300">{b.bobBasis}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security Telemetry (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SECURITY ANALYSIS
          </h3>

          <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-3">
            <div className="flex justify-between text-zinc-400">
              <span>Quantum Bit Error Rate (QBER):</span>
              <span className={cn("font-bold text-sm", qberPercentage > 11 ? "text-red-400" : "text-emerald-400")}>
                {qberPercentage}%
              </span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900 border border-white/5 text-[11px] text-zinc-300">
              {qberPercentage > 11 ? (
                <div className="text-red-400 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>QBER &gt; 11% threshold! Quantum state collapsed. Eavesdropper detected! Key discarded.</span>
                </div>
              ) : (
                <div className="text-emerald-400 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Channel secure! No-cloning verified. Shared secret key successfully established.</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-white/5 space-y-1">
              <span className="text-zinc-400 text-[10px]">ESTABLISHED AES KEY:</span>
              <div className="p-2.5 bg-zinc-900 rounded font-mono text-cyan-300 text-xs tracking-widest break-all">
                {sharedKey ? `0x${sharedKey}` : 'NO MATCHING BASES'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
