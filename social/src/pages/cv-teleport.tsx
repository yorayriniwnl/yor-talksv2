import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CvTeleport() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [squeezingParamR, setSqueezingParamR] = useState(1.4); // Squeezing r = 1.4 (~12 dB squeezing)
  const [teleportFidelity, setTeleportFidelity] = useState(88.5); // % Fidelity > 2/3 (classical limit)
  const [inputStateX, setInputStateX] = useState(2.4);
  const [inputStateP, setInputStateP] = useState(-1.1);
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [teleportCompleted, setTeleportCompleted] = useState(false);

  const runCvTeleportation = () => {
    uiaudio.warp();
    setIsTeleporting(true);
    setTeleportCompleted(false);

    setTimeout(() => {
      // Calculate Braunstein-Kimble CV Fidelity: F = 1 / (1 + exp(-2r))
      const fid = 1 / (1 + Math.exp(-2 * squeezingParamR));
      setTeleportFidelity(+(fid * 100).toFixed(1));
      setIsTeleporting(false);
      setTeleportCompleted(true);
      uiaudio.success();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                CV TELEPORTATION // SQUEEZED LIGHT EPR ENTANGLEMENT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                BRAUNSTEIN-KIMBLE PROTOCOL
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Continuous-variable homodyne quadrature measurement & electro-optic displacement for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runCvTeleportation}
            disabled={isTeleporting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTeleporting ? 'TRANSMITTING HOMODYNE QUADRATURES...' : 'TELEPORT QUANTUM STATE'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Optical Bench Diagram (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">CONTINUOUS-VARIABLE OPTICAL ARCHITECTURE</span>
            <span className="text-cyan-400">FIDELITY: {teleportFidelity}% (LIMIT &gt; 66.7%)</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Step 1: EPR Squeezed Vacuum Source */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-1.5">
              <div className="text-[11px] text-cyan-400 font-bold">1. TMSV ENTANGLEMENT</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Optical Parametric Oscillator (OPO) generates two-mode squeezed vacuum light (r = {squeezingParamR}).
              </p>
            </div>

            {/* Step 2: Homodyne Bell Detection */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-indigo-500/20 space-y-1.5">
              <div className="text-[11px] text-indigo-400 font-bold">2. HOMODYNE BELL MEASURE</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                50:50 Beam Splitter mixes input state with EPR Mode A; dual balanced photodetectors measure x_u and p_v.
              </p>
            </div>

            {/* Step 3: Electro-Optic Feedforward */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-purple-500/20 space-y-1.5">
              <div className="text-[11px] text-purple-400 font-bold">3. PHASE-SPACE DISPLACEMENT</div>
              <p className="text-zinc-400 text-[11px] font-sans">
                Electro-optic modulators displace Mode B in phase space to reconstruct the input quantum state.
              </p>
            </div>
          </div>

          {teleportCompleted && (
            <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Quantum state (x={inputStateX}, p={inputStateP}) teleported with {teleportFidelity}% unconditional quantum fidelity!</span>
            </div>
          )}
        </div>

        {/* Squeezing Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            OPTICAL SQUEEZING
          </h3>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Squeezing Parameter (r):</span>
              <span className="text-cyan-400 font-bold">r = {squeezingParamR}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={squeezingParamR}
              onChange={(e) => setSqueezingParamR(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">BRAUNSTEIN-KIMBLE 1998:</span>
            <div>• Classical teleportation bound is F = 50% (coherent) or 66.7% (thermal). Quantum entanglement surpasses this limit infinitely as r → ∞.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
