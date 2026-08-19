import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Flame
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function OtocScrambler() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [spinCountN, setSpinCountN] = useState(12); // N = 12 SYK Majorana spins
  const [temperatureT, setTemperatureT] = useState(1.0); // Temperature T in units of J
  const [lyapunovExponent, setLyapunovExponent] = useState(6.28); // lambda_L = 2*pi*T (MSS chaos bound saturation)
  const [isScrambling, setIsScrambling] = useState(false);
  const [otocDecay, setOtocDecay] = useState(0.04); // F(t) = <W(t)V(0)W(t)V(0)> -> 0 (Complete thermal scrambling)

  const runScramblingTest = () => {
    uiaudio.warp();
    setIsScrambling(true);

    setTimeout(() => {
      setIsScrambling(false);
      setLyapunovExponent(+(2 * Math.PI * temperatureT).toFixed(2));
      setOtocDecay(0.015);
      uiaudio.success();
    }, 750);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                QUANTUM SCRAMBLING // OTOC & HAYDEN-PRESKILL BLACK HOLE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                λ_L = 2π k_B T / ℏ (MALDACENA-SHENKER-STANFORD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Out-of-time-ordered correlators & information recovery from Hawking radiation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runScramblingTest}
            disabled={isScrambling}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isScrambling ? 'SCRAMBLING ALL-TO-ALL MAJORANA SPINS...' : 'SCRAMBLE QUANTUM INFORMATION'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* OTOC Analysis (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">OUT-OF-TIME-ORDERED CORRELATOR F(t) = ⟨W(t)V(0)W(t)V(0)⟩</span>
            <span className="text-cyan-400">CHAOS EXPONENT λ_L: {lyapunovExponent}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-950 rounded-xl border border-cyan-500/20 space-y-2">
              <div className="text-[11px] text-cyan-400 font-bold">1. INFORMATION DECORRELATION:</div>
              <div>• Majorana Spins: N = {spinCountN} all-to-all SYK interactions</div>
              <div>• Initial Commutator: [W(0), V(0)] = 0</div>
              <div>• Growth: ⟨[W(t), V(0)]²⟩ ~ (1/N) exp(λ_L t)</div>
              <div className="text-pink-400">Scrambling Time: t_* = (1/λ_L) ln(N)</div>
            </div>

            <div className="p-4 bg-zinc-950 rounded-xl border border-pink-500/20 space-y-2 flex flex-col justify-center items-center text-center">
              <div className="text-[11px] text-pink-400 font-bold">2. RESIDUAL OTOC VALUE F(t):</div>
              <div className="text-3xl font-black text-cyan-300">
                {otocDecay}
              </div>
              <div className="text-[10px] text-zinc-400">Saturates MSS Universal Chaos Bound</div>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Hayden-Preskill Protocol: When information is rapidly scrambled at the maximum quantum Lyapunov rate λ_L, a secret qubit thrown into an old black hole can be completely reconstructed from just a few photons of emitted Hawking radiation!</span>
          </div>
        </div>

        {/* Scrambler Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SYSTEM TEMPERATURE
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span>Temperature (T / J):</span>
                <span className="text-cyan-400 font-bold">{temperatureT}</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.0}
                step={0.1}
                value={temperatureT}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTemperatureT(val);
                  setLyapunovExponent(+(2 * Math.PI * val).toFixed(2));
                }}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">FAST SCRAMBLING CONJECTURE:</span>
            <div>• Black holes and SYK models are the fastest information scramblers in the universe, dispersing local quantum information across all degrees of freedom in logarithmic time O(ln N)!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
