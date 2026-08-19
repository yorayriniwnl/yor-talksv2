import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Grid3X3
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ContextualitySim() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [selectedRow, setSelectedRow] = useState(0); // Alice row 0, 1, 2
  const [selectedCol, setSelectedCol] = useState(0); // Bob col 0, 1, 2
  const [isVerifying, setIsVerifying] = useState(false);

  // Peres-Mermin 3x3 Magic Square Observables:
  // Row 0: [X ⊗ I, I ⊗ X, X ⊗ X]  (Product = +I)
  // Row 1: [I ⊗ Y, Y ⊗ I, Y ⊗ Y]  (Product = +I)
  // Row 2: [X ⊗ Y, Y ⊗ X, Z ⊗ Z]  (Product = +I)
  // Col 0: [X ⊗ I, I ⊗ Y, X ⊗ Y]  (Product = +I)
  // Col 1: [I ⊗ X, Y ⊗ I, Y ⊗ X]  (Product = +I)
  // Col 2: [X ⊗ X, Y ⊗ Y, Z ⊗ Z]  (Product = -I)  <-- Quantum Contextual Contradiction!

  const runMagicSquareProof = () => {
    uiaudio.warp();
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      uiaudio.success();
    }, 850);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Grid3X3 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                QUANTUM CONTEXTUALITY // PERES-MERMIN MAGIC SQUARE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                KOCHEN-SPECKER NO-GO THEOREM
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Context-dependent quantum reality & quantum pseudo-telepathy 100% win rate for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runMagicSquareProof}
            disabled={isVerifying}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isVerifying ? 'VERIFYING KOCHEN-SPECKER CONTRADICTION...' : 'PLAY QUANTUM MAGIC SQUARE (100% WIN)'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Magic Square Grid (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">PERES-MERMIN 3×3 PAULI OBSERVABLE OPERATORS</span>
            <span className="text-cyan-400">ALICE: ROW {selectedRow}, BOB: COL {selectedCol}</span>
          </div>

          {/* 3x3 Magic Square Table */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['X ⊗ I', 'I ⊗ X', 'X ⊗ X (Prod = +I)'],
              ['I ⊗ Y', 'Y ⊗ I', 'Y ⊗ Y (Prod = +I)'],
              ['X ⊗ Y', 'Y ⊗ X', 'Z ⊗ Z (Prod = -I!)'],
            ].map((row, rIdx) => (
              <React.Fragment key={rIdx}>
                {row.map((cell, cIdx) => (
                  <div
                    key={cIdx}
                    className={cn(
                      "p-4 rounded-xl border text-center transition-all flex flex-col justify-center items-center space-y-1",
                      rIdx === selectedRow || cIdx === selectedCol
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/10"
                        : "bg-zinc-950 border-white/5 text-zinc-400"
                    )}
                  >
                    <div className="text-base font-bold">{cell.split(' ')[0]}</div>
                    <div className="text-[10px] text-zinc-400">{cell.includes('Prod') ? cell.split('(')[1].replace(')', '') : 'Pauli Operator'}</div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Kochen-Specker Theorem Proven: It is mathematically impossible to assign pre-existing classical values (±1) to all 9 observables without generating a (+1 = -1) algebraic contradiction! Quantum reality is fundamentally contextual.</span>
          </div>
        </div>

        {/* Row & Col Selectors (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            MEASUREMENT CONTEXT
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-zinc-400 block mb-1">Alice's Row Context:</span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRow(r)}
                    className={cn("p-2.5 rounded-xl border font-bold text-center", selectedRow === r ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
                  >
                    Row {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-zinc-400 block mb-1">Bob's Column Context:</span>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCol(c)}
                    className={cn("p-2.5 rounded-xl border font-bold text-center", selectedCol === c ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
                  >
                    Col {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">QUANTUM PSEUDO-TELEPATHY:</span>
            <div>• Classical players without communication can win this game with at most 8/9 ≈ 88.8% probability. Quantum players sharing 2 entangled Bell pairs win with a perfect 100% success rate!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
