import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Binary
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CrisprLogic() {
  const currentUser = useAppStore((state) => state.currentUser);

  const [inputA, setInputA] = useState(false);
  const [inputB, setInputB] = useState(false);
  const [gateType, setGateType] = useState<'NOR' | 'NAND' | 'AND' | 'XOR'>('NOR');
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Compute Boolean Gate Output
  let outputState = false;
  if (gateType === 'NOR') outputState = !(inputA || inputB);
  if (gateType === 'NAND') outputState = !(inputA && inputB);
  if (gateType === 'AND') outputState = inputA && inputB;
  if (gateType === 'XOR') outputState = (inputA && !inputB) || (!inputA && inputB);

  const evaluateCircuit = () => {
    uiaudio.warp();
    setIsEvaluating(true);

    setTimeout(() => {
      setIsEvaluating(false);
      uiaudio.success();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Binary className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                CRISPR GENE LOGIC // dCas9 NOR/NAND BIOLOGICAL COMPUTATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                CRISPRi TRANSCRIPTIONAL REPRESSION
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Orthogonal synthetic gRNA cascade & digital genetic Boolean evaluation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={evaluateCircuit}
            disabled={isEvaluating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEvaluating ? 'COMPUTING IN VIVO GENE REGULATION...' : 'EVALUATE GENETIC GATE'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Circuit Diagram & Molecular Architecture (8 Cols) */}
        <div className="lg:col-span-8 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <span className="font-bold text-white">GENETIC BOOLEAN LOGIC ARCHITECTURE</span>
            <span className="text-emerald-400">GATE: {gateType}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Input Chemical Inducers */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-emerald-500/20 space-y-3">
              <div className="text-[11px] text-emerald-400 font-bold">1. CHEMICAL INPUT INDUCERS:</div>
              <div className="flex items-center justify-between">
                <span>Input A (aTc / gRNA-1):</span>
                <button
                  onClick={() => setInputA(v => !v)}
                  className={cn("px-3 py-1 rounded-lg font-bold transition-all", inputA ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400")}
                >
                  {inputA ? 'HIGH (1)' : 'LOW (0)'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span>Input B (IPTG / gRNA-2):</span>
                <button
                  onClick={() => setInputB(v => !v)}
                  className={cn("px-3 py-1 rounded-lg font-bold transition-all", inputB ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400")}
                >
                  {inputB ? 'HIGH (1)' : 'LOW (0)'}
                </button>
              </div>
            </div>

            {/* Reporter Output */}
            <div className="p-4 bg-zinc-950 rounded-xl border border-teal-500/20 space-y-3 flex flex-col justify-center items-center text-center">
              <div className="text-[11px] text-teal-400 font-bold">2. GENETIC OUTPUT (GFP):</div>
              <div className={cn("text-2xl font-black transition-all", outputState ? "text-emerald-400" : "text-zinc-600")}>
                {outputState ? 'ACTIVE (1) // GFP FLUORESCING' : 'REPRESSED (0) // SILENCED'}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Universal Boolean Completeness: Because dCas9 can execute both NOR and NAND gates, any arbitrary digital logic function or state machine can be built inside living human cells!</span>
          </div>
        </div>

        {/* Gate Selection (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            LOGIC GATES
          </h3>

          <div className="space-y-2">
            {(['NOR', 'NAND', 'AND', 'XOR'] as const).map((gate) => (
              <button
                key={gate}
                onClick={() => setGateType(gate)}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  gateType === gate ? "bg-emerald-500/20 border-emerald-400 text-emerald-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">{gate} Logic Gate</div>
                <div className="text-[10px] text-zinc-400">dCas9-gRNA Transcriptional Cascade</div>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">SYNTHETIC COMPUTATION:</span>
            <div>• Catalytic-dead Cas9 (dCas9) physically sterically blocks RNA polymerases when targeted by specific gRNAs, creating highly modular, stackable gene-repression logic!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
